-- Update RelWorx configuration with proper merchant details
-- Replace ACTUAL_MERCHANT_ID with your real RelWorx merchant ID from RelWorx dashboard
-- Replace ACTUAL_WEBHOOK_SECRET with your real webhook secret from RelWorx dashboard

UPDATE relworx_payment_configs 
SET 
  merchant_id = 'YOUR_ACTUAL_RELWORX_MERCHANT_ID',
  webhook_secret = 'YOUR_ACTUAL_RELWORX_WEBHOOK_SECRET',
  is_sandbox = false,
  updated_at = now()
WHERE is_active = true;

-- If you need sandbox mode for testing, set is_sandbox = true
-- UPDATE relworx_payment_configs SET is_sandbox = true WHERE is_active = true;