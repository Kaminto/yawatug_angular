
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.20.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // This endpoint requires a POST request
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create Supabase client with service role key (to bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const { email, password } = await req.json();

    // Validate email
    if (email !== "yawatu256@gmail.com") {
      return new Response(
        JSON.stringify({ error: "Only the specified admin email is allowed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user already exists
    const { data: existingUsers, error: lookupError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email);

    if (lookupError) {
      throw lookupError;
    }

    let userId;

    if (existingUsers && existingUsers.length > 0) {
      // User exists, update profile to admin
      userId = existingUsers[0].id;
      
      // Update their user_type to admin
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          user_type: "admin",
          is_first_login: true,
          status: "active",
          is_verified: true
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }
      
      console.log(`Updated existing user ${email} to admin`);
    } else {
      // Create new admin user
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto confirm email
      });

      if (createError) {
        throw createError;
      }

      userId = authData.user.id;
      
      // Set profile data
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          user_type: "admin",
          full_name: "Yawatu Admin",
          is_first_login: true,
          status: "active",
          is_verified: true
        })
        .eq("id", userId);

      if (profileError) {
        throw profileError;
      }
      
      console.log(`Created new admin user ${email}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin account set up successfully",
        userId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error setting up admin:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to set up admin account", 
        details: (error as Error).message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
