-- Fix SMS Provider Configuration - Update existing or insert new
INSERT INTO sms_providers (
  provider_name, provider_type, api_endpoint, cost_per_sms, priority_order, 
  is_active, rate_limit_per_minute, timeout_seconds, retry_attempts, configuration
) VALUES (
  'EasyUganda', 
  'api',
  'http://sms.easyuganda.net/api-sub.php', 
  50.0, 
  1,
  true,
  10,
  30,
  3,
  jsonb_build_object(
    'method', 'POST',
    'timeout_seconds', 30,
    'auth_type', 'form_data',
    'required_fields', ARRAY['user', 'password', 'sender', 'message', 'reciever']
  )
) ON CONFLICT DO NOTHING;

-- Update existing EasyUganda provider
UPDATE sms_providers 
SET api_endpoint = 'http://sms.easyuganda.net/api-sub.php',
    configuration = jsonb_build_object(
      'method', 'POST',
      'timeout_seconds', 30,
      'auth_type', 'form_data',
      'required_fields', ARRAY['user', 'password', 'sender', 'message', 'reciever']
    ),
    cost_per_sms = 50.0,
    priority_order = 1,
    is_active = true
WHERE provider_name = 'EasyUganda';

-- Create SMS Templates
DELETE FROM sms_templates WHERE purpose IN ('otp_verification', 'welcome', 'password_reset', 'transaction_alert');

INSERT INTO sms_templates (template_name, purpose, message_template, is_active) VALUES
('OTP Verification', 'otp_verification', 'YAWATU OTP: Your verification code is {{otp_code}}. Valid for {{expiry_minutes}} minutes. Do not share this code.', true),
('Welcome Message', 'welcome', 'YAWATU: Welcome to our platform! Your account has been activated successfully.', true),
('Password Reset', 'password_reset', 'YAWATU: Your password reset code is {{reset_code}}. Valid for 15 minutes.', true),
('Transaction Alert', 'transaction_alert', 'YAWATU: Transaction alert - {{transaction_type}} of {{amount}} {{currency}} completed successfully.', true);

-- Create Email Templates
DELETE FROM email_templates WHERE template_type IN ('otp_verification', 'welcome', 'password_reset', 'test');

INSERT INTO email_templates (name, template_type, subject, html_content, text_content, is_active) VALUES
('OTP Verification Email', 'otp_verification', 'Your Verification Code', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Verification Code</h2>
  <p>Your verification code is: <strong style="font-size: 24px; color: #007bff;">{{otp_code}}</strong></p>
  <p>This code will expire in {{expiry_minutes}} minutes.</p>
  <p>If you did not request this code, please ignore this email.</p>
</div>', 
'Your verification code is: {{otp_code}}. This code will expire in {{expiry_minutes}} minutes.', true),

('Welcome Email', 'welcome', 'Welcome to Our Platform', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Welcome {{user_name}}!</h2>
  <p>Thank you for joining our platform. Your account has been successfully created.</p>
  <p>You can now start using all our features.</p>
</div>', 
'Welcome {{user_name}}! Thank you for joining our platform.', true),

('Password Reset Email', 'password_reset', 'Password Reset Request', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Password Reset</h2>
  <p>You requested a password reset. Your reset code is: <strong>{{reset_code}}</strong></p>
  <p>This code will expire in 15 minutes.</p>
  <p>If you did not request this, please ignore this email.</p>
</div>', 
'Your password reset code is: {{reset_code}}. Valid for 15 minutes.', true),

('Test Email', 'test', 'Test Email Template', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">Test Email</h2>
  <p>This is a test email from {{sender_name}}.</p>
  <p>Message: {{test_message}}</p>
</div>', 
'Test email from {{sender_name}}. Message: {{test_message}}', true);

-- Fix SMS Budget Controls
DELETE FROM sms_config WHERE config_key IN ('daily_limit', 'monthly_limit', 'cost_per_sms', 'rate_limit_window_minutes', 'max_attempts_per_window');

INSERT INTO sms_config (config_key, config_value, description) VALUES
('daily_limit', '1000', 'Maximum SMS messages per day'),
('monthly_limit', '30000', 'Maximum SMS messages per month'),
('cost_per_sms', '50', 'Cost per SMS in UGX'),
('rate_limit_window_minutes', '10', 'Rate limiting window in minutes'),
('max_attempts_per_window', '3', 'Maximum SMS attempts per rate limit window');

-- Fix Email Budget Controls
UPDATE email_budget_controls 
SET max_budget = 500.00,
    max_emails_per_day = 1000,
    max_emails_per_month = 30000,
    is_active = true
WHERE budget_type = 'default';

-- Insert default email budget if it doesn't exist
INSERT INTO email_budget_controls (
  budget_type, max_budget, max_emails_per_day, max_emails_per_month, is_active
)
SELECT 'default', 500.00, 1000, 30000, true
WHERE NOT EXISTS (SELECT 1 FROM email_budget_controls WHERE budget_type = 'default');

-- Create default email providers if missing
INSERT INTO email_providers (name, provider_type, api_endpoint, cost_per_email, daily_limit, monthly_limit, priority, is_active) 
SELECT 'Resend', 'resend', 'https://api.resend.com/emails', 0.0001, 1000, 30000, 1, true
WHERE NOT EXISTS (SELECT 1 FROM email_providers WHERE name = 'Resend');

UPDATE email_providers 
SET is_active = true,
    priority = 1,
    updated_at = now()
WHERE name = 'Resend';