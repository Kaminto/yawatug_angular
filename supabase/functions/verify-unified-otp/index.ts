import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Verify Unified OTP function initializing...', new Date().toISOString())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyOTPRequest {
  userId: string;
  otp: string;
  purpose: string;
  phoneNumber?: string;
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
    const { userId, otp, purpose, phoneNumber }: VerifyOTPRequest = await req.json()

    // Validate input
    if (!userId || !otp || !purpose) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: userId, otp, purpose' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Verifying OTP:', { userId, otp: otp.slice(0,2) + '****', purpose })

    // Find valid OTP record - check both SMS and email verification methods
    const { data: otpRecords, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('purpose', purpose)
      .eq('is_used', false)
      .eq('is_blocked', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('OTP query result:', { 
      found: otpRecords?.length || 0, 
      error: otpError,
      searchCriteria: { userId, purpose }
    });

    if (otpError) {
      console.error('Database error during OTP lookup:', otpError)
      return new Response(JSON.stringify({ 
        error: 'Database error occurred',
        verified: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!otpRecords || otpRecords.length === 0) {
      console.log('No OTP records found for criteria')
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired verification code',
        verified: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find matching OTP
    const otpRecord = otpRecords.find(record => record.otp_code === otp);
    
    if (!otpRecord) {
      console.log('OTP code mismatch. Available OTPs:', otpRecords.map(r => ({ 
        id: r.id, 
        otp: r.otp_code?.slice(0,2) + '****',
        created: r.created_at 
      })));
      
      return new Response(JSON.stringify({ 
        error: 'Invalid verification code',
        verified: false
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
      return new Response(JSON.stringify({ error: 'Failed to verify OTP' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('OTP verified successfully for user:', userId, 'method:', otpRecord.verification_method)

    return new Response(JSON.stringify({ 
      verified: true,
      message: 'Verification code verified successfully',
      verification_method: otpRecord.verification_method
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in verify-unified-otp function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

console.log('Verify Unified OTP function ready to serve requests')
Deno.serve(handler)