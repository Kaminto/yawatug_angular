-- Simplify email template to use single activation link
UPDATE email_templates 
SET 
  subject = 'Activate Your Yawatu Account',
  html_content = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #0E4D92; margin-bottom: 10px;">Welcome to Yawatu!</h1>
      <h2 style="color: #F9B233; margin-top: 0;">Account Activation Required</h2>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6;">Dear {{recipientName}},</p>
    
    <p style="font-size: 16px; line-height: 1.6;">
      Thank you for joining Yawatu Minerals & Mining PLC. To complete your registration and access your investment dashboard, please activate your account by clicking the button below:
    </p>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="{{activationUrl}}" 
         style="background-color: #F9B233; color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        ✓ Activate My Account
      </a>
    </div>
    
    <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: #0E4D92; margin-top: 0;">Once activated, you can:</h3>
      <ul style="color: #333; line-height: 1.8;">
        <li>Access your personalized investment dashboard</li>
        <li>View your share allocation details</li>
        <li>Monitor your investment portfolio</li>
        <li>Receive important updates and reports</li>
      </ul>
    </div>
    
    <p style="font-size: 14px; color: #666; line-height: 1.6;">
      <strong>Note:</strong> This link will expire in 24 hours for security reasons. If you need a new activation link, please contact our support team.
    </p>
    
    <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px;">
      <p style="font-size: 14px; color: #666;">
        If the button above doesn''t work, you can copy and paste this link into your browser:<br>
        <a href="{{activationUrl}}" style="color: #0E4D92; word-break: break-all;">{{activationUrl}}</a>
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="margin: 0; color: #666;">Best regards,<br><strong>{{companyName}} Team</strong></p>
    </div>
  </div>',
  text_content = 'Welcome to Yawatu Minerals & Mining PLC!

Dear {{recipientName}},

Thank you for joining us. To complete your registration and access your investment dashboard, please activate your account using the link below:

{{activationUrl}}

Once activated, you can:
- Access your personalized investment dashboard
- View your share allocation details  
- Monitor your investment portfolio
- Receive important updates and reports

This link will expire in 24 hours for security reasons.

If you have any questions, please contact our support team.

Best regards,
{{companyName}} Team'
WHERE template_type = 'account_activation';