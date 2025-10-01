import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SimpleLes API Configuration
const SIMPLELES_BASE_URL = "http://payments.simpleles.net:5056/api/wallet";
const SIMPLELES_API_KEY = "YW.dByWxeGfQHqVV6309MHtJQ-dId9UPVsR-TIop7RuYrmA9RIL";
const SIMPLELES_ACCOUNT_NO = "YEW2024A25E4R";

interface GatewayRequest {
  operation: 'deposit' | 'withdraw' | 'balance';
  amount?: number;
  currency?: string;
  phoneNumber?: string;
  reference?: string;
  description?: string;
  userId?: string;
  transactionId?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const requestBody: GatewayRequest = await req.json();
    console.log(`SimpleLes Gateway - Operation: ${requestBody.operation}`, requestBody);

    const { operation, amount, currency = 'UGX', phoneNumber, reference, description, userId, transactionId } = requestBody;

    let endpoint = '';
    let method = 'GET';
    let payload: any = null;

    switch (operation) {
      case 'balance':
        endpoint = `${SIMPLELES_BASE_URL}/mm-balance?account_no=${SIMPLELES_ACCOUNT_NO}`;
        method = 'GET';
        break;

      case 'deposit':
        endpoint = `${SIMPLELES_BASE_URL}/mm-deposit`;
        method = 'POST';
        payload = {
          account_no: SIMPLELES_ACCOUNT_NO,
          reference: reference || `DEP_${Date.now()}`,
          msisdn: phoneNumber,
          currency: currency,
          amount: amount?.toFixed(2),
          description: description || 'Deposit to wallet'
        };
        break;

      case 'withdraw':
        endpoint = `${SIMPLELES_BASE_URL}/mm-withdraw`;
        method = 'POST';
        payload = {
          account_no: SIMPLELES_ACCOUNT_NO,
          reference: reference || `WD_${Date.now()}`,
          msisdn: phoneNumber,
          currency: currency,
          amount: amount?.toFixed(2),
          description: description || 'Withdrawal from wallet'
        };
        break;

      default:
        throw new Error(`Invalid operation: ${operation}`);
    }

    console.log(`Calling SimpleLes API:`, {
      endpoint,
      method,
      payload: payload || 'N/A'
    });

    const startTime = Date.now();
    
    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SIMPLELES_API_KEY}`
      }
    };

    if (payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(endpoint, fetchOptions);
    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    
    console.log(`SimpleLes Response (${responseTime}ms):`, {
      status: response.status,
      body: responseText
    });

    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Update transaction if transactionId provided
    if (transactionId && operation !== 'balance') {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (response.ok && responseData.success) {
        updateData.status = operation === 'deposit' ? 'completed' : 'processing';
        updateData.gateway_reference = responseData.reference || reference;
        updateData.metadata = {
          simples_response: responseData,
          response_time_ms: responseTime
        };
      } else {
        updateData.status = 'failed';
        updateData.admin_notes = `SimpleLes API error: ${responseData.message || 'Unknown error'}`;
      }

      await supabaseClient
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId);
    }

    return new Response(
      JSON.stringify({
        success: response.ok && (responseData.success !== false),
        operation,
        data: responseData,
        responseTime: `${responseTime}ms`,
        request: payload || { operation: 'balance' }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (err) {
    console.error("SimpleLes Gateway error:", err);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
