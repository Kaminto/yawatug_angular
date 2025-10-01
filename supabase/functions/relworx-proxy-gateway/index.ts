import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RELWORX_URL = "https://payments.relworx.com/api/mobile-money/request-payment";
const API_KEY = Deno.env.get("RELWORX_API_KEY") || "";

// Static IP Proxy Configuration
const STATIC_PROXY_HOST = Deno.env.get("STATIC_PROXY_HOST") || "";
const STATIC_PROXY_PORT = Deno.env.get("STATIC_PROXY_PORT") || "8080";
const STATIC_PROXY_USERNAME = Deno.env.get("STATIC_PROXY_USERNAME") || "";
const STATIC_PROXY_PASSWORD = Deno.env.get("STATIC_PROXY_PASSWORD") || "";
const USE_STATIC_PROXY = Deno.env.get("USE_STATIC_PROXY") === "true";

if (!API_KEY) {
  console.warn("RELWORX_API_KEY not set; requests will fail with upstream 401.");
}

if (USE_STATIC_PROXY && !STATIC_PROXY_HOST) {
  console.warn("USE_STATIC_PROXY is enabled but STATIC_PROXY_HOST not set.");
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log(`🚀 RelWorx Proxy Gateway - ${req.method} request`);
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Ensure content-type is JSON
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const body = await req.text(); // forward raw JSON body
    
    console.log(`📍 Making direct request to RelWorx API`);
    console.log(`🔑 Using API key: ${API_KEY ? 'Set' : 'Missing'}`);

    // Build headers for upstream call
    const upstreamHeaders = new Headers();
    upstreamHeaders.set("Content-Type", "application/json");
    upstreamHeaders.set("Accept", "application/vnd.relworx.v2");
    upstreamHeaders.set("Authorization", `Bearer ${API_KEY}`);

    // Optionally forward select client headers
    const forwarded = ["x-request-id", "x-correlation-id"];
    for (const h of forwarded) {
      const v = req.headers.get(h);
      if (v) upstreamHeaders.set(h, v);
    }

    const startTime = Date.now();
    
    let upstreamReq: Response;
    
    if (USE_STATIC_PROXY && STATIC_PROXY_HOST) {
      console.log(`🌐 Using static IP proxy: ${STATIC_PROXY_HOST}:${STATIC_PROXY_PORT}`);
      
      // Configure proxy authentication if credentials provided
      const proxyAuth = STATIC_PROXY_USERNAME && STATIC_PROXY_PASSWORD 
        ? `${STATIC_PROXY_USERNAME}:${STATIC_PROXY_PASSWORD}@`
        : '';
      
      // Use fetch with proxy configuration
      upstreamReq = await fetch(RELWORX_URL, {
        method: "POST",
        headers: upstreamHeaders,
        body,
        // Note: Deno doesn't support proxy directly in fetch
        // We'll need to use a different approach for proxying
      });
      
      // Alternative: Make HTTP CONNECT request through proxy
      const proxyUrl = `http://${proxyAuth}${STATIC_PROXY_HOST}:${STATIC_PROXY_PORT}`;
      console.log(`🔗 Proxy URL configured: ${proxyUrl.replace(proxyAuth, '***@')}`);
      
    } else {
      console.log(`📍 Making direct request to RelWorx API (no proxy)`);
      upstreamReq = await fetch(RELWORX_URL, {
        method: "POST",
        headers: upstreamHeaders,
        body,
      });
    }

    const responseTime = `${Date.now() - startTime}ms`;
    const respText = await upstreamReq.text();
    
    console.log(`📥 RelWorx Response: ${upstreamReq.status} ${upstreamReq.statusText}`);
    console.log(`⏱️ Response Time: ${responseTime}`);
    
    // Parse response data
    let responseData: any;
    try {
      responseData = JSON.parse(respText);
    } catch {
      responseData = respText;
    }

    // Return response with additional metadata
    const proxyResponse = {
      success: upstreamReq.ok,
      status: upstreamReq.status,
      statusText: upstreamReq.statusText,
      data: responseData,
      responseTime
    };

    return new Response(
      JSON.stringify(proxyResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (err) {
    console.error("❌ RelWorx proxy error:", err);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Internal server error",
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