import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-relworx-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RelWorxWebhookPayload {
  success: boolean;
  status: string;
  message: string;
  customer_reference: string;
  internal_reference: string;
  msisdn: string;
  amount: number;
  currency: string;
  provider: string;
  charge?: number;
  request_status: string;
  remote_ip?: string;
  provider_transaction_id?: string;
  completed_at?: string;
}

// Verify webhook signature using HMAC-SHA256
async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(payload);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // RelWorx might send signature with or without 'sha256=' prefix
    const cleanSignature = signature.replace('sha256=', '');
    
    return cleanSignature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook body
    const bodyText = await req.text();
    const webhookData: RelWorxWebhookPayload = JSON.parse(bodyText);
    
    console.log('🪝 RelWorx webhook received:', {
      internal_reference: webhookData.internal_reference,
      customer_reference: webhookData.customer_reference,
      status: webhookData.status,
      success: webhookData.success,
      amount: webhookData.amount,
      currency: webhookData.currency
    });

    // Verify webhook signature
    const signature = req.headers.get('x-relworx-signature');
    const webhookSecret = Deno.env.get('RELWORX_WEBHOOK_SECRET');
    
    if (!signature || !webhookSecret) {
      console.error('❌ Missing webhook signature or secret');
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isValidSignature = await verifyWebhookSignature(bodyText, signature, webhookSecret);
    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Webhook signature verified');

    // Find transaction by internal_reference (gateway_reference) or customer_reference (reference)
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .select('*')
      .or(`gateway_reference.eq.${webhookData.internal_reference},reference.eq.${webhookData.customer_reference}`)
      .maybeSingle();

    if (transactionError) {
      console.error('Transaction lookup error:', transactionError);
      return new Response(
        JSON.stringify({ error: 'Transaction lookup failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!transaction) {
      console.error('❌ Transaction not found:', {
        internal_reference: webhookData.internal_reference,
        customer_reference: webhookData.customer_reference
      });
      return new Response(
        JSON.stringify({ 
          error: 'Transaction not found',
          details: 'No matching transaction found for the provided references'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Transaction found:', transaction.id);

    // Map RelWorx status to internal status
    let newStatus = 'pending';
    let approvalStatus = 'pending';
    
    if (webhookData.success && webhookData.request_status === 'success') {
      newStatus = 'completed';
      approvalStatus = 'approved';
    } else if (!webhookData.success || webhookData.request_status === 'failed') {
      newStatus = 'failed';
      approvalStatus = 'rejected';
    } else if (webhookData.request_status === 'pending') {
      newStatus = 'pending';
      approvalStatus = 'pending';
    }

    // Update transaction with webhook data
    const { error: updateError } = await supabaseClient
      .from('transactions')
      .update({
        status: newStatus,
        approval_status: approvalStatus,
        gateway_response: webhookData,
        approved_at: newStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Transaction update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: Wallet balance is automatically updated by database trigger
    // when transaction status changes to 'completed' and approval_status is 'approved'
    if (newStatus === 'completed') {
      console.log('✅ Payment successful - wallet balance will be updated by trigger:', {
        transactionId: transaction.id,
        walletId: transaction.wallet_id,
        amount: transaction.amount,
        currency: transaction.currency,
        type: transaction.transaction_type
      });
    } else if (newStatus === 'failed' && transaction.transaction_type === 'withdraw') {
      // For failed withdrawals, the trigger will not add the amount back
      // Need to create a refund transaction
      const { data: wallet, error: walletError } = await supabaseClient
        .from('wallets')
        .select('*')
        .eq('id', transaction.wallet_id)
        .single();

      if (!walletError && wallet) {
        // Create a refund transaction instead of directly updating balance
        // The trigger will automatically update the wallet balance
        const { error: refundError } = await supabaseClient
          .from('transactions')
          .insert({
            wallet_id: wallet.id,
            user_id: transaction.user_id,
            amount: Math.abs(transaction.amount), // Positive for credit
            currency: transaction.currency,
            transaction_type: 'refund',
            status: 'completed',
            approval_status: 'approved',
            description: `Refund for failed withdrawal (Transaction ID: ${transaction.id})`,
            reference: `REFUND_${transaction.id}`
          });

        if (refundError) {
          console.error('❌ Failed to create refund transaction:', refundError);
        } else {
          console.log('✅ Refund transaction created - wallet balance will be updated by trigger:', {
            walletId: wallet.id,
            refundAmount: Math.abs(transaction.amount),
            originalTransactionId: transaction.id
          });
        }
      }
    }

    // Log webhook event for audit
    const { error: logError } = await supabaseClient
      .from('payment_webhooks')
      .insert({
        gateway: 'relworx',
        transaction_id: transaction.id,
        webhook_data: webhookData,
        status: 'processed',
        processed_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Webhook logging error:', logError);
      // Don't fail the webhook processing if logging fails
    }

    console.log('✅ Webhook processed successfully:', {
      transactionId: transaction.id,
      internal_reference: webhookData.internal_reference,
      status: newStatus,
      success: webhookData.success
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        transaction_id: transaction.id,
        status: newStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Webhook processing failed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});