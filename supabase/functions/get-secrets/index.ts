import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // SECURITY FIX: Verify JWT authentication and admin role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.user_role !== 'admin') {
      console.error('Unauthorized secret access attempt:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });
      
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { secretName } = await req.json();

    if (!secretName) {
      throw new Error('Secret name is required');
    }

    // SECURITY FIX: Whitelist allowed secret names to prevent arbitrary environment access
    const allowedSecrets = [
      'OPENAI_API_KEY',
      'RESEND_API_KEY', 
      'EASY_UGANDA_SMS_API_KEY',
      'PAYTOTA_API_KEY',
      'CLICKPESA_API_KEY',
      'SELCOM_API_KEY',
      'RELWORX_API_KEY',
      'GMAIL_APP_PASSWORD'
    ];

    if (!allowedSecrets.includes(secretName)) {
      console.error('Attempted access to non-whitelisted secret:', {
        secretName,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      return new Response(
        JSON.stringify({ error: `Access to secret '${secretName}' not allowed` }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the secret from environment variables
    const secret = Deno.env.get(secretName);

    if (!secret) {
      return new Response(
        JSON.stringify({ error: `Secret ${secretName} not found` }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log successful access for audit
    console.log('Secret accessed:', {
      secretName,
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ secret }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Secret access error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});