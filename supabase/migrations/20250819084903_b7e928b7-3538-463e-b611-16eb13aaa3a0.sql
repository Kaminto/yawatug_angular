-- Update RelWorx payment configuration table to match full API requirements
ALTER TABLE public.relworx_payment_configs 
ADD COLUMN IF NOT EXISTS key_prefix text,
ADD COLUMN IF NOT EXISTS authorized_business_accounts text[],
ADD COLUMN IF NOT EXISTS key_name text,
ADD COLUMN IF NOT EXISTS key_permissions jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rate_limit_settings jsonb DEFAULT '{"max_requests": 5, "window_minutes": 10}',
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS api_version text DEFAULT 'v2',
ADD COLUMN IF NOT EXISTS supported_currencies text[] DEFAULT ARRAY['UGX', 'KES', 'TZS'],
ADD COLUMN IF NOT EXISTS payment_limits jsonb DEFAULT '{"min_ugx": 500, "max_ugx": 5000000, "min_kes": 10, "max_kes": 70000, "min_tzs": 500, "max_tzs": 5000000}';

-- Update the existing configuration with proper validation
UPDATE public.relworx_payment_configs 
SET 
  key_prefix = CASE 
    WHEN merchant_id LIKE 'e01da22%' THEN 'e01da22cfb8c9e'
    ELSE substring(merchant_id, 1, 14)
  END,
  authorized_business_accounts = CASE 
    WHEN account_no LIKE 'REL%' THEN ARRAY[account_no]
    ELSE ARRAY[account_no]
  END,
  key_name = COALESCE(key_name, 'Yawatu_1'),
  api_version = 'v2',
  supported_currencies = ARRAY['UGX', 'KES', 'TZS'],
  payment_limits = '{
    "min_ugx": 500, 
    "max_ugx": 5000000, 
    "min_kes": 10, 
    "max_kes": 70000, 
    "min_tzs": 500, 
    "max_tzs": 5000000
  }'::jsonb,
  rate_limit_settings = '{
    "max_requests": 5, 
    "window_minutes": 10
  }'::jsonb
WHERE is_active = true;