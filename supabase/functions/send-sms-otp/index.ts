import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('SMS OTP function initializing...', new Date().toISOString())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSOTPRequest {
  phoneNumber: string;
  purpose: string;
  userId: string;
  transactionType?: string;
  amount?: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check SMS credentials - try multiple possible names
    const smsUsername = Deno.env.get('SMS_USERNAME') || Deno.env.get('SMS_USER') || Deno.env.get('EASYUGANDA_USER')
    const smsPassword = Deno.env.get('SMS_PASSWORD') || Deno.env.get('EASYUGANDA_PASSWORD')  
    const smsSender = Deno.env.get('SMS_SENDER') || Deno.env.get('EASYUGANDA_SENDER')
    
    console.log('SMS credentials check:', {
      username: !!smsUsername,
      password: !!smsPassword, 
      sender: !!smsSender
    })

    const { phoneNumber, purpose, userId, transactionType, amount }: SMSOTPRequest = await req.json();
    
    // Format phone number consistently (remove + and ensure Uganda format)
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
    
    console.log('Request payload:', { phoneNumber, formattedPhone, purpose, userId, transactionType, amount });

    // Validate input
    if (!phoneNumber || !purpose || !userId) {
      console.log('Validation failed: missing required fields');
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: phoneNumber, purpose, userId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Checking rate limit for user:', userId, 'phone:', formattedPhone);
    // Check rate limiting
    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc('check_sms_rate_limit', { 
        p_user_id: userId, 
        p_phone_number: formattedPhone 
      });

    console.log('Rate limit check result:', { rateLimitResult, rateLimitError });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      return new Response(JSON.stringify({ error: 'Rate limit check failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!rateLimitResult) {
      console.log('Rate limit exceeded');
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please wait before requesting another code.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    console.log('Generated OTP:', otp, 'expires at:', expiresAt);

    console.log('Inserting OTP into database...');
    // Store OTP in database
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_codes')
      .insert({
        user_id: userId,
        phone_number: formattedPhone, // Use consistently formatted phone
        otp_code: otp,
        purpose,
        expires_at: expiresAt.toISOString(),
        verification_method: 'sms'
      })
      .select()
      .single();

    console.log('OTP insert result:', { otpRecord, otpError });

    if (otpError) {
      console.error('Error storing OTP:', otpError);
      return new Response(JSON.stringify({ error: 'Failed to generate OTP' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the OTP for development (remove in production)
    console.log(`SMS OTP for ${formattedPhone}: ${otp} (Purpose: ${purpose})`);

    // Send SMS if credentials are available
    let smsStatus = 'pending'
    if (smsUsername && smsPassword && smsSender) {
      try {
        // Format phone number for SMS API (needs +256 prefix)
        let smsPhoneFormat = '+' + formattedPhone; // Add + for SMS API

        const message = `Your YAWATU verification code is: ${otp}. Valid for 10 minutes.`
        
        const formData = new URLSearchParams()
        formData.append('user', smsUsername)
        formData.append('password', smsPassword)
        formData.append('sender', smsSender)
        formData.append('reciever', smsPhoneFormat)
        formData.append('message', message)

        console.log('Sending SMS to:', smsPhoneFormat, 'with credentials:', {
          user: smsUsername,
          sender: smsSender,
          messageLength: message.length
        })

        const smsResponse = await fetch('http://sms.easyuganda.net/api-sub.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
        })

        const responseText = await smsResponse.text()
        console.log('SMS API response:', {
          status: smsResponse.status,
          ok: smsResponse.ok,
          text: responseText
        })

        if (smsResponse.ok && !responseText.includes('Invalid')) {
          smsStatus = 'sent'
          console.log('SMS sent successfully to', smsPhoneFormat)
        } else {
          smsStatus = 'failed'
          console.error('SMS send failed:', responseText)
        }
      } catch (smsError) {
        console.error('SMS send error:', smsError)
        smsStatus = 'failed'
      }
    } else {
      console.error('SMS credentials missing:', {
        username: !!smsUsername,
        password: !!smsPassword,
        sender: !!smsSender
      })
      smsStatus = 'failed'
    }

    // Create delivery log with actual status
    await supabase
      .from('sms_delivery_logs')
      .insert({
        otp_id: otpRecord.id,
        phone_number: formattedPhone,
        message: `Your verification code is: ${otp}. Valid for 10 minutes.`,
        status: smsStatus
      })

    return new Response(JSON.stringify({ 
      success: smsStatus === 'sent', 
      message: smsStatus === 'sent' ? 'SMS sent successfully' : 
               smsStatus === 'failed' ? 'SMS failed to send - credentials may be missing or invalid' : 
               'OTP generated but SMS credentials not configured',
      otpId: otpRecord.id,
      expiresAt: expiresAt.toISOString(),
      sms_status: smsStatus,
      // Include OTP for testing when SMS not sent
      ...(!smsUsername && { code: otp, testMode: true })
    }), {
      status: 200, // Always return 200, use success flag to indicate SMS status
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-sms-otp function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

console.log('SMS OTP function ready to serve requests')
Deno.serve(handler)