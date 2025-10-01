import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Send Dual Verification function initializing...', new Date().toISOString())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendVerificationRequest {
  userId: string;
  phoneNumber?: string;
  email?: string;
  purpose: string;
  method: 'sms' | 'email' | 'dual';
  transactionType?: string;
  amount?: number;
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
    const { userId, phoneNumber, email, purpose, method, transactionType, amount }: SendVerificationRequest = await req.json()
    
    // Validate input
    if (!userId || !purpose || !method) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: userId, purpose, method'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Sending verification:', { userId, method, purpose, phoneNumber: phoneNumber ? '***' + phoneNumber.slice(-4) : 'none', email: email ? '***' + email.slice(-10) : 'none' })

    let smsSuccess = false;
    let emailSuccess = false;
    let errors: string[] = [];

    // Send SMS verification if requested
    if ((method === 'sms' || method === 'dual') && phoneNumber) {
      try {
        const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
          body: {
            phoneNumber,
            message: `Your YAWATU verification code is: ${Math.floor(100000 + Math.random() * 900000)}. Valid for 10 minutes.`,
            purpose
          }
        });

        if (!smsError && smsData?.success) {
          smsSuccess = true;
          console.log('SMS OTP sent successfully');
        } else {
          const errorMsg = smsData?.error || smsError?.message || 'Unknown SMS error';
          console.error('SMS OTP failed:', errorMsg, smsData);
          errors.push(`SMS failed: ${errorMsg}`);
        }
      } catch (smsErr: any) {
        console.error('SMS send failed:', smsErr);
        errors.push(`SMS failed: ${smsErr?.message || 'Unknown SMS error'}`);
      }
    }

    // Send Email verification if requested
    if ((method === 'email' || method === 'dual') && email) {
      try {
        // Generate OTP for email
        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store email OTP in database first
        const { error: insertError } = await supabase
          .from('otp_codes')
          .insert({
            user_id: userId,
            phone_number: phoneNumber || 'email_verification',
            otp_code: emailOtp,
            purpose,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            verification_method: 'email',
            max_attempts: 3,
            attempt_count: 0,
            is_blocked: false,
            is_used: false
          });

        if (insertError) {
          console.error('Error storing email OTP:', insertError);
          errors.push(`Email OTP storage failed: ${insertError.message}`);
        } else {
          // Send email with OTP using Resend directly (like send-dual-otp)
          const resend = new (await import('https://esm.sh/resend@2.0.0')).Resend(Deno.env.get('RESEND_API_KEY'));
          
          try {
            const transactionInfo = amount ? ` for ${transactionType} of UGX ${amount.toLocaleString()}` : '';
            
            await resend.emails.send({
              from: 'YAWATU Security <admin@yawatug.com>',
              to: [email],
              subject: 'YAWATU Security Verification Code',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #0E4D92;">Security Verification Required</h2>
                  <p>You have requested to verify your identity${transactionInfo}.</p>
                  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px;">
                    <h3 style="margin: 0; font-size: 32px; color: #0E4D92; letter-spacing: 3px;">${emailOtp}</h3>
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
            });
            
            emailSuccess = true;
            console.log('Email OTP sent successfully using Resend');
          } catch (emailSendError: any) {
            console.error('Resend email error:', emailSendError);
            errors.push(`Email failed: ${emailSendError?.message || 'Unknown email error'}`);
            
            // Clean up the stored OTP if email failed
            await supabase
              .from('otp_codes')
              .delete()
              .eq('user_id', userId)
              .eq('otp_code', emailOtp)
              .eq('purpose', purpose);
          }
        }
      } catch (emailErr: any) {
        console.error('Email send failed:', emailErr);
        errors.push(`Email failed: ${emailErr?.message || 'Unknown email error'}`);
      }
    }

    // Determine success based on method
    const isSuccessful = 
      (method === 'sms' && smsSuccess) ||
      (method === 'email' && emailSuccess) ||
      (method === 'dual' && (smsSuccess || emailSuccess));

    if (isSuccessful) {
      const channelsUsed = [];
      if (smsSuccess) channelsUsed.push('SMS');
      if (emailSuccess) channelsUsed.push('Email');
      
      return new Response(JSON.stringify({ 
        success: true,
        message: `Verification code sent via ${channelsUsed.join(' and ')}`,
        channels_sent: channelsUsed,
        sms_success: smsSuccess,
        email_success: emailSuccess
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      return new Response(JSON.stringify({ 
        success: false,
        error: `Failed to send verification via ${method}`,
        details: errors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    console.error('Error in send-dual-verification function:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

console.log('Send Dual Verification function ready to serve requests')
Deno.serve(handler)