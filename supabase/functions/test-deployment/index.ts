import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

console.log('Test deployment function initializing...', new Date().toISOString());

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  console.log('Test deployment function called:', req.method, new Date().toISOString());
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Test deployment function called successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test deployment function is working!',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Test deployment function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error' 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
};

console.log('Test deployment function ready to serve requests');
serve(handler);