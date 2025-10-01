-- Add account_activation template to email_templates with correct column structure
INSERT INTO email_templates (name, subject, template_body, template_type, is_active) 
VALUES (
  'account_activation', 
  'Activate Your Yawatu Account - Complete Registration',
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
  template_body = EXCLUDED.template_body,
  template_type = EXCLUDED.template_type,
  is_active = EXCLUDED.is_active,
  updated_at = now();