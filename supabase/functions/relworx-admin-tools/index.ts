import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface AdminRequest {
  action: 'check-wallet-balance' | 'get-transactions' | 'validate-config' | 'test-connectivity';
  account_no?: string;
  currency?: string;
  limit?: number;
}

// Make authenticated RelWorx API call
async function callRelWorxAPI(endpoint: string, method: 'GET' | 'POST', payload?: any): Promise<any> {
  const apiKey = Deno.env.get('RELWORX_API_KEY');
  const baseUrl = Deno.env.get('RELWORX_API_URL') || 'https://payments.relworx.com';
  
  if (!apiKey) {
    throw new Error('RELWORX_API_KEY not configured');
  }
  
  const url = `${baseUrl}/api/${endpoint}`;
  console.log(`📡 RelWorx Admin API Call: ${method} ${endpoint}`);
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.relworx.v2',
    'Authorization': `Bearer ${apiKey}`
  };
  
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
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
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse RelWorx response:', responseText);
      throw new Error('Invalid JSON response from RelWorx API');
    }
    
    console.log(`📥 RelWorx Admin Response [${response.status}]:`, data);
    
    if (!response.ok) {
      throw new Error(`RelWorx API Error (${response.status}): ${data.message || response.statusText}`);
    }
    
    return data;
    
  } finally {
    clearTimeout(timeoutId);
  }
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

    // Authenticate admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin permissions
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminRequest: AdminRequest = await req.json();
    
    switch (adminRequest.action) {
      case 'validate-config': {
        const config = {
          RELWORX_API_KEY: !!Deno.env.get('RELWORX_API_KEY'),
          RELWORX_ACCOUNT_NO: !!Deno.env.get('RELWORX_ACCOUNT_NO'),
          RELWORX_WEBHOOK_SECRET: !!Deno.env.get('RELWORX_WEBHOOK_SECRET'),
          RELWORX_API_URL: Deno.env.get('RELWORX_API_URL') || 'https://payments.relworx.com'
        };

        // Check database configuration
        const { data: dbConfig, error: configError } = await supabaseClient
          .from('relworx_payment_configs')
          .select('*')
          .eq('is_active', true)
          .maybeSingle();

        return new Response(
          JSON.stringify({
            success: true,
            configuration: {
              environment: config,
              database: {
                configExists: !!dbConfig,
                error: configError?.message
              }
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'test-connectivity': {
        try {
          // Test API connectivity with a simple endpoint
          const accountNo = Deno.env.get('RELWORX_ACCOUNT_NO');
          if (!accountNo) {
            throw new Error('RELWORX_ACCOUNT_NO not configured');
          }

          const data = await callRelWorxAPI(
            `mobile-money/check-wallet-balance?account_no=${accountNo}&currency=UGX`,
            'GET'
          );

          return new Response(
            JSON.stringify({
              success: true,
              message: 'API connectivity test successful',
              data: data
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Connectivity test failed: ${error.message}`
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'check-wallet-balance': {
        const accountNo = adminRequest.account_no || Deno.env.get('RELWORX_ACCOUNT_NO');
        const currency = adminRequest.currency || 'UGX';
        
        if (!accountNo) {
          return new Response(
            JSON.stringify({ success: false, error: 'Account number required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await callRelWorxAPI(
          `mobile-money/check-wallet-balance?account_no=${accountNo}&currency=${currency}`,
          'GET'
        );

        return new Response(
          JSON.stringify({
            success: data.success,
            balance: data.balance,
            currency: currency,
            account_no: accountNo.substring(0, 6) + '...'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-transactions': {
        const accountNo = adminRequest.account_no || Deno.env.get('RELWORX_ACCOUNT_NO');
        
        if (!accountNo) {
          return new Response(
            JSON.stringify({ success: false, error: 'Account number required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await callRelWorxAPI(
          `payment-requests/transactions?account_no=${accountNo}`,
          'GET'
        );

        // Limit results if requested
        if (adminRequest.limit && data.transactions) {
          data.transactions = data.transactions.slice(0, adminRequest.limit);
        }

        return new Response(
          JSON.stringify({
            success: data.success,
            transactions: data.transactions || [],
            account_no: accountNo.substring(0, 6) + '...'
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
    console.error('❌ RelWorx Admin Tools Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Admin operation failed'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});