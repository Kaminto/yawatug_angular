import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  gateway: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id?: string;
  phone_number?: string;
  merchant_code?: string;
  callback_url?: string;
}

interface PaymentResponse {
  success: boolean;
  payment_id?: string;
  checkout_url?: string;
  message: string;
  transaction_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Authentication required");
    }

    const paymentRequest: PaymentRequest = await req.json();
    console.log("Processing payment request:", paymentRequest);

    // Get gateway configuration
    const { data: gatewayConfig, error: configError } = await supabaseClient
      .from('payment_gateway_configs')
      .select('*')
      .eq('gateway_name', paymentRequest.gateway)
      .eq('is_active', true)
      .single();

    if (configError || !gatewayConfig) {
      throw new Error(`Payment gateway ${paymentRequest.gateway} not configured or inactive`);
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('unified_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'deposit',
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        approval_status: 'pending',
        payment_method: paymentRequest.payment_method,
        admin_notes: JSON.stringify({
          gateway: paymentRequest.gateway,
          transaction_id: paymentRequest.transaction_id,
          phone_number: paymentRequest.phone_number,
          merchant_code: paymentRequest.merchant_code,
          timestamp: new Date().toISOString()
        }),
        reference: `PAY-${Date.now()}-${user.id.slice(0, 8)}`
      })
      .select()
      .single();

    if (transactionError) {
      throw new Error("Failed to create transaction record");
    }

    let paymentResponse: PaymentResponse;

    // Process payment based on gateway
    switch (paymentRequest.gateway.toLowerCase()) {
      case 'paytota':
        paymentResponse = await processPayTotaPayment(paymentRequest, gatewayConfig, transaction.id);
        break;
      case 'clickpesa':
        paymentResponse = await processClickPesaPayment(paymentRequest, gatewayConfig, transaction.id);
        break;
      case 'selcom':
        paymentResponse = await processSelcomPayment(paymentRequest, gatewayConfig, transaction.id);
        break;
      case 'stripe':
        paymentResponse = await processStripePayment(paymentRequest, gatewayConfig, transaction.id);
        break;
      default:
        throw new Error(`Unsupported payment gateway: ${paymentRequest.gateway}`);
    }

    // Update transaction with payment response
    if (paymentResponse.success && paymentResponse.payment_id) {
      await supabaseClient
        .from('unified_transactions')
        .update({
          admin_notes: JSON.stringify({
            ...JSON.parse(transaction.admin_notes || '{}'),
            payment_id: paymentResponse.payment_id,
            checkout_url: paymentResponse.checkout_url
          }),
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);
    }

    return new Response(JSON.stringify({
      ...paymentResponse,
      transaction_id: transaction.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: paymentResponse.success ? 200 : 400,
    });

  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: (error as any)?.message || "Payment processing failed" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function processPayTotaPayment(
  request: PaymentRequest, 
  config: any, 
  transactionId: string
): Promise<PaymentResponse> {
  try {
    const payTotaPayload = {
      amount: request.amount,
      currency: request.currency,
      phone_number: request.phone_number,
      merchant_reference: transactionId,
      callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook/paytota`,
      description: `Yawatu deposit - ${transactionId}`
    };

    const response = await fetch(`${config.api_endpoint}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.config_data.api_key}`,
        'X-Merchant-ID': config.config_data.merchant_id
      },
      body: JSON.stringify(payTotaPayload)
    });

    const result = await response.json();
    
    if (response.ok && result.status === 'success') {
      return {
        success: true,
        payment_id: result.payment_id,
        message: "Payment initiated successfully",
        transaction_id: transactionId
      };
    } else {
      throw new Error(result.message || "PayTota payment failed");
    }
  } catch (error) {
    console.error("PayTota payment error:", error);
    return {
      success: false,
      message: (error as any)?.message || "PayTota payment processing failed"
    };
  }
}

async function processClickPesaPayment(
  request: PaymentRequest, 
  config: any, 
  transactionId: string
): Promise<PaymentResponse> {
  try {
    const clickPesaPayload = {
      amount: request.amount,
      currency: request.currency,
      msisdn: request.phone_number,
      reference: transactionId,
      callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook/clickpesa`
    };

    const response = await fetch(`${config.api_endpoint}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.config_data.api_key}`,
        'X-Merchant-Code': config.config_data.merchant_code
      },
      body: JSON.stringify(clickPesaPayload)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      return {
        success: true,
        payment_id: result.transaction_id,
        message: "Payment initiated successfully",
        transaction_id: transactionId
      };
    } else {
      throw new Error(result.message || "ClickPesa payment failed");
    }
  } catch (error) {
    console.error("ClickPesa payment error:", error);
    return {
      success: false,
      message: (error as any)?.message || "ClickPesa payment processing failed"
    };
  }
}

async function processSelcomPayment(
  request: PaymentRequest, 
  config: any, 
  transactionId: string
): Promise<PaymentResponse> {
  try {
    const selcomPayload = {
      amount: request.amount,
      currency: request.currency,
      msisdn: request.phone_number,
      order_id: transactionId,
      webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook/selcom`
    };

    const response = await fetch(`${config.api_endpoint}/v1/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.config_data.api_key}`,
        'X-Vendor-ID': config.config_data.vendor_id
      },
      body: JSON.stringify(selcomPayload)
    });

    const result = await response.json();
    
    if (response.ok && result.result === 'SUCCESS') {
      return {
        success: true,
        payment_id: result.transid,
        checkout_url: result.checkout_url,
        message: "Payment initiated successfully",
        transaction_id: transactionId
      };
    } else {
      throw new Error(result.message || "Selcom payment failed");
    }
  } catch (error) {
    console.error("Selcom payment error:", error);
    return {
      success: false,
      message: (error as any)?.message || "Selcom payment processing failed"
    };
  }
}

async function processStripePayment(
  request: PaymentRequest, 
  config: any, 
  transactionId: string
): Promise<PaymentResponse> {
  try {
    // Import Stripe dynamically
    const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
    const stripe = new Stripe(config.config_data.secret_key, {
      apiVersion: "2023-10-16",
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      metadata: {
        transaction_id: transactionId,
        user_id: request.transaction_id
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      payment_id: paymentIntent.id,
      checkout_url: paymentIntent.client_secret,
      message: "Payment intent created successfully",
      transaction_id: transactionId
    };
  } catch (error) {
    console.error("Stripe payment error:", error);
    return {
      success: false,
      message: (error as any)?.message || "Stripe payment processing failed"
    };
  }
}