import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as OTPAuth from 'https://esm.sh/otpauth@9.2.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyTOTPRequest {
  userId: string
  token: string
  secret?: string
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, token, secret }: VerifyTOTPRequest = await req.json()

    if (!userId || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let secretToUse = secret
    
    // If no secret provided, get it from database
    if (!secretToUse) {
      const { data: authData, error: authError } = await supabase
        .from('two_factor_auth')
        .select('google_auth_secret')
        .eq('user_id', userId)
        .eq('google_auth_enabled', true)
        .single()

      if (authError || !authData?.google_auth_secret) {
        return new Response(
          JSON.stringify({ error: 'Google Authenticator not set up' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      secretToUse = authData.google_auth_secret
    }

    // Verify TOTP token using OTPAuth
    const totp = new OTPAuth.TOTP({
      secret: secretToUse,
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    })
    
    const isValid = totp.validate({ token: token, window: 1 }) !== null

    return new Response(
      JSON.stringify({ 
        verified: isValid,
        message: isValid ? 'Token verified successfully' : 'Invalid token'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error verifying TOTP:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

console.log('TOTP verification function ready')
serve(handler)