import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;

    // Skip webhook verification if secret is not configured (development mode)
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', (err as Error).message);
        return new Response(
          JSON.stringify({ error: 'Webhook signature verification failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } else {
      // Development mode: parse JSON directly (UNSAFE for production)
      console.log('⚠️ Running in development mode - webhook signature verification disabled');
      try {
        event = JSON.parse(body);
      } catch (err) {
        console.error('Failed to parse webhook body:', (err as Error).message);
        return new Response(
          JSON.stringify({ error: 'Invalid webhook body' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    console.log('Stripe webhook received:', event.type);

    // Handle payment intent events
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Find the gateway transaction
      const { data: gatewayTransaction, error: gatewayError } = await supabaseClient
        .from('payment_gateway_transactions')
        .select('*, internal_transaction_id')
        .eq('gateway_transaction_id', paymentIntent.id)
        .single();

      if (gatewayError || !gatewayTransaction) {
        console.error('Gateway transaction not found:', paymentIntent.id);
        return new Response(
          JSON.stringify({ error: 'Transaction not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      // Update gateway transaction
      await supabaseClient
        .from('payment_gateway_transactions')
        .update({
          status: 'completed',
          webhook_data: paymentIntent,
          updated_at: new Date().toISOString()
        })
        .eq('id', gatewayTransaction.id);

      // Update internal transaction
      await supabaseClient
        .from('transactions')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', gatewayTransaction.internal_transaction_id);

      // Get internal transaction details
      const { data: internalTransaction } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', gatewayTransaction.internal_transaction_id)
        .single();

      if (internalTransaction) {
        // Note: Wallet balance is automatically updated by database trigger
        // when transaction status changes to 'completed' and approval_status is 'approved'
        console.log('✅ Stripe payment successful - wallet balance will be updated by trigger:', {
          transactionId: internalTransaction.id,
          userId: internalTransaction.user_id,
          amount: internalTransaction.amount,
          currency: internalTransaction.currency,
          type: internalTransaction.transaction_type
        });
      }

    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Update gateway transaction
      await supabaseClient
        .from('payment_gateway_transactions')
        .update({
          status: 'failed',
          webhook_data: paymentIntent,
          updated_at: new Date().toISOString()
        })
        .eq('gateway_transaction_id', paymentIntent.id);

      // Update internal transaction
      const { data: gatewayTransaction } = await supabaseClient
        .from('payment_gateway_transactions')
        .select('internal_transaction_id')
        .eq('gateway_transaction_id', paymentIntent.id)
        .single();

      if (gatewayTransaction) {
        await supabaseClient
          .from('transactions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', gatewayTransaction.internal_transaction_id);
      }

      console.log('Payment failed:', paymentIntent.id);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Webhook processing failed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});