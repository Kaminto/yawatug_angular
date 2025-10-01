
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Admin Create User function initializing...', new Date().toISOString())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Admin Create User function called:', req.method, new Date().toISOString())
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')

    if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const body = await req.json()
    const { email, password, full_name, phone, account_type, user_role, status } = body

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing email or password' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Creating user:', { email, full_name, account_type, user_role })

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Create user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (error || !data.user) {
      console.error('Failed to create user:', error)
      return new Response(
        JSON.stringify({ error: error?.message || 'Failed to create user' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('User created successfully:', data.user.id)

    // Update the new profile with the provided fields
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        phone,
        account_type,
        user_role,
        status,
        email,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.user.id)

    if (profileError) {
      console.error('Failed to update profile:', profileError)
      return new Response(
        JSON.stringify({ error: profileError.message || 'Failed to update profile' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Profile updated successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        user: data.user,
        message: 'User created successfully'
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in admin-create-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: (error as Error).message
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

console.log('Admin Create User function ready to serve requests')
Deno.serve(handler)
