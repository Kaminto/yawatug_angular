import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const demoEmail = 'demo@yawatug.com'
    const demoPassword = 'DemoPassword123!'

    // Check if user already exists by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    
    const existingUser = users?.find(u => u.email === demoEmail)

    if (!existingUser) {
      // Create the auth user
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Demo User'
        }
      })

      if (createError) {
        console.error('Error creating auth user:', createError)
        throw createError
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email: demoEmail,
          full_name: 'Demo User',
          phone: '+256701234567',
          account_type: 'individual',
          nationality: 'Uganda',
          country_of_residence: 'Uganda',
          status: 'active',
          user_role: 'user',
          is_demo_account: true
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        throw profileError
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Demo user created successfully',
          userId: authUser.user.id 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // User exists, update password to ensure it's correct
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: demoPassword,
          email_confirm: true 
        }
      )

      if (updateError) {
        console.error('Error updating user password:', updateError)
        throw updateError
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Demo user password updated',
          userId: existingUser.id 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in create-demo-user function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})