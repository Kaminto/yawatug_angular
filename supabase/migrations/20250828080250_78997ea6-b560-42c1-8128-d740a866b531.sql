-- Add account_activation template to email_templates with correct column names
INSERT INTO email_templates (name, subject, html_content, text_content, template_type, is_active) 
VALUES (
  'account_activation', 
  'Activate Your Yawatu Account - Complete Registration',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #0E4D92;">Account Activation Required</h2>
    <p>Dear {{recipientName}},</p>
    <p>Your account has been created in the Yawatu Minerals & Mining system. To complete your registration and access your account, please click the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{activationUrl}}" style="background-color: #F9B233; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Activate Account</a>
    </div>
    <p>This link will allow you to:</p>
    <ul>
      <li>Set your password</li>
      <li>Access your share allocation details</li>
      <li>View your investment dashboard</li>
    </ul>
    <p>If you have any questions, please contact our support team.</p>
    <p>Best regards,<br>{{companyName}} Team</p>
  </div>',
  'Dear {{recipientName}},

Your account has been created in the Yawatu Minerals & Mining system. To complete your registration and access your account, please click the link below:

{{activationUrl}}

This link will allow you to:
- Set your password
- Access your share allocation details
- View your investment dashboard

If you have any questions, please contact our support team.

Best regards,
{{companyName}} Team',
  'account_activation',
  true
) ON CONFLICT (name) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  template_type = EXCLUDED.template_type,
  is_active = EXCLUDED.is_active,
  updated_at = now();