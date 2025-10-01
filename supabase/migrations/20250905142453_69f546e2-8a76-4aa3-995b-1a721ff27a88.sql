-- Update RelWorx configuration to use environment variables properly
UPDATE relworx_payment_configs 
SET 
  api_key = 'RELWORX_API_KEY_FROM_ENV',
  webhook_secret = 'RELWORX_WEBHOOK_SECRET_FROM_ENV',
  webhook_url = 'https://lqmcokwbqnjuufcvodos.supabase.co/functions/v1/relworx-webhook-handler'
WHERE is_active = true;