import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('Cleanup function called with method:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check for authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authorization header required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the user with the provided token
    const token = authHeader.replace('Bearer ', '')
    console.log('Verifying user token...')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    console.log('User authenticated:', user.email)

    // Check if user has admin permissions
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_role, user_type')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError.message)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to verify user permissions'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const isAdmin = profile?.user_role === 'admin' || profile?.user_type === 'admin'
    console.log('User admin status:', isAdmin, 'Profile:', profile)
    
    if (!isAdmin) {
      console.error('User is not an admin')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Admin permissions required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    console.log('Admin verified, starting analysis...')

    // Get all auth users using a more robust approach
    console.log('Fetching all auth users...')
    let allAuthUsers = []
    let page = 1
    const pageSize = 1000
    
    while (true) {
      const { data: authData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: pageSize
      })
      
      if (usersError) {
        console.error('Error fetching auth users:', usersError.message)
        throw new Error(`Failed to fetch auth users: ${usersError.message}`)
      }

      allAuthUsers.push(...authData.users)
      
      if (authData.users.length < pageSize) {
        break // No more pages
      }
      
      page++
    }

    console.log(`Found ${allAuthUsers.length} total auth users`)

    // Get all profile IDs
    console.log('Fetching all profiles...')
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError.message)
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    const profileIds = new Set(profiles?.map(p => p.id) || [])
    console.log(`Found ${profileIds.size} profiles`)

    // Find orphaned auth users
    const orphanedUsers = allAuthUsers.filter(user => !profileIds.has(user.id))
    console.log(`Found ${orphanedUsers.length} orphaned auth users`)

    const results = {
      total_auth_users: allAuthUsers.length,
      total_profiles: profileIds.size,
      orphaned_users_count: orphanedUsers.length,
      orphaned_users_list: orphanedUsers.map(user => user.email || user.id),
      removed_users: [] as string[],
      errors: [] as string[],
      recommendation: orphanedUsers.length > 0 
        ? `Found ${orphanedUsers.length} orphaned auth users that can be cleaned up`
        : 'No orphaned auth users found - database is clean'
    }

    // Remove orphaned users if any found
    if (orphanedUsers.length > 0) {
      console.log('Starting cleanup process...')
      for (const orphanUser of orphanedUsers) {
        try {
          console.log(`Attempting to remove user: ${orphanUser.email} (${orphanUser.id})`)
          
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(orphanUser.id)
          
          if (deleteError) {
            console.error(`Failed to delete user ${orphanUser.email}:`, deleteError.message)
            results.errors.push(`${orphanUser.email || orphanUser.id}: ${deleteError.message}`)
          } else {
            console.log(`Successfully removed user: ${orphanUser.email}`)
            results.removed_users.push(orphanUser.email || orphanUser.id)
          }
        } catch (error) {
          console.error(`Exception while deleting user ${orphanUser.email}:`, error)
          results.errors.push(`${orphanUser.email || orphanUser.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    console.log('Cleanup completed. Results:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cleanup completed successfully',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Unhandled error in cleanup function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})