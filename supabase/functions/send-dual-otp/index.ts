import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

console.log('Dual OTP function initializing...', new Date().toISOString())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DualOTPRequest {
  phoneNumber: string;
  email: string;
  purpose: string;
  userId: string;
  transactionType?: string;
  amount?: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phoneNumber, email, purpose, userId, transactionType, amount }: DualOTPRequest = await req.json()
    
    // Validate input
    if (!phoneNumber || !email || !purpose || !userId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: phoneNumber, email, purpose, userId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Format phone number consistently
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    if (formattedPhone.length === 9 && formattedPhone.startsWith('7')) {
      formattedPhone = '256' + formattedPhone
    } else if (formattedPhone.length === 10 && formattedPhone.startsWith('07')) {
      formattedPhone = '256' + formattedPhone.substring(1)
    }

    // Check rate limiting
    const { data: rateLimitResult } = await supabase
      .rpc('check_sms_rate_limit', { 
        p_user_id: userId, 
        p_phone_number: formattedPhone 
      })

    if (!rateLimitResult) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please wait before requesting another code.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    
    console.log(`Generated dual OTP for ${formattedPhone}/${email}: ${otp}`)

    // Store OTP in database
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_codes')
      .insert({
        user_id: userId,
        phone_number: formattedPhone,
        otp_code: otp,
        purpose,
        expires_at: expiresAt.toISOString(),
        verification_method: 'dual' // Both SMS and email
      })
      .select()
      .single()

    if (otpError) {
      console.error('Error storing OTP:', otpError)
      return new Response(JSON.stringify({ error: 'Failed to generate OTP' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let smsStatus = 'pending'
    let emailStatus = 'pending'
    const results = { sms: false, email: false }

    // Send SMS
    const smsUsername = Deno.env.get('SMS_USERNAME') || Deno.env.get('EASYUGANDA_USER')
    const smsPassword = Deno.env.get('SMS_PASSWORD') || Deno.env.get('EASYUGANDA_PASSWORD')  
    const smsSender = Deno.env.get('SMS_SENDER') || Deno.env.get('EASYUGANDA_SENDER')
    
    if (smsUsername && smsPassword && smsSender) {
      try {
        const smsPhoneFormat = '+' + formattedPhone
        const message = `Your YAWATU verification code is: ${otp}. Valid for 10 minutes.`
        
        const formData = new URLSearchParams()
        formData.append('user', smsUsername)
        formData.append('password', smsPassword)
        formData.append('sender', smsSender)
        formData.append('reciever', smsPhoneFormat)
        formData.append('message', message)

        const smsResponse = await fetch('http://sms.easyuganda.net/api-sub.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        })

        const responseText = await smsResponse.text()
        if (smsResponse.ok && !responseText.includes('Invalid')) {
          smsStatus = 'sent'
          results.sms = true
          console.log('SMS sent successfully to', smsPhoneFormat)
        } else {
          smsStatus = 'failed'
          console.error('SMS send failed:', responseText)
        }
      } catch (smsError) {
        console.error('SMS send error:', smsError)
        smsStatus = 'failed'
      }
    }

    // Send Email
    if (resend) {
      try {
        const transactionInfo = amount ? ` for ${transactionType} of UGX ${amount.toLocaleString()}` : ''
        
        await resend.emails.send({
          from: 'YAWATU Security <admin@yawatug.com>',
          to: [email],
          subject: 'YAWATU Security Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0E4D92;">Security Verification Required</h2>
              <p>You have requested to verify your identity${transactionInfo}.</p>
              <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px;">
                <h3 style="margin: 0; font-size: 32px; color: #0E4D92; letter-spacing: 3px;">${otp}</h3>
                <p style="margin: 10px 0 0 0; color: #666;">This code expires in 10 minutes</p>
              </div>
              <p style="color: #666; font-size: 14px;">
                If you did not request this verification, please ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">
                YAWATU Minerals & Mining PLC<br>
                This is an automated message, please do not reply.
              </p>
            </div>
          `
        })
        
        emailStatus = 'sent'
        results.email = true
        console.log('Email sent successfully to', email)
      } catch (emailError) {
        console.error('Email send error:', emailError)
        emailStatus = 'failed'
      }
    }

    // Log delivery attempts
    await supabase
      .from('sms_delivery_logs')
      .insert({
        otp_id: otpRecord.id,
        phone_number: formattedPhone,
        message: `Dual OTP sent via SMS and Email. Code: ${otp}`,
        status: smsStatus,
        provider_response: { sms_status: smsStatus, email_status: emailStatus }
      })

    const successCount = (results.sms ? 1 : 0) + (results.email ? 1 : 0)
    
    if (successCount === 0) {
      return new Response(JSON.stringify({ 
        error: 'Failed to send verification code via both SMS and Email' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Verification code sent via ${results.sms && results.email ? 'SMS and Email' : results.sms ? 'SMS only' : 'Email only'}`,
      otpId: otpRecord.id,
      expiresAt: expiresAt.toISOString(),
      channels: results,
      // Include OTP for testing when neither service is configured
      ...((!smsUsername && !resend) ? { code: otp, testMode: true } : {})
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in send-dual-otp function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

console.log('Dual OTP function ready to serve requests')
Deno.serve(handler)