import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SimpleLes API Configuration
const SIMPLELES_API_URL = "http://payments.simpleles.net:5056/api/wallet/mm-deposit";
const SIMPLELES_API_KEY = "YW.dByWxeGfQHqVV6309MHtJQ-dId9UPVsR-TIop7RuYrmA9RIL";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log(`🚀 Mobile Money Deposit - ${req.method} request`);
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const requestBody = await req.json();
    console.log('📝 Request body:', requestBody);

    const { user_id, phone_number, amount, currency = 'UGX', description } = requestBody;

    if (!user_id || !phone_number || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: user_id, phone_number, amount' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .eq('currency', currency)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet not found for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique reference
    const reference = `YW_${Date.now()}_${user_id.substring(0, 8)}`;

    // Create pending transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id,
        wallet_id: wallet.id,
        amount,
        currency,
        transaction_type: 'deposit',
        status: 'pending',
        reference,
        description: description || 'Mobile money deposit'
      })
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Transaction creation error:', transactionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create transaction' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare SimpleLes payload
    const simplesPayload = {
      account_no: "YEW2024A25E4R",
      reference,
      msisdn: phone_number,
      currency,
      amount: amount.toString(),
      description: description || "Yawatu Wallet Deposit"
    };

    console.log('📤 Sending to SimpleLes API:', {
      url: SIMPLELES_API_URL,
      payload: simplesPayload
    });

    const startTime = Date.now();
    
    // Make request to SimpleLes API
    const response = await fetch(SIMPLELES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SIMPLELES_API_KEY}`
      },
      body: JSON.stringify(simplesPayload)
    });

    const responseTime = `${Date.now() - startTime}ms`;
    const responseText = await response.text();
    
    console.log(`📥 SimpleLes Response: ${response.status} ${response.statusText}`);
    console.log(`⏱️ Response Time: ${responseTime}`);
    console.log(`📄 Response Body:`, responseText);
    
    // Parse response data
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Update transaction based on response
    if (response.ok) {
      // SimpleLes returned success - complete the transaction and credit wallet
      console.log('✅ SimpleLes deposit successful, completing transaction...');
      
      // Update wallet balance
      const { error: walletUpdateError } = await supabase
        .from('wallets')
        .update({ 
          balance: wallet.balance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (walletUpdateError) {
        console.error('❌ Wallet update error:', walletUpdateError);
        // Still mark transaction as failed if wallet update fails
        await supabase
          .from('transactions')
          .update({ 
            status: 'failed',
            metadata: { 
              ...responseData, 
              error: 'Failed to update wallet balance',
              wallet_error: walletUpdateError 
            }
          })
          .eq('id', transaction.id);
      } else {
        // Transaction completed successfully
        console.log('💰 Wallet credited successfully');
        await supabase
          .from('transactions')
          .update({ 
            status: 'completed',
            approval_status: 'approved',
            metadata: responseData,
            approved_at: new Date().toISOString()
          })
          .eq('id', transaction.id);
      }
    } else {
      // SimpleLes returned error
      console.error('❌ SimpleLes deposit failed');
      await supabase
        .from('transactions')
        .update({ 
          status: 'failed',
          approval_status: 'rejected',
          metadata: responseData 
        })
        .eq('id', transaction.id);
    }

    // Return response with metadata
    const depositResponse = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      responseTime,
      transaction_id: transaction.id,
      reference,
      endpoint: SIMPLELES_API_URL
    };

    return new Response(
      JSON.stringify(depositResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (err) {
    console.error("❌ Mobile money deposit error:", err);
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Deposit processing error",
        details: errorMessage,
        status: 500,
        statusText: 'Internal Server Error'
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
