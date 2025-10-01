import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SimpleLes API Configuration
const SIMPLELES_DEPOSIT_URL = "http://payments.simpleles.net:5056/api/wallet/mm-deposit";
const SIMPLELES_WITHDRAW_URL = "http://payments.simpleles.net:5056/api/wallet/mm-withdraw";
const SIMPLELES_API_KEY = "YW.dByWxeGfQHqVV6309MHtJQ-dId9UPVsR-TIop7RuYrmA9RIL";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log(`🚀 SimpleLes API Test - ${req.method} request`);
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const requestBody = await req.json();
    console.log('📝 Request body:', requestBody);

    // Determine operation type (deposit or withdraw)
    const operationType = requestBody.operation_type || 'deposit';
    const apiUrl = operationType === 'withdraw' ? SIMPLELES_WITHDRAW_URL : SIMPLELES_DEPOSIT_URL;

    // Prepare SimpleLes payload
    const simplesPayload = {
      account_no: requestBody.account_no || "YEW2024A25E4R",
      reference: requestBody.reference || `527ss50biosaafp_${Date.now()}`,
      msisdn: requestBody.msisdn || "+256778702721",
      currency: requestBody.currency || "UGX",
      amount: requestBody.amount || "1000.00",
      description: requestBody.description || "Payment Request."
    };

    console.log(`📤 Sending ${operationType} request to SimpleLes API:`, {
      url: apiUrl,
      payload: simplesPayload
    });

    const startTime = Date.now();
    
    // Make request to SimpleLes API
    const response = await fetch(apiUrl, {
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

    // Return response with metadata
    const testResponse = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      responseTime,
      operationType,
      request: simplesPayload,
      endpoint: apiUrl
    };

    return new Response(
      JSON.stringify(testResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (err) {
    console.error("❌ SimpleLes API test error:", err);
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "API test error",
        details: errorMessage,
        status: 500,
        statusText: 'Internal Server Error'
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
