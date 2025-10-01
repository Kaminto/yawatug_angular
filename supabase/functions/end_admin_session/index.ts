
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface EndAdminSessionParams {
  admin_user_id: string;
}

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { admin_user_id } = await req.json() as EndAdminSessionParams;

  try {
    // End any active admin sessions by setting ended_at to now
    const { data, error } = await supabase
      .from('admin_user_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('admin_id', admin_user_id)
      .is('ended_at', null);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Error ending admin session:", err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
