import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Verify Dual OTP function initializing...', new Date().toISOString())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyDualOTPRequest {
  userId: string;
  otp: string;
  phoneNumber?: string;
  purpose: string;
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
    const { userId, otp, phoneNumber, purpose }: VerifyDualOTPRequest = await req.json()
    
    // Validate input
    if (!userId || !otp || !purpose) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: userId, otp, purpose' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Format phone number if provided (for additional security)
    let formattedPhone = null
    if (phoneNumber) {
      formattedPhone = phoneNumber.replace(/\D/g, '')
      if (formattedPhone.length === 9 && formattedPhone.startsWith('7')) {
        formattedPhone = '256' + formattedPhone
      } else if (formattedPhone.length === 10 && formattedPhone.startsWith('07')) {
        formattedPhone = '256' + formattedPhone.substring(1)
      }
    }

    console.log('Verifying Dual OTP:', { userId, otp: otp.substring(0, 2) + '****', purpose, formattedPhone })

    // Find valid OTP record - search by user_id and purpose primarily
    let query = supabase
      .from('otp_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .eq('is_used', false)
      .eq('is_blocked', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    // If phone number is provided, add it as additional filter for extra security
    if (formattedPhone) {
      query = query.eq('phone_number', formattedPhone)
    }

    const { data: otpRecord, error: otpError } = await query.single()

    if (otpError || !otpRecord) {
      console.error('OTP record not found or expired:', otpError)
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired verification code',
        success: false,
        verified: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if OTP matches
    if (otpRecord.otp_code !== otp.trim()) {
      const newAttemptCount = (otpRecord.attempt_count || 0) + 1
      const maxAttempts = otpRecord.max_attempts || 3
      
      // Increment attempt count and check if should block
      await supabase
        .from('otp_codes')
        .update({ 
          attempt_count: newAttemptCount,
          is_blocked: newAttemptCount >= maxAttempts
        })
        .eq('id', otpRecord.id)

      const remainingAttempts = Math.max(0, maxAttempts - newAttemptCount)
      
      return new Response(JSON.stringify({ 
        error: newAttemptCount >= maxAttempts 
          ? 'Verification code blocked due to too many failed attempts'
          : 'Invalid verification code',
        success: false,
        verified: false,
        remaining_attempts: remainingAttempts,
        blocked: newAttemptCount >= maxAttempts
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from('otp_codes')
      .update({ 
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id)

    if (updateError) {
      console.error('Error marking OTP as used:', updateError)
      return new Response(JSON.stringify({ 
        error: 'Failed to verify OTP',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Dual OTP verified successfully for user:', userId)

    return new Response(JSON.stringify({ 
      success: true,
      verified: true,
      message: 'Verification code verified successfully',
      verification_method: otpRecord.verification_method || 'dual'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in verify-dual-otp function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

console.log('Verify Dual OTP function ready to serve requests')
Deno.serve(handler)