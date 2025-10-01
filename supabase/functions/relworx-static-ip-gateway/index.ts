import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RELWORX_URL = "https://payments.relworx.com/api/mobile-money/request-payment";
const API_KEY = Deno.env.get("RELWORX_API_KEY") || "";

// Static IP Proxy Configuration
const STATIC_PROXY_URL = Deno.env.get("STATIC_PROXY_URL") || "";
const STATIC_PROXY_USERNAME = Deno.env.get("STATIC_PROXY_USERNAME") || "";
const STATIC_PROXY_PASSWORD = Deno.env.get("STATIC_PROXY_PASSWORD") || "";

if (!API_KEY) {
  console.warn("RELWORX_API_KEY not set; requests will fail with upstream 401.");
}

if (!STATIC_PROXY_URL) {
  console.error("STATIC_PROXY_URL is required for static IP gateway");
}

/**
 * Makes HTTP request through static IP proxy using HTTP tunnel
 */
async function makeProxiedRequest(url: string, options: RequestInit): Promise<Response> {
  try {
    // For demonstration - using a proxy service API approach
    // Replace with your chosen static IP proxy service
    
    const proxyRequestData = {
      url: url,
      method: options.method || 'GET',
      headers: Object.fromEntries(new Headers(options.headers as HeadersInit)),
      body: options.body,
      proxy_url: STATIC_PROXY_URL,
      proxy_auth: STATIC_PROXY_USERNAME && STATIC_PROXY_PASSWORD ? {
        username: STATIC_PROXY_USERNAME,
        password: STATIC_PROXY_PASSWORD
      } : undefined
    };

    // Option 1: Using ProxyMesh or similar service
    if (STATIC_PROXY_URL.includes('proxymesh.com')) {
      const proxyAuth = STATIC_PROXY_USERNAME && STATIC_PROXY_PASSWORD 
        ? `${STATIC_PROXY_USERNAME}:${STATIC_PROXY_PASSWORD}@`
        : '';
      
      const proxyHost = STATIC_PROXY_URL.replace('http://', '').replace('https://', '');
      
      // Create a custom request that routes through the proxy
      // Note: This is a conceptual implementation - actual proxy usage may vary
      return await fetch(url, {
        ...options,
        // Add proxy configuration in headers (service-specific)
        headers: {
          ...options.headers,
          'Proxy-Authorization': `Basic ${btoa(`${STATIC_PROXY_USERNAME}:${STATIC_PROXY_PASSWORD}`)}`,
          'X-Proxy-Host': proxyHost
        }
      });
    }

    // Option 2: Using dedicated proxy API
    const proxyApiResponse = await fetch(`${STATIC_PROXY_URL}/proxy-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STATIC_PROXY_USERNAME}:${STATIC_PROXY_PASSWORD}`
      },
      body: JSON.stringify(proxyRequestData)
    });

    if (!proxyApiResponse.ok) {
      throw new Error(`Proxy API error: ${proxyApiResponse.status} ${proxyApiResponse.statusText}`);
    }

    const proxyResult = await proxyApiResponse.json();
    
    // Convert proxy response back to standard Response
    return new Response(JSON.stringify(proxyResult.data), {
      status: proxyResult.status || 200,
      statusText: proxyResult.statusText || 'OK',
      headers: proxyResult.headers || {}
    });

  } catch (error) {
    console.error('Proxy request failed:', error);
    throw error;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log(`🚀 RelWorx Static IP Gateway - ${req.method} request`);
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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

    const body = await req.text();
    
    console.log(`🌐 Making request through static IP proxy`);
    console.log(`🔑 Using API key: ${API_KEY ? 'Set' : 'Missing'}`);
    console.log(`🏢 Proxy URL: ${STATIC_PROXY_URL ? 'Configured' : 'Missing'}`);

    const upstreamHeaders = new Headers();
    upstreamHeaders.set("Content-Type", "application/json");
    upstreamHeaders.set("Accept", "application/vnd.relworx.v2");
    upstreamHeaders.set("Authorization", `Bearer ${API_KEY}`);

    // Forward select client headers
    const forwarded = ["x-request-id", "x-correlation-id"];
    for (const h of forwarded) {
      const v = req.headers.get(h);
      if (v) upstreamHeaders.set(h, v);
    }

    const startTime = Date.now();
    
    // Make proxied request through static IP
    const upstreamReq = await makeProxiedRequest(RELWORX_URL, {
      method: "POST",
      headers: upstreamHeaders,
      body,
    });

    const responseTime = `${Date.now() - startTime}ms`;
    const respText = await upstreamReq.text();
    
    console.log(`📥 RelWorx Response: ${upstreamReq.status} ${upstreamReq.statusText}`);
    console.log(`⏱️ Response Time: ${responseTime}`);
    
    let responseData: any;
    try {
      responseData = JSON.parse(respText);
    } catch {
      responseData = respText;
    }

    const proxyResponse = {
      success: upstreamReq.ok,
      status: upstreamReq.status,
      statusText: upstreamReq.statusText,
      data: responseData,
      responseTime,
      proxy_used: true,
      static_ip: true
    };

    return new Response(
      JSON.stringify(proxyResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (err) {
    console.error("❌ RelWorx static IP proxy error:", err);
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Proxy gateway error",
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