import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommunicationRequest {
  recipient: string;
  subject: string;
  message: string;
  channel: 'email' | 'sms' | 'both';
  templateType?: string;
  templateData?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('📧 Unified Communication Sender - Request received');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📧 Request body received:', JSON.stringify(requestBody, null, 2));
    
    const {
      recipient,
      subject,
      message,
      channel,
      templateType,
      templateData,
      otpRequest
    }: CommunicationRequest & { otpRequest?: any } = requestBody;

    if (!recipient || !message || !channel) {
      console.error('❌ Missing required fields:', { recipient, message, channel });
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: recipient, message, and channel are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    console.log('📧 Initializing services...');
    
    // Initialize Resend for email sending
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not found');
      return new Response(JSON.stringify({
        success: false,
        error: 'Email service not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const resend = new Resend(resendApiKey);
    
    // Initialize Supabase client for server-side operations (use service role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase credentials not found');
      return new Response(JSON.stringify({
        success: false,
        error: 'Database service not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: any = {};
    let otpCode: string | null = null;

    // Normalize recipients (support comma-separated "email,phone" for dual)
    const isDual = channel === 'both';
    const recipientParts = recipient?.includes(',') ? recipient.split(',').map((s) => s.trim()) : [recipient];
    const emailRecipient = isDual ? recipientParts[0] : (channel === 'email' ? recipientParts[0] : undefined);
    const smsRecipient = isDual ? recipientParts[1] : (channel === 'sms' ? recipientParts[0] : undefined);

    // Generate OTP if requested
    if (otpRequest && otpRequest.generateOTP) {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Format phone number for storage (same format as verify-sms-otp expects)
      let formattedPhone = null;
      if (smsRecipient) {
        formattedPhone = smsRecipient.replace(/\D/g, ''); // Remove all non-digits
        if (formattedPhone.length === 9 && formattedPhone.startsWith('7')) {
          formattedPhone = '256' + formattedPhone;
        } else if (formattedPhone.length === 10 && formattedPhone.startsWith('07')) {
          formattedPhone = '256' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('256') && formattedPhone.length > 7) {
          formattedPhone = '256' + formattedPhone.replace(/^0+/, '');
        }
      }
      
      // Store OTP in database - but don't fail if this fails
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      console.log('📝 Storing OTP in database:', {
        user_id: otpRequest.userId,
        purpose: otpRequest.purpose,
        formattedPhone: formattedPhone,
        expiresAt: expiresAt.toISOString()
      });
      
      const { error: otpError } = await supabase
        .from('otp_codes')
        .insert({
          user_id: otpRequest.userId,
          otp_code: otpCode,
          purpose: otpRequest.purpose || 'transaction_verification',
          phone_number: formattedPhone,
          expires_at: expiresAt.toISOString(),
          is_used: false,
          is_blocked: false
        });

      if (otpError) {
        console.error('Warning: Failed to store OTP in database:', otpError);
        // Continue with sending - the OTP will still work for message content
        // Just won't be stored for verification purposes
      } else {
        console.log('✅ OTP stored successfully in database');
      }
    }

    // Handle email sending
    if (channel === 'email' || channel === 'both') {
      console.log('📧 Processing email channel...');
      try {
        let emailContent = message;
        
        // Replace OTP template placeholders if templateData contains OTP or if OTP was generated
        if ((templateData && templateData.otp) || otpCode) {
          const otp = templateData?.otp || otpCode;
          emailContent = emailContent.replace(/\[OTP_CODE\]/g, otp);
          console.log('📧 OTP replaced in email content');
        }
        
        // Determine email recipient
        const toEmail = emailRecipient || recipientParts[0];
        console.log('📧 Sending to email:', toEmail);
        
        // Enhanced email content for activation
        if (templateType === 'account_activation' && templateData) {
          console.log('📧 Using account activation template');
          emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">Welcome to YAWATU</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Ethical Gold Mining Investment Platform</p>
              </div>
              
              <div style="padding: 30px; background: white;">
                <h2 style="color: #1e40af; margin-bottom: 20px;">Activate Your Account</h2>
                
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Welcome to YAWATU! Your investment club membership has been imported into our new digital platform. 
                  To get started with your investment journey, please activate your account.
                </p>
                
                <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; color: #1e40af;">Your Account Details:</p>
                  <p style="margin: 5px 0;">Email: ${templateData.email}</p>
                  <p style="margin: 5px 0;">Name: ${templateData.name || 'Valued Member'}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${templateData.activationUrl}" 
                     style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Activate Account Now
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  If the button above doesn't work, copy and paste this link into your browser:<br>
                  <a href="${templateData.activationUrl}" style="color: #3b82f6; word-break: break-all;">${templateData.activationUrl}</a>
                </p>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                  This activation link will expire in 24 hours. If you didn't request this, please ignore this email.
                </p>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                <p>© 2024 YAWATU Minerals & Mining PLC. All rights reserved.</p>
                <p>Ethical Gold Mining Investment Platform</p>
              </div>
            </div>
          `;
        }

        // Enhanced email content for consent invitation
        if ((templateType === 'consent_invitation' || templateType === 'club_consent_invitation') && templateData) {
          const consentUrl = `https://yawatug.com/formal-consent?token=${templateData.club_allocation_id}`;
          
          emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0E4D92, #F9B233); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">YAWATU MINERALS & MINING PLC</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Investment Club Share Allocation</p>
              </div>
              
              <div style="padding: 30px; background: white;">
                <h2 style="color: #0E4D92; margin-bottom: 20px;">Consent Required for Share Allocation</h2>
                
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Dear ${templateData.member_name || templateData.name},
                </p>
                
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  You have been allocated ${templateData.allocated_shares} shares through our Investment Club debt conversion program. 
                  Your consent is required to proceed with this allocation.
                </p>
                
                <div style="background: #f8fafc; border-left: 4px solid #0E4D92; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; color: #0E4D92;">Allocation Details:</p>
                  <p style="margin: 5px 0;">Allocated Shares: ${templateData.allocated_shares}</p>
                  <p style="margin: 5px 0;">Debt Amount Settled: UGX ${(templateData.debt_amount || 0).toLocaleString()}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${consentUrl}" 
                     style="background: #F9B233; color: #0E4D92; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Review & Give Consent
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  If the button above doesn't work, copy and paste this link into your browser:<br>
                  <a href="${consentUrl}" style="color: #0E4D92; word-break: break-all;">${consentUrl}</a>
                </p>
                
                <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                  This consent request will expire in 30 days. Please respond as soon as possible.
                </p>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                <p>© 2024 YAWATU Minerals & Mining PLC. All rights reserved.</p>
                <p>Ethical Gold Mining Investment Platform</p>
              </div>
            </div>
          `;
        }

        console.log('📧 Preparing to send email via Resend...');
        const emailResult = await resend.emails.send({
          from: 'YAWATU <admin@yawatug.com>',
          to: [toEmail],
          subject: subject || 'YAWATU Notification',
          html: emailContent,
        });

        console.log('📧 Resend API response:', JSON.stringify(emailResult, null, 2));

        if (emailResult.error) {
          console.error('📧 Resend API error:', emailResult.error);
          results.email = { 
            success: false, 
            error: emailResult.error.message || 'Failed to send email',
            error_details: emailResult.error
          };
        } else {
          console.log('✅ Email sent successfully');
          results.email = { 
            success: true, 
            messageId: emailResult.data?.id,
            details: emailResult,
            resend_response: emailResult
          };
        }
      } catch (emailError: any) {
        console.error('📧 Email sending error:', emailError);
        console.error('📧 Email error details:', JSON.stringify(emailError, null, 2));
        results.email = { 
          success: false, 
          error: emailError.message || 'Failed to send email',
          error_details: emailError
        };
      }
    }

    // Handle SMS sending
    if (channel === 'sms' || channel === 'both') {
      console.log('📱 Processing SMS channel...');
      try {
        let smsMessage = message;
        
        // Replace OTP template placeholders if templateData contains OTP or if OTP was generated
        if ((templateData && templateData.otp) || otpCode) {
          const otp = templateData?.otp || otpCode;
          smsMessage = smsMessage.replace(/\[OTP_CODE\]/g, otp);
          console.log('📱 OTP replaced in SMS content');
        }
        
        // Handle comma-separated recipients for dual channel
        const smsRecipients = channel === 'both' && recipient.includes(',') 
          ? recipient.split(',')[1].trim()  // Get phone from "email,phone"
          : recipient;
        
        console.log('📱 Sending SMS to:', smsRecipients);
        console.log('📱 SMS message:', smsMessage);
        
        // Get authorization header from incoming request
        const authHeader = req.headers.get('authorization');
        
        const smsResult = await supabase.functions.invoke('send-sms', {
          headers: {
            Authorization: authHeader || `Bearer ${supabaseServiceKey}`
          },
          body: {
            phoneNumber: smsRecipients,
            message: smsMessage,
            purpose: templateType || 'general'
          }
        });

        console.log('📱 SMS result:', JSON.stringify(smsResult, null, 2));

        if (smsResult.error) {
          console.error('📱 SMS error:', smsResult.error);
          throw new Error(smsResult.error.message || 'SMS service error');
        }

        console.log('✅ SMS sent successfully');
        results.sms = {
          success: true,
          messageId: smsResult.data?.messageId,
          details: smsResult.data
        };
      } catch (smsError: any) {
        console.error('📱 SMS sending error:', smsError);
        results.sms = {
          success: false,
          error: smsError.message || 'Failed to send SMS'
        };
      }
    }

    const emailOk = results.email?.success === true;
    const smsOk = results.sms?.success === true;
    const overallSuccess = channel === 'email' ? emailOk : channel === 'sms' ? smsOk : (emailOk || smsOk);

    console.log('📊 Final results:', {
      channel,
      emailOk,
      smsOk,
      overallSuccess,
      results
    });

    const response = {
      success: overallSuccess,
      results,
      message: overallSuccess ? 'Communication sent successfully' : 'Communication failed',
      debug: {
        channel,
        emailRequested: channel === 'email' || channel === 'both',
        smsRequested: channel === 'sms' || channel === 'both',
        emailSuccess: emailOk,
        smsSuccess: smsOk
      }
    };

    console.log('✅ Sending response:', JSON.stringify(response, null, 2));

    return new Response(JSON.stringify(response), {
      status: overallSuccess ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('❌ Communication sender error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    
    const errorResponse = {
      success: false,
      error: error.message || 'Failed to send communication',
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
    
    console.log('❌ Sending error response:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
};

serve(handler);