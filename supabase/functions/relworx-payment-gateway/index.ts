import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface RelWorxPaymentRequest {
  action: 'request-payment' | 'send-payment' | 'validate-number' | 'check-status';
  amount?: number;
  currency?: string;
  msisdn?: string;
  description?: string;
  reference?: string;
  internal_reference?: string;
  transaction_type?: 'deposit' | 'withdraw';
}

interface RelWorxApiResponse {
  success: boolean;
  message: string;
  internal_reference?: string;
  customer_name?: string;
  balance?: number;
  status?: string;
  customer_reference?: string;
  amount?: number;
  provider?: string;
  charge?: number;
  request_status?: string;
  provider_transaction_id?: string;
  completed_at?: string;
}

// Validate and normalize phone number to E.164 format
function normalizePhoneNumber(msisdn: string, currency: string): string {
  const cleaned = msisdn.replace(/\D/g, '');
  
  // Country code mappings
  const countryPrefixes = {
    'UGX': { code: '256', length: 9 },
    'KES': { code: '254', length: 9 },
    'TZS': { code: '255', length: 9 }
  };
  
  const config = countryPrefixes[currency as keyof typeof countryPrefixes];
  if (!config) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  
  // Remove country code if present
  let nationalNumber = cleaned;
  if (cleaned.startsWith(config.code)) {
    nationalNumber = cleaned.substring(config.code.length);
  }
  
  // Remove leading zero if present
  if (nationalNumber.startsWith('0')) {
    nationalNumber = nationalNumber.substring(1);
  }
  
  // Validate length
  if (nationalNumber.length !== config.length) {
    throw new Error(`Invalid phone number length for ${currency}`);
  }
  
  return `+${config.code}${nationalNumber}`;
}

// Validate currency
function isValidCurrency(currency: string): boolean {
  return ['UGX', 'KES', 'TZS'].includes(currency.toUpperCase());
}

// Make authenticated RelWorx API call
async function callRelWorxAPI(
  endpoint: string, 
  method: 'GET' | 'POST', 
  payload?: any, 
  apiKey?: string,
  accountNo?: string
): Promise<RelWorxApiResponse> {
  const baseUrl = Deno.env.get('RELWORX_API_URL') || 'https://payments.relworx.com';
  const url = `${baseUrl}/api/${endpoint}`;
  
  console.log(`📡 RelWorx API Call: ${method} ${endpoint}`, payload ? { ...payload, account_no: accountNo?.substring(0, 6) + '...' } : {});
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.relworx.v2',
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal
    });
    
    const responseText = await response.text();
    let data: RelWorxApiResponse;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse RelWorx response:', responseText);
      throw new Error('Invalid JSON response from RelWorx API');
    }
    
    console.log(`📥 RelWorx Response [${response.status}]:`, {
      success: data.success,
      message: data.message,
      internal_reference: data.internal_reference
    });
    
    if (!response.ok) {
      throw new Error(`RelWorx API Error (${response.status}): ${data.message || response.statusText}`);
    }
    
    return data;
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('RelWorx API request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const paymentRequest: RelWorxPaymentRequest = await req.json();
    
    // Get API credentials
    const apiKey = Deno.env.get('RELWORX_API_KEY');
    const accountNo = Deno.env.get('RELWORX_ACCOUNT_NO');
    
    if (!apiKey || !accountNo) {
      console.error('Missing RelWorx credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different actions
    switch (paymentRequest.action) {
      case 'validate-number': {
        if (!paymentRequest.msisdn) {
          return new Response(
            JSON.stringify({ success: false, error: 'Phone number required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await callRelWorxAPI(
          'mobile-money/validate',
          'POST',
          { msisdn: paymentRequest.msisdn },
          apiKey
        );

        return new Response(
          JSON.stringify({
            success: data.success,
            message: data.message,
            customer_name: data.customer_name
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check-status': {
        if (!paymentRequest.internal_reference) {
          return new Response(
            JSON.stringify({ success: false, error: 'Internal reference required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await callRelWorxAPI(
          `mobile-money/check-request-status?internal_reference=${paymentRequest.internal_reference}&account_no=${accountNo}`,
          'GET',
          undefined,
          apiKey
        );

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'request-payment':
      case 'send-payment': {
        // Validate required fields
        if (!paymentRequest.amount || paymentRequest.amount <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Valid amount required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!paymentRequest.currency || !isValidCurrency(paymentRequest.currency)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Valid currency required (UGX, KES, TZS)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!paymentRequest.msisdn) {
          return new Response(
            JSON.stringify({ success: false, error: 'Phone number required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!paymentRequest.reference) {
          return new Response(
            JSON.stringify({ success: false, error: 'Reference required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Normalize phone number
        let normalizedPhone: string;
        try {
          normalizedPhone = normalizePhoneNumber(paymentRequest.msisdn, paymentRequest.currency.toUpperCase());
        } catch (phoneError: any) {
          return new Response(
            JSON.stringify({ success: false, error: phoneError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for duplicate reference
        const { data: existingTx } = await anonClient
          .from('transactions')
          .select('id')
          .eq('reference', paymentRequest.reference)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (existingTx) {
          return new Response(
            JSON.stringify({ success: false, error: 'Reference already used' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user wallet
        const { data: wallet, error: walletError } = await anonClient
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.id)
          .eq('currency', paymentRequest.currency.toUpperCase())
          .maybeSingle();

        if (walletError || !wallet) {
          return new Response(
            JSON.stringify({ success: false, error: `No ${paymentRequest.currency} wallet found` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // For withdrawals, check sufficient balance
        if (paymentRequest.action === 'send-payment' && wallet.balance < paymentRequest.amount) {
          return new Response(
            JSON.stringify({ success: false, error: 'Insufficient wallet balance' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prepare RelWorx payload
        const relworxPayload = {
          account_no: accountNo,
          reference: paymentRequest.reference,
          msisdn: normalizedPhone,
          currency: paymentRequest.currency.toUpperCase(),
          amount: paymentRequest.amount,
          description: paymentRequest.description || `Yawatu ${paymentRequest.action.replace('-', ' ')}`
        };

        // Call RelWorx API
        const endpoint = paymentRequest.action === 'request-payment' 
          ? 'mobile-money/request-payment' 
          : 'mobile-money/send-payment';
          
        const relworxData = await callRelWorxAPI(endpoint, 'POST', relworxPayload, apiKey);

        if (!relworxData.success) {
          return new Response(
            JSON.stringify({ success: false, error: relworxData.message || 'Payment request failed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create transaction record
        const transactionType = paymentRequest.action === 'request-payment' ? 'deposit' : 'withdraw';
        const transactionAmount = transactionType === 'withdraw' ? -Math.abs(paymentRequest.amount) : paymentRequest.amount;

        const { data: transaction, error: transactionError } = await anonClient
          .from('transactions')
          .insert({
            user_id: user.id,
            wallet_id: wallet.id,
            amount: transactionAmount,
            currency: paymentRequest.currency.toUpperCase(),
            transaction_type: transactionType,
            status: 'pending',
            approval_status: 'pending',
            payment_gateway: 'relworx',
            reference: paymentRequest.reference,
            gateway_reference: relworxData.internal_reference,
            gateway_response: relworxData,
            description: paymentRequest.description || relworxPayload.description
          })
          .select()
          .single();

        if (transactionError) {
          console.error('Transaction creation error:', transactionError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to create transaction record' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // For withdrawals, deduct from wallet immediately (will be refunded if fails)
        if (transactionType === 'withdraw') {
          const { error: walletUpdateError } = await anonClient
            .from('wallets')
            .update({
              balance: wallet.balance - paymentRequest.amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);

          if (walletUpdateError) {
            console.error('Wallet update error:', walletUpdateError);
            // Rollback transaction creation if wallet update fails
            await anonClient.from('transactions').delete().eq('id', transaction.id);
            
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to update wallet balance' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        console.log(`✅ ${transactionType} transaction created:`, transaction.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: relworxData.message,
            transaction_id: transaction.id,
            internal_reference: relworxData.internal_reference,
            reference: paymentRequest.reference,
            transaction_type: transactionType,
            status: 'pending'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action specified' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: any) {
    console.error('❌ RelWorx Gateway Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Payment processing failed'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});