import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConsentEmailRequest {
  to: string;
  subject: string;
  html: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // New payload shape from frontend (preferred)
    if (body?.allocation_id && body?.member_email) {
      const consentUrl = `https://yawatug.com/club-consent?allocation_id=${encodeURIComponent(body.allocation_id)}`;

      console.log('Processing club consent invitation for:', body.member_email);
      console.log('Consent URL:', consentUrl);

      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('unified-communication-sender', {
        body: {
          recipient: body.member_email,
          subject: 'Yawatu Club Share Consent Invitation',
          message: 'Please review and complete your consent for allocated club shares.',
          channel: 'email',
          templateType: 'club_consent_invitation',
          templateData: {
            name: body.member_name,
            consentUrl,
            allocatedShares: body.allocated_shares,
            debtAmountSettled: body.debt_amount_settled,
            transferFeePaid: body.transfer_fee_paid,
            costPerShare: body.cost_per_share,
            totalCost: body.total_cost,
            allocationId: body.allocation_id,
          },
        },
      });

      if (emailError) throw emailError;

      return new Response(
        JSON.stringify({ success: true, message: 'Consent email sent', emailResponse }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Legacy payload fallback: { to, subject, html }
    if (body?.to && (body?.html || body?.subject)) {
      console.log(`Sending legacy consent email to: ${body.to}`);
      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('unified-communication-sender', {
        body: {
          recipient: body.to,
          subject: body.subject || 'Consent Email',
          message: 'Consent email',
          channel: 'email',
          templateType: 'custom_html',
          templateData: {
            html: body.html || '',
          },
        },
      });

      if (emailError) throw emailError;

      return new Response(
        JSON.stringify({ success: true, message: 'Consent email sent (legacy)', emailResponse }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in send-consent-email function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);