import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ActivationEmailRequest {
  email: string;
  fullName: string;
  activationUrl: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, activationUrl }: ActivationEmailRequest = await req.json();

    console.log('Sending activation email to:', email);

    // Use the unified communication sender (same as invitation emails)
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('unified-communication-sender', {
      body: {
        recipient: email,
        subject: 'Activate Your Yawatu Account',
        message: 'Welcome to Yawatu! Click the link below to activate your account.',
        channel: 'email',
        templateType: 'account_activation',
        templateData: {
          name: fullName,
          activationUrl: activationUrl
        }
      }
    });

    if (emailError) {
      console.error('Email sending error:', emailError);
      throw emailError;
    }

    console.log('Activation email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Activation email sent successfully',
        result: emailResult 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in send-activation-email:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send activation email' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});