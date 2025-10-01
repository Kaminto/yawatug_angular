import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const gateway = url.pathname.split('/').pop(); // Extract gateway from path
    const payload = await req.json();
    
    console.log(`Processing ${gateway} webhook:`, payload);

    let transactionId: string;
    let status: 'completed' | 'failed';
    let paymentId: string;
    let webhookStatus: string;

    // Process webhook based on gateway
    switch (gateway?.toLowerCase()) {
      case 'paytota':
        ({ transactionId, status: webhookStatus, paymentId } = await processPayTotaWebhook(payload, req));
        status = webhookStatus as "completed" | "failed";
        break;
      case 'clickpesa':
        ({ transactionId, status: webhookStatus, paymentId } = await processClickPesaWebhook(payload, req));
        status = webhookStatus as "completed" | "failed";
        break;
      case 'selcom':
        ({ transactionId, status: webhookStatus, paymentId } = await processSelcomWebhook(payload, req));
        status = webhookStatus as "completed" | "failed";
        break;
      case 'stripe':
        ({ transactionId, status: webhookStatus, paymentId } = await processStripeWebhook(payload, req));
        status = webhookStatus as "completed" | "failed";
        break;
      default:
        throw new Error(`Unsupported gateway: ${gateway}`);
    }

    // Update transaction status
    const { data: transaction, error: fetchError } = await supabaseClient
      .from('unified_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Update transaction status
    const { error: updateError } = await supabaseClient
      .from('unified_transactions')
      .update({
        status,
        approval_status: status === 'completed' ? 'approved' : 'rejected',
        processed_at: new Date().toISOString(),
        admin_notes: JSON.stringify({
          ...JSON.parse(transaction.admin_notes || '{}'),
          webhook_received: new Date().toISOString(),
          payment_id: paymentId,
          gateway_status: status
        })
      })
      .eq('id', transactionId);

    if (updateError) {
      throw new Error("Failed to update transaction status");
    }

    // If payment is successful, update user wallet
    if (status === 'completed') {
      const { data: wallet, error: walletError } = await supabaseClient
        .from('wallets')
        .select('*')
        .eq('user_id', transaction.user_id)
        .eq('currency', transaction.currency)
        .single();

      if (!walletError && wallet) {
        await supabaseClient
          .from('wallets')
          .update({
            balance: wallet.balance + transaction.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', wallet.id);
      }

      // Allocate transaction fees if applicable
      if (transaction.fee_amount > 0) {
        await supabaseClient.rpc('allocate_transaction_fee_enhanced', {
          p_transaction_id: transaction.id,
          p_user_id: transaction.user_id,
          p_transaction_type: transaction.transaction_type,
          p_base_amount: transaction.amount,
          p_fee_amount: transaction.fee_amount,
          p_currency: transaction.currency
        });
      }
    }

    console.log(`Transaction ${transactionId} updated to ${status}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Webhook processed successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: (error as Error).message || "Webhook processing failed" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function processPayTotaWebhook(payload: any, req: Request) {
  // Verify PayTota webhook signature
  const signature = req.headers.get('X-PayTota-Signature');
  // TODO: Implement signature verification
  
  const transactionId = payload.merchant_reference;
  const status = payload.status === 'COMPLETED' ? 'completed' : 'failed';
  const paymentId = payload.payment_id;

  return { transactionId, status, paymentId };
}

async function processClickPesaWebhook(payload: any, req: Request) {
  // Verify ClickPesa webhook signature
  const signature = req.headers.get('X-ClickPesa-Signature');
  // TODO: Implement signature verification
  
  const transactionId = payload.reference;
  const status = payload.status === 'SUCCESS' ? 'completed' : 'failed';
  const paymentId = payload.transaction_id;

  return { transactionId, status, paymentId };
}

async function processSelcomWebhook(payload: any, req: Request) {
  // Verify Selcom webhook signature
  const signature = req.headers.get('X-Selcom-Signature');
  // TODO: Implement signature verification
  
  const transactionId = payload.order_id;
  const status = payload.result === 'SUCCESS' ? 'completed' : 'failed';
  const paymentId = payload.transid;

  return { transactionId, status, paymentId };
}

async function processStripeWebhook(payload: any, req: Request) {
  // Import Stripe for webhook verification
  const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (signature && webhookSecret) {
    try {
      const body = await req.text();
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const transactionId = paymentIntent.metadata.transaction_id;
        const status = 'completed';
        const paymentId = paymentIntent.id;

        return { transactionId, status, paymentId };
      } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const transactionId = paymentIntent.metadata.transaction_id;
        const status = 'failed';
        const paymentId = paymentIntent.id;

        return { transactionId, status, paymentId };
      }
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err);
      throw new Error('Invalid webhook signature');
    }
  }

  throw new Error('Stripe webhook processing failed');
}