import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token } = await req.json();

    if (!token) {
      console.log('❌ No token provided in request');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Validating activation token:', token.substring(0, 10) + '...');

    // Call the enhanced validation function
    const { data: result, error } = await supabaseClient
      .rpc('validate_invitation_token_enhanced', { p_token: token });

    console.log('🔍 Validation result:', result);
    console.log('🔍 Validation error:', error);

    if (error) {
      console.error('❌ Database error during validation:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error during validation' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!result || !result.success) {
      console.log('❌ Token validation failed:', result?.error || 'Unknown error');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result?.error || 'Invalid or expired token'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Token validated successfully for user:', result.user_id);

    // Try to fetch the user profile for additional info, but allow success without it
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, email, account_activation_status')
      .eq('id', result.user_id)
      .single();

    console.log('👤 Profile lookup:', { profile, profileError });

    // Return success regardless of profile existence - imported users may not have profiles yet
    const responseData = { 
      success: true, 
      user_id: result.user_id,
      email: (result as any)?.email || (profile ? profile.email : null),
      full_name: (result as any)?.full_name || (profile ? profile.full_name : null),
      profile: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        activation_status: profile.account_activation_status
      } : null
    };

    if (profile) {
      console.log('✅ Validation complete - returning success for user with profile:', profile.full_name);
    } else {
      console.log('✅ Validation complete - returning success for user without profile (likely imported):', result.user_id);
    }

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Unexpected error in validation:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Server error during validation' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})