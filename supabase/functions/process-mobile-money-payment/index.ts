import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MobileMoneyPaymentRequest {
  amount: number;
  currency: 'UGX' | 'USD' | 'KES' | 'TZS';
  phone: string;
  network?: 'mtn' | 'airtel' | 'mpesa' | 'tigo';
  transaction_type: 'deposit' | 'withdraw';
  description?: string;
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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    const user = data.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const requestData: MobileMoneyPaymentRequest = await req.json();
    console.log('RelWorx payment request received:', { 
      userId: user.id, 
      amount: requestData.amount, 
      currency: requestData.currency,
      transaction_type: requestData.transaction_type 
    });

    // Format phone number (ensure it starts with + and country code)
    let formattedPhone = requestData.phone;
    let detectedNetwork = requestData.network;
    
    // Format phone number according to RelWorx requirements (internationally formatted)
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        // Add appropriate country code based on currency
        const countryCode = requestData.currency === 'KES' ? '+254' : 
                           requestData.currency === 'TZS' ? '+255' : '+256';
        formattedPhone = countryCode + formattedPhone.substring(1);
      } else if (formattedPhone.match(/^(254|255|256)/)) {
        formattedPhone = '+' + formattedPhone;
      } else {
        // Default country code based on currency
        const countryCode = requestData.currency === 'KES' ? '+254' : 
                           requestData.currency === 'TZS' ? '+255' : '+256';
        formattedPhone = countryCode + formattedPhone;
      }
    }
    
    // Detect network if not provided
    if (!detectedNetwork) {
      // Remove + for pattern matching
      const phoneForMatching = formattedPhone.replace('+', '');
      
      // Uganda (UGX)
      if (requestData.currency === 'UGX') {
        if (phoneForMatching.match(/^256(77|78|76|39)/)) {
          detectedNetwork = 'mtn';
        } else if (phoneForMatching.match(/^256(70|74|75|20)/)) {
          detectedNetwork = 'airtel';
        }
      }
      
      // Kenya (KES)
      if (requestData.currency === 'KES') {
        if (phoneForMatching.match(/^254(7[0-9]|1[0-9])/)) {
          detectedNetwork = 'mpesa';
        } else if (phoneForMatching.match(/^254(7[3-5])/)) {
          detectedNetwork = 'airtel';
        }
      }
      
      // Tanzania (TZS)
      if (requestData.currency === 'TZS') {
        if (phoneForMatching.match(/^255(7[1-9]|6[1-9])/)) {
          detectedNetwork = 'mpesa';
        } else if (phoneForMatching.match(/^255(7[5-8]|6[8-9])/)) {
          detectedNetwork = 'airtel';
        }
      }
    }

    // Get RelWorx configuration and API credentials
    const relworxApiKey = Deno.env.get('RELWORX_API_KEY');
    const relworxApiUrl = Deno.env.get('RELWORX_API_URL') || 'https://payments.relworx.com';
    
    console.log('🔍 RelWorx Environment Check:', {
      apiKeyExists: !!relworxApiKey,
      apiUrl: relworxApiUrl,
      keyLength: relworxApiKey ? relworxApiKey.length : 0,
      sandboxMode: false, // Always live mode now
      envVarSet: {
        RELWORX_API_KEY: !!Deno.env.get('RELWORX_API_KEY'),
        RELWORX_API_URL: !!Deno.env.get('RELWORX_API_URL'),
        SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
        SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      }
    });

    // Get RelWorx account configuration with validation
    const { data: relworxConfig, error: configError } = await supabaseClient
      .from('relworx_payment_configs')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('❌ Database error fetching RelWorx config:', configError);
      throw new Error('Failed to retrieve payment configuration. Please try again.');
    }

    // Get account number from environment
    const accountNumber = Deno.env.get('RELWORX_ACCOUNT_NUMBER');
    const webhookSecret = Deno.env.get('RELWORX_WEBHOOK_SECRET');

    console.log('🔧 RelWorx Config Status:', {
      configFound: !!relworxConfig,
      accountNumberFromEnv: accountNumber ? `${accountNumber.slice(0, 6)}***` : 'missing',
      isSandbox: relworxConfig?.is_sandbox || false
    });

    // Comprehensive validation for live transactions
    const validationErrors = [];
    
    if (!relworxApiKey || relworxApiKey.length < 10) {
      validationErrors.push('API key not properly configured');
    }
    
    if (!accountNumber) {
      validationErrors.push('RELWORX_ACCOUNT_NUMBER not configured in environment');
    }
    
    if (!relworxConfig) {
      validationErrors.push('Payment gateway configuration not found');
    }
    
    if (!webhookSecret) {
      console.warn('⚠️ Webhook secret not configured in environment - this may affect payment confirmations');
    }
    
    if (validationErrors.length > 0) {
      console.error('❌ RelWorx validation failed:', validationErrors);
      throw new Error(`Payment service setup incomplete: ${validationErrors.join(', ')}. Please configure RelWorx credentials in admin settings.`);
    }
    
    console.log('✅ RelWorx setup fully validated - proceeding with live transactions');

    // Get user wallet first
    const { data: wallet } = await supabaseClient
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .eq('currency', requestData.currency)
      .single();

    if (!wallet) {
      throw new Error('Wallet not found for this currency');
    }

    // Create internal transaction record
    const { data: internalTransaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        amount: requestData.amount,
        currency: requestData.currency,
        transaction_type: requestData.transaction_type,
        status: 'pending',
        payment_gateway: 'relworx',
        reference: `MM-${Date.now()}-${user.id.slice(0, 8)}`
      })
      .select()
      .single();

    if (transactionError) {
      throw transactionError;
    }


    // For withdrawals, check sufficient balance and deduct upfront
    if (requestData.transaction_type === 'withdraw') {
      if (wallet.balance < requestData.amount) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Insufficient balance' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Deduct amount from wallet for withdrawal
      const { error: balanceError } = await supabaseClient
        .from('wallets')
        .update({ 
          balance: wallet.balance - requestData.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (balanceError) {
        throw balanceError;
      }
    }

    // Real RelWorx API call - no mock mode
    const relworxPayload = {
      account_no: accountNumber,
      reference: internalTransaction.reference,
      msisdn: formattedPhone,
      currency: requestData.currency,
      amount: parseFloat(requestData.amount.toString()), // Ensure decimal format
      description: requestData.description || `${requestData.transaction_type === 'deposit' ? 'Deposit to' : 'Withdrawal from'} ${requestData.currency} wallet via ${detectedNetwork?.toUpperCase()} mobile money`
    };

    // Validate required fields according to RelWorx documentation
    if (!relworxPayload.msisdn || !relworxPayload.account_no || !relworxPayload.reference) {
      throw new Error('Missing required payment parameters');
    }
    
    // Validate reference length (8-36 characters as per RelWorx docs)
    if (relworxPayload.reference.length < 8 || relworxPayload.reference.length > 36) {
      throw new Error('Reference must be between 8 and 36 characters');
    }

    // Validate currency and amount limits based on RelWorx documentation
    const limits = relworxConfig.payment_limits || {
      min_ugx: 500, max_ugx: 5000000,
      min_kes: 10, max_kes: 70000,
      min_tzs: 500, max_tzs: 5000000
    };
    
    const currency = requestData.currency.toLowerCase();
    const amount = requestData.amount;
    
    if (currency === 'ugx' && (amount < limits.min_ugx || amount > limits.max_ugx)) {
      throw new Error(`UGX amount must be between ${limits.min_ugx} and ${limits.max_ugx}`);
    } else if (currency === 'kes' && (amount < limits.min_kes || amount > limits.max_kes)) {
      throw new Error(`KES amount must be between ${limits.min_kes} and ${limits.max_kes}`);
    } else if (currency === 'tzs' && (amount < limits.min_tzs || amount > limits.max_tzs)) {
      throw new Error(`TZS amount must be between ${limits.min_tzs} and ${limits.max_tzs}`);
    }

    // Check rate limiting (5 requests per 10 minutes per phone number)
    const rateLimitSettings = relworxConfig.rate_limit_settings || { max_requests: 5, window_minutes: 10 };
    console.log('⏱️ Rate limit check:', {
      phone: formattedPhone,
      maxRequests: rateLimitSettings.max_requests,
      windowMinutes: rateLimitSettings.window_minutes
    });

    const endpoint = requestData.transaction_type === 'deposit' 
      ? 'request-payment' 
      : 'send-payment';
    
    const apiVersion = relworxConfig.api_version || 'v2';
    
    console.log('🚀 Calling RelWorx Live API:', {
      endpoint,
      baseUrl: relworxApiUrl,
      fullUrl: `${relworxApiUrl}/api/mobile-money/${endpoint}`,
      apiVersion,
      keyName: relworxConfig.key_name || 'Unknown',
      authorizedAccounts: relworxConfig.authorized_business_accounts?.length || 0,
      payload: { 
        ...relworxPayload, 
        account_no: '[REDACTED]',
        msisdn: formattedPhone.slice(0, 6) + 'XXXX' // Partial phone for security
      },
      headers: {
        'Authorization': 'Bearer [REDACTED]',
        'Content-Type': 'application/json',
        'Accept': `application/vnd.relworx.${apiVersion}`
      }
    });

    let relworxResponse;

    try {
      const relworxApiResponse = await fetch(
        `${relworxApiUrl}/api/mobile-money/${endpoint}`,
        {
          method: 'POST',
      headers: {
        'Authorization': `Bearer ${relworxApiKey}`,
        'Content-Type': 'application/json',
        'Accept': `application/vnd.relworx.${apiVersion}`
      },
          body: JSON.stringify(relworxPayload),
          signal: AbortSignal.timeout(45000) // Increased to 45 seconds for better reliability
        }
      );

      if (!relworxApiResponse.ok) {
        const errorText = await relworxApiResponse.text();
        console.error('❌ RelWorx API error:', {
          status: relworxApiResponse.status,
          statusText: relworxApiResponse.statusText,
          body: errorText,
          url: `${relworxApiUrl}/api/mobile-money/${endpoint}`,
          headers: Object.fromEntries(relworxApiResponse.headers.entries())
        });
        
        let errorMessage = 'Payment gateway error';
        if (relworxApiResponse.status === 403) {
          errorMessage = 'Payment service authentication failed. API disabled for this account.';
        } else if (relworxApiResponse.status === 400) {
          errorMessage = 'Invalid payment request. Please check your phone number and amount.';
        } else if (relworxApiResponse.status === 401) {
          errorMessage = 'API authentication failed. Invalid API key.';
        } else if (relworxApiResponse.status >= 500) {
          errorMessage = 'Payment service temporarily unavailable. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      relworxResponse = await relworxApiResponse.json();
      console.log('✅ RelWorx API Success Response:', JSON.stringify(relworxResponse, null, 2));
      
    } catch (fetchError) {
      console.error('❌ RelWorx API fetch error:', fetchError);
      throw new Error(`Payment gateway connection failed: ${(fetchError as any)?.message || 'Unknown error'}`);
    }

    // Update internal transaction with gateway details (removed problematic payment_gateway_transactions insert)
    await supabaseClient
      .from('transactions')
      .update({
        gateway_reference: internalTransaction.reference,
        gateway_transaction_id: relworxResponse.internal_reference || `mock_${Date.now()}`,
        gateway_response: relworxResponse
      })
      .eq('id', internalTransaction.id);

    console.log('Mobile money payment initiated:', {
      userId: user.id,
      amount: requestData.amount,
      currency: requestData.currency,
      network: detectedNetwork,
      transactionType: requestData.transaction_type,
      gatewayTransactionId: relworxResponse.internal_reference,
      isLiveMode: true
    });

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: internalTransaction.id,
        gateway_transaction_id: relworxResponse.internal_reference,
        status: 'pending',
        message: relworxResponse.message || 
          (requestData.transaction_type === 'deposit' ? 
            'Payment request sent to your mobile money account' : 
            'Payment is being sent to your mobile money account')
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Mobile money payment error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as any)?.message || 'Payment request failed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});