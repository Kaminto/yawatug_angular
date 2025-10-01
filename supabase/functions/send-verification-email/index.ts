import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationEmailRequest {
  email: string;
  redirectUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send verification email function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectUrl }: VerificationEmailRequest = await req.json();
    
    if (!email) {
      throw new Error('Email is required');
    }

    console.log('Processing verification email for:', email);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Set up the redirect URL
    const finalRedirectUrl = redirectUrl || `${new URL(req.url).origin}/verify-email?email=${encodeURIComponent(email)}`;
    
    console.log('Redirect URL:', finalRedirectUrl);

    // Send verification email using Supabase Auth
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      password: 'temp-password-' + Math.random().toString(36),
      options: {
        redirectTo: finalRedirectUrl,
      },
    });

    if (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }

    console.log('Verification email sent successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Verification email sent successfully',
        data: {
          email: email,
          action_link: data.properties?.action_link,
          email_otp: data.properties?.email_otp,
          hashed_token: data.properties?.hashed_token,
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in send-verification-email function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send verification email' 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);