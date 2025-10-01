import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RelWorxWebhookPayload {
  success: boolean;
  message: string;
  internal_reference: string;
  reference: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  amount?: number;
  currency?: string;
  msisdn?: string;
  network?: string;
  timestamp?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookData: RelWorxWebhookPayload = await req.json();
    
    console.log('RelWorx webhook received:', webhookData);

    // Verify webhook signature for security
    const signature = req.headers.get('x-relworx-signature');
    const webhookSecret = Deno.env.get('RELWORX_WEBHOOK_SECRET');
    
    if (!signature || !webhookSecret) {
      console.error('❌ Webhook signature verification failed - missing signature or secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized webhook request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Implement HMAC signature verification
    const crypto = await import('https://deno.land/std@0.190.0/crypto/mod.ts');
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const bodyText = JSON.stringify(webhookData);
    const msgData = encoder.encode(bodyText);
    
    const cryptoKey = await crypto.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const hashBuffer = await crypto.crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (signature !== expectedSignature && signature !== `sha256=${expectedSignature}`) {
      console.error('❌ Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    console.log('✅ Webhook signature verified successfully');

    // Find the gateway transaction by internal_reference with fallback search
    let gatewayTransaction = null;
    
    const { data: primaryTransaction, error: primaryError } = await supabaseClient
      .from('payment_gateway_transactions')
      .select('*, internal_transaction_id')
      .eq('gateway_transaction_id', webhookData.internal_reference)
      .maybeSingle();

    if (!primaryError && primaryTransaction) {
      gatewayTransaction = primaryTransaction;
    } else {
      console.log('Primary lookup failed, trying fallback with reference:', webhookData.reference);
      
      const { data: fallbackTransaction, error: fallbackError } = await supabaseClient
        .from('payment_gateway_transactions')
        .select('*, internal_transaction_id')
        .eq('gateway_reference', webhookData.reference)
        .maybeSingle();
      
      if (!fallbackError && fallbackTransaction) {
        gatewayTransaction = fallbackTransaction;
      }
    }
    
    if (!gatewayTransaction) {
      console.error('❌ Transaction not found for:', {
        internal_reference: webhookData.internal_reference,
        reference: webhookData.reference
      });
      return new Response(
        JSON.stringify({ 
          error: 'Transaction not found',
          details: 'No matching transaction found for the provided references'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }
    
    console.log('✅ Transaction found:', gatewayTransaction.id);

    // Map RelWorx webhook status to internal status
    let webhookStatus = 'pending';
    if (webhookData.success) {
      webhookStatus = 'completed';
    } else {
      webhookStatus = 'failed';
    }

    // Update gateway transaction status
    const { error: updateGatewayError } = await supabaseClient
      .from('payment_gateway_transactions')
      .update({
        status: webhookStatus,
        webhook_data: webhookData,
        updated_at: new Date().toISOString()
      })
      .eq('id', gatewayTransaction.id);

    if (updateGatewayError) {
      console.error('Failed to update gateway transaction:', updateGatewayError);
    }

    // Get the internal transaction
    const { data: internalTransaction, error: internalError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('id', gatewayTransaction.internal_transaction_id)
      .single();

    if (internalError || !internalTransaction) {
      console.error('Internal transaction not found:', gatewayTransaction.internal_transaction_id);
      return new Response(
        JSON.stringify({ error: 'Internal transaction not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Use the mapped status from above
    let newStatus = webhookStatus;

    // Update internal transaction status
    const { error: updateInternalError } = await supabaseClient
      .from('transactions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', internalTransaction.id);

    if (updateInternalError) {
      console.error('Failed to update internal transaction:', updateInternalError);
    }

    // Note: Wallet balance is automatically updated by database trigger
    // when transaction status changes to 'completed' and approval_status is 'approved'
    if (webhookData.success && newStatus === 'completed') {
      console.log('✅ Payment successful - wallet balance will be updated by trigger:', {
        transactionId: internalTransaction.id,
        userId: internalTransaction.user_id,
        amount: internalTransaction.amount,
        currency: internalTransaction.currency,
        type: internalTransaction.transaction_type
      });
    } else if (!webhookData.success && newStatus === 'failed') {
      // Rollback for failed transactions
      if (internalTransaction.transaction_type === 'withdraw') {
        // Refund the withdrawn amount back to wallet
        const { data: wallet, error: walletError } = await supabaseClient
          .from('wallets')
          .select('*')
          .eq('user_id', internalTransaction.user_id)
          .eq('currency', internalTransaction.currency)
          .maybeSingle();

        if (wallet && !walletError) {
          // Create a refund transaction instead of directly updating balance
          // The trigger will automatically update the wallet balance
          const { error: refundError } = await supabaseClient
            .from('transactions')
            .insert({
              wallet_id: wallet.id,
              user_id: internalTransaction.user_id,
              amount: Math.abs(internalTransaction.amount), // Positive for credit
              currency: internalTransaction.currency,
              transaction_type: 'refund',
              status: 'completed',
              approval_status: 'approved',
              description: `Refund for failed withdrawal (Transaction ID: ${internalTransaction.id})`,
              reference: `REFUND_${internalTransaction.id}`
            });

          if (refundError) {
            console.error('❌ Failed to create refund transaction:', refundError);
          } else {
            console.log('✅ Refund transaction created - wallet balance will be updated by trigger:', {
              userId: internalTransaction.user_id,
              walletId: wallet.id,
              refundAmount: Math.abs(internalTransaction.amount),
              originalTransactionId: internalTransaction.id
            });
          }
        }
      }
    }

    console.log('Webhook processed successfully:', {
      internalReference: webhookData.internal_reference,
      reference: webhookData.reference,
      success: webhookData.success,
      status: newStatus,
      message: webhookData.message
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as any)?.message || 'Webhook processing failed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});