import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Test function initializing...', new Date().toISOString())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Test function called:', req.method, new Date().toISOString())
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Test environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment check:')
    console.log('- SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET')
    console.log('- SERVICE_ROLE_KEY:', serviceRoleKey ? 'SET' : 'NOT SET')
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required environment variables',
          details: {
            supabaseUrl: !!supabaseUrl,
            serviceRoleKey: !!serviceRoleKey
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Test Supabase client creation
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Test basic database connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Database test failed:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database connection failed',
          details: error.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Test function completed successfully')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test function working correctly',
        timestamp: new Date().toISOString(),
        environment: {
          supabaseUrl: !!supabaseUrl,
          serviceRoleKey: !!serviceRoleKey,
          databaseConnection: true
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('Test function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Function execution failed',
        details: (error as Error).message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

console.log('Test function ready to serve requests')
Deno.serve(handler)