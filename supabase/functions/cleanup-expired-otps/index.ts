import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Cleanup OTP function initializing...', new Date().toISOString())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting OTP cleanup...')
    
    // Delete expired OTPs
    const { data: expiredDeleted, error: expiredError } = await supabase
      .from('otp_codes')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (expiredError) {
      console.error('Error deleting expired OTPs:', expiredError)
    } else {
      console.log('Deleted expired OTPs')
    }

    // Delete old inconsistent format OTPs
    const { data: inconsistentDeleted, error: inconsistentError } = await supabase
      .from('otp_codes')
      .delete()
      .or('phone_number.like.0%,phone_number.like.+%')

    if (inconsistentError) {
      console.error('Error deleting inconsistent format OTPs:', inconsistentError)
    } else {
      console.log('Deleted inconsistent format OTPs')
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'OTP cleanup completed',
      expiredDeleted: (expiredDeleted as any)?.length || 0,
      inconsistentDeleted: (inconsistentDeleted as any)?.length || 0
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in cleanup function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

console.log('Cleanup OTP function ready to serve requests')
Deno.serve(handler)