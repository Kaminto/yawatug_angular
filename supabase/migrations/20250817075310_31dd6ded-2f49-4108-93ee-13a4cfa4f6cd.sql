-- Add unique constraint to admin_payment_settings table
ALTER TABLE admin_payment_settings 
ADD CONSTRAINT admin_payment_settings_setting_name_key 
UNIQUE (setting_name);