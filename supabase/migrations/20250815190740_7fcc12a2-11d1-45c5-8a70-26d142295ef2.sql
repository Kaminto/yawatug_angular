-- Insert a default RelWorx configuration for testing
INSERT INTO public.relworx_payment_configs (
  merchant_id,
  api_key,
  webhook_secret,
  is_active,
  is_sandbox
) VALUES (
  'RELWORX_DEFAULT_MERCHANT',
  'will_be_overridden_by_env',
  'default_webhook_secret',
  true,
  false
);