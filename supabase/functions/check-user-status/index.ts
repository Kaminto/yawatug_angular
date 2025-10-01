
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone } = await req.json();
    console.log('Checking user status for:', { email, phone });

    if (!email && !phone) {
      return new Response(
        JSON.stringify({ error: "Email or phone is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let profile = null;

    if (email) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, import_batch_id, account_activation_status')
        .eq('email', email)
        .maybeSingle();

      console.log('Profile lookup result:', { data, error });
      profile = data;
    } else if (phone) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, import_batch_id, account_activation_status')
        .eq('phone', phone)
        .maybeSingle();

      console.log('Profile lookup result:', { data, error });
      profile = data;
    }

    const result = {
      exists: !!profile,
      isImported: !!profile?.import_batch_id,
      needsActivation: profile?.import_batch_id && profile.account_activation_status !== 'activated',
      profile: profile ? {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name
      } : null
    };

    console.log('Returning result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
