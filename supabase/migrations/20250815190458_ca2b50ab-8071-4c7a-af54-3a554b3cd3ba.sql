-- Insert a default RelWorx configuration for testing
INSERT INTO public.relworx_payment_configs (
  config_name,
  account_no,
  is_active,
  environment,
  webhook_url,
  description
) VALUES (
  'Default RelWorx Config',
  'RELWORX_DEFAULT_ACCOUNT',
  true,
  'production',
  'https://e323933a-e734-4d0c-834c-75abc766f4c6.lovableproject.com/api/relworx-webhook',
  'Default RelWorx payment configuration'
) ON CONFLICT (config_name) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  updated_at = now();