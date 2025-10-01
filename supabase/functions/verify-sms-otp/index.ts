import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Verify SMS OTP function initializing...', new Date().toISOString())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyOTPRequest {
  userId: string;
  otp: string;
  phoneNumber: string;
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
    const { userId, otp, phoneNumber, purpose }: VerifyOTPRequest = await req.json()
    
    // Format phone number consistently (same as in send-sms-otp)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove all non-digits
    if (formattedPhone.length === 9 && formattedPhone.startsWith('7')) {
      formattedPhone = '256' + formattedPhone;
    } else if (formattedPhone.length === 10 && formattedPhone.startsWith('07')) {
      formattedPhone = '256' + formattedPhone.substring(1);
    } else if (formattedPhone.length === 12 && formattedPhone.startsWith('256')) {
      // Already in correct format
    } else if (formattedPhone.startsWith('256')) {
      // Handle cases where it might be missing leading digits
      formattedPhone = formattedPhone;
    }

    // Validate input - userId is optional for phone-only verification
    if (!otp || !phoneNumber || !purpose) {
      return new Response(JSON.stringify({ 
        success: false,
        verified: false,
        error: 'Missing required fields: otp, phoneNumber, purpose' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Verifying OTP:', { userId, otp, phoneNumber: '[hidden]', formattedPhone: '[hidden]', purpose })

    // Find valid OTP record using formatted phone and optionally userId
    let query = supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('purpose', purpose)
      .eq('is_used', false)
      .eq('is_blocked', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    // Add userId filter if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: otpRecord, error: otpError } = await query.single();

    if (otpError || !otpRecord) {
      console.error('OTP record not found or expired:', otpError)
      return new Response(JSON.stringify({ 
        success: false,
        verified: false,
        error: 'Invalid or expired verification code'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if OTP matches
    if (otpRecord.otp_code !== otp) {
      // Increment attempt count
      await supabase
        .from('otp_codes')
        .update({ 
          attempt_count: (otpRecord.attempt_count || 0) + 1,
          is_blocked: (otpRecord.attempt_count || 0) >= 2 // Block after 3 attempts
        })
        .eq('id', otpRecord.id)

      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid verification code',
        verified: false,
        remaining_attempts: Math.max(0, 2 - (otpRecord.attempt_count || 0))
      }), {
        status: 200,
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
      return new Response(JSON.stringify({ error: 'Failed to verify OTP' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('OTP verified successfully for user:', userId)

    return new Response(JSON.stringify({ 
      success: true,
      verified: true,
      message: 'Phone number verified successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in verify-sms-otp function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

console.log('Verify SMS OTP function ready to serve requests')
Deno.serve(handler)