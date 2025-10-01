import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface PaymentRequest {
  amount: number;
  currency: string;
  msisdn: string;
  description?: string;
  reference: string;
}

// Validate E.164 phone number format
function isValidE164(msisdn: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(msisdn);
}

// Validate currency code
function isValidCurrency(currency: string): boolean {
  return ['UGX', 'KES', 'TZS'].includes(currency.toUpperCase());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create anon client for user authentication (RLS enforced)
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Create admin client for config reading only
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user with anon client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid Authorization header' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let paymentRequest: PaymentRequest;
    try {
      paymentRequest = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation
    if (!paymentRequest.reference || typeof paymentRequest.reference !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid reference' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentRequest.msisdn || !isValidE164(paymentRequest.msisdn)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid msisdn format (must be E.164)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentRequest.currency || !isValidCurrency(paymentRequest.currency)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid currency (must be UGX, KES, or TZS)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!paymentRequest.amount || paymentRequest.amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid amount (must be positive)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize currency to uppercase
    paymentRequest.currency = paymentRequest.currency.toUpperCase();
    
    console.log('🏦 Processing RelWorx Payment:', {
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      msisdn: paymentRequest.msisdn.replace(/(\+\d{3})\d{6}(\d{3})/, '$1******$2'), // Mask phone number for logs
      reference: paymentRequest.reference
    });

    // Optional idempotency check - uncomment if you want to prevent duplicate references
    // const { data: existingTx } = await anonClient
    //   .from('transactions')
    //   .select('id')
    //   .eq('reference', paymentRequest.reference)
    //   .eq('user_id', user.id)
    //   .single();
    // 
    // if (existingTx) {
    //   return new Response(
    //     JSON.stringify({ success: false, error: 'Reference already used' }),
    //     { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    // Get RelWorx configuration from database using admin client
    const { data: config, error: configError } = await adminClient
      .from('relworx_payment_configs')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('Config fetch error:', configError);
      return new Response(
          JSON.stringify({ success: false, error: 'Configuration error' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!config) {
      return new Response(
        JSON.stringify({ success: false, error: 'RelWorx configuration not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API credentials from environment
    const apiKey = Deno.env.get('RELWORX_API_KEY');
    const accountNumber = Deno.env.get('RELWORX_ACCOUNT_NO');
    
    if (!apiKey) {
      console.error('RELWORX_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment service configuration error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!accountNumber) {
      console.error('RELWORX_ACCOUNT_NO not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment service configuration error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate currency and amount limits with defaults
    const limits = config.payment_limits || {};
    const currencyLimits = {
      UGX: { min: limits?.min_ugx || 500, max: limits?.max_ugx || 5000000 },
      KES: { min: limits?.min_kes || 10, max: limits?.max_kes || 70000 },
      TZS: { min: limits?.min_tzs || 500, max: limits?.max_tzs || 5000000 }
    };

    const currentLimits = currencyLimits[paymentRequest.currency as keyof typeof currencyLimits];
    if (paymentRequest.amount < currentLimits.min || paymentRequest.amount > currentLimits.max) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Amount must be between ${currentLimits.min} and ${currentLimits.max} ${paymentRequest.currency}` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare RelWorx API payload (matching their exact sample format)
    const relworxPayload = {
      account_no: accountNumber,
      reference: paymentRequest.reference,
      msisdn: paymentRequest.msisdn,
      currency: paymentRequest.currency,
      amount: paymentRequest.amount,
      description: paymentRequest.description || 'Yawatu payment request'
    };

    console.log('📡 Making RelWorx API call:', {
      ...relworxPayload,
      account_no: accountNumber.replace(/(.{3}).*(.{3})/, '$1***$2'),
      msisdn: paymentRequest.msisdn.replace(/(\+\d{3})\d{6}(\d{3})/, '$1******$2')
    });

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let relworxResponse;
    try {
      relworxResponse = await fetch('https://payments.relworx.com/api/mobile-money/send-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.relworx.v2',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(relworxPayload),
        signal: controller.signal
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('RelWorx API timeout');
        return new Response(
          JSON.stringify({ success: false, error: 'Payment service timeout' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('RelWorx API fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment service unavailable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    let relworxData;
    try {
      relworxData = await relworxResponse.json();
    } catch (parseError) {
      console.error('Failed to parse RelWorx response as JSON:', parseError);
      const responseText = await relworxResponse.text();
      console.error('Raw response:', responseText.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response from payment service' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('📥 RelWorx API Response:', {
      status: relworxResponse.status,
      statusText: relworxResponse.statusText,
      success: relworxData.success,
      message: relworxData.message,
      internal_reference: relworxData.internal_reference
    });

    if (!relworxResponse.ok) {
      const errorMessage = relworxData?.message || relworxResponse.statusText || `HTTP ${relworxResponse.status}`;
      console.error('RelWorx API HTTP Error:', {
        status: relworxResponse.status,
        statusText: relworxResponse.statusText,
        responseBody: relworxData
      });
      
      // Return appropriate error codes based on RelWorx response
      const statusCode = 200;
      return new Response(
        JSON.stringify({ success: false, error: `Payment service error: ${errorMessage}` }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!relworxData.success) {
      console.error('RelWorx API Business Logic Error:', relworxData);
      return new Response(
        JSON.stringify({ success: false, error: relworxData.message || 'Payment request failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's wallet using RLS-compliant anon client
    const { data: wallet, error: walletError } = await anonClient
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .eq('currency', paymentRequest.currency)
      .maybeSingle();

    if (walletError) {
      console.error('Wallet fetch error:', walletError);
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet access error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!wallet) {
      return new Response(
        JSON.stringify({ success: false, error: `No ${paymentRequest.currency} wallet found` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create transaction record using RLS-compliant anon client
    const { data: transaction, error: transactionError } = await anonClient
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        transaction_type: 'deposit',
        status: 'pending',
        approval_status: 'pending',
        payment_gateway: 'relworx',
        reference: paymentRequest.reference,
        gateway_reference: relworxData.internal_reference,
        gateway_response: relworxData,
        description: paymentRequest.description
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create transaction record' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Transaction created:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: relworxData.message,
        transaction_id: transaction.id,
        internal_reference: relworxData.internal_reference,
        reference: paymentRequest.reference,
        status: 'pending'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ RelWorx Payment Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Payment processing failed'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});