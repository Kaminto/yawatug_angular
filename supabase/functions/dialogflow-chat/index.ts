import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, conversationId } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Dialogflow CX credentials from environment
    const projectId = Deno.env.get('DIALOGFLOW_PROJECT_ID');
    const rawLocation = Deno.env.get('DIALOGFLOW_LOCATION') || 'us-central1';
    const location = /^[a-z]+-[a-z]+[0-9]$/.test(rawLocation) ? rawLocation : 'us-central1';
    const agentId = Deno.env.get('DIALOGFLOW_AGENT_ID');
    const credentialsJson = Deno.env.get('DIALOGFLOW_CREDENTIALS');

    if (!projectId || !agentId || !credentialsJson) {
      console.error('Missing Dialogflow CX configuration', { projectId: !!projectId, agentId: !!agentId, hasCredentials: !!credentialsJson });
      return new Response(
        JSON.stringify({ 
          error: 'Dialogflow CX not configured. Please add DIALOGFLOW_PROJECT_ID, DIALOGFLOW_AGENT_ID, and DIALOGFLOW_CREDENTIALS to Supabase secrets.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Dialogflow config:', { projectId, location, agentId });

    const credentials = JSON.parse(credentialsJson);
    
    // Generate OAuth2 token
    const tokenResponse = await getAccessToken(credentials);
    const accessToken = tokenResponse.access_token;

    // Create session path
    const session = sessionId || `session-${Date.now()}`;
    const sessionPath = `projects/${projectId}/locations/${location}/agents/${agentId}/sessions/${session}`;

    // Prepare request to Dialogflow CX
    const dialogflowUrl = `https://${location}-dialogflow.googleapis.com/v3/${sessionPath}:detectIntent`;
    
    const dialogflowRequest: any = {
      queryInput: {
        text: {
          text: message
        },
        languageCode: 'en'
      },
      // Enable audio output
      outputAudioConfig: {
        audioEncoding: 'OUTPUT_AUDIO_ENCODING_LINEAR_16',
        sampleRateHertz: 24000,
        synthesizeSpeechConfig: {
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0
        }
      }
    };

    console.log('Calling Dialogflow CX:', { sessionPath, message });

    const dialogflowResponse = await fetch(dialogflowUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dialogflowRequest)
    });

    if (!dialogflowResponse.ok) {
      const errorText = await dialogflowResponse.text();
      console.error('Dialogflow CX API error:', dialogflowResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Dialogflow CX API error',
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await dialogflowResponse.json();
    
    // Extract response messages
    const responseMessages = data.queryResult?.responseMessages || [];
    const textResponses = responseMessages
      .filter((msg: any) => msg.text?.text)
      .map((msg: any) => msg.text.text.join(' '))
      .join('\n');

    const aiResponse = textResponses || 'I apologize, but I could not process your request.';
    
    // Extract audio if available
    const audioContent = data.outputAudio || null;

    // Log conversation if conversationId provided
    if (conversationId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseClient
        .from('public_chat_messages')
        .insert({
          conversation_id: conversationId,
          message: aiResponse,
          sender_type: 'bot',
          metadata: {
            provider: 'dialogflow_cx',
            session_id: session,
            intent: data.queryResult?.intent?.displayName
          }
        });
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        sessionId: session,
        intent: data.queryResult?.intent?.displayName,
        confidence: data.queryResult?.intentDetectionConfidence,
        audioContent: audioContent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Dialogflow chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to get OAuth2 access token
async function getAccessToken(credentials: any): Promise<any> {
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  
  const jwtPayload = btoa(JSON.stringify(jwtClaimSet));
  const jwtUnsigned = `${jwtHeader}.${jwtPayload}`;
  
  // Import private key
  const privateKey = credentials.private_key;
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.substring(
    pemHeader.length,
    privateKey.length - pemFooter.length - 1
  );
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign JWT
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(jwtUnsigned)
  );
  
  const jwtSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const jwt = `${jwtUnsigned}.${jwtSignature}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  
  return await tokenResponse.json();
}
