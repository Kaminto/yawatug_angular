import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationEmailRequest {
  email: string;
  full_name: string;
  invitation_token: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, invitation_token }: InvitationEmailRequest = await req.json();

    console.log('Processing invitation email for:', email);
    console.log('Token received (first 10 chars):', invitation_token.substring(0, 10) + '...');

    // Always use production domain for activation emails - CRITICAL FIX
    const activationUrl = `https://yawatug.com/activate-account?token=${encodeURIComponent(invitation_token)}`;
    
    console.log('Generated activation URL:', activationUrl);

    // Call the unified communication sender function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: emailResponse, error: emailError } = await supabase.functions.invoke('unified-communication-sender', {
      body: {
        recipient: email,
        subject: 'Activate Your Yawatu Account',
        message: 'Welcome to Yawatu! Click the link below to activate your account.',
        channel: 'email',
        templateType: 'account_activation',
        templateData: {
          name: full_name,
          activationUrl: activationUrl
        }
      }
    });

    if (emailError) {
      console.error('Email sending failed:', emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailError.message || 'Failed to send invitation email' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Invitation email sent successfully to:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation email sent successfully',
        activationUrl: activationUrl
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-invitation-email function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);