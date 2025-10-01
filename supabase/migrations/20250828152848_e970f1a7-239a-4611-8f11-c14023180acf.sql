-- Update email provider configuration to use verified yawatug.com domain
UPDATE email_providers 
SET configuration = jsonb_set(configuration, '{from_domain}', '"noreply@yawatug.com"')
WHERE provider_type = 'resend' AND is_active = true;