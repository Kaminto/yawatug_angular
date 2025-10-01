import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StripePaymentRequest {
  amount: number;
  currency: 'USD';
  transaction_type: 'deposit';
  description?: string;
  payment_method_id?: string;
  use_saved_card?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const requestData: StripePaymentRequest = await req.json();

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check if user has existing Stripe customer
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;
    }

    // Create internal transaction record
    const { data: internalTransaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: requestData.amount,
        currency: requestData.currency,
        transaction_type: requestData.transaction_type,
        status: 'pending',
        payment_gateway: 'stripe',
        reference: `CARD-${Date.now()}-${user.id.slice(0, 8)}`
      })
      .select()
      .single();

    if (transactionError) {
      throw transactionError;
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: requestData.amount * 100, // Stripe uses cents
      currency: requestData.currency.toLowerCase(),
      customer: customerId,
      metadata: {
        user_id: user.id,
        internal_transaction_id: internalTransaction.id,
        transaction_reference: internalTransaction.reference
      },
      description: requestData.description || `Deposit to ${requestData.currency} wallet`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create gateway transaction record
    const { error: gatewayError } = await supabaseClient
      .from('payment_gateway_transactions')
      .insert({
        internal_transaction_id: internalTransaction.id,
        gateway_transaction_id: paymentIntent.id,
        gateway_reference: paymentIntent.id,
        gateway_name: 'stripe',
        payment_method: 'stripe_card',
        amount: requestData.amount,
        currency: requestData.currency,
        status: 'pending',
        gateway_response: {
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          status: paymentIntent.status
        },
        user_id: user.id
      });

    if (gatewayError) {
      console.error('Gateway transaction creation error:', gatewayError);
    }

    // Update internal transaction with gateway reference
    await supabaseClient
      .from('transactions')
      .update({
        gateway_reference: paymentIntent.id,
        gateway_transaction_id: paymentIntent.id
      })
      .eq('id', internalTransaction.id);

    console.log('Stripe payment intent created:', {
      userId: user.id,
      amount: requestData.amount,
      currency: requestData.currency,
      paymentIntentId: paymentIntent.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: internalTransaction.id,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: 'pending',
        message: 'Payment intent created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stripe payment creation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || 'Payment creation failed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});