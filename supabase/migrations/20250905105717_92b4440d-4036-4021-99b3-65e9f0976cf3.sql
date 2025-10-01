-- Create default fee settings if they don't exist
INSERT INTO public.transaction_fee_settings (
  transaction_type,
  flat_fee,
  percentage_fee,
  minimum_fee,
  maximum_fee,
  currency,
  is_active,
  fee_collection_enabled
) VALUES 
('deposit', 5000, 2.5, 2500, 50000, 'UGX', true, true),
('withdraw', 10000, 3.0, 5000, 100000, 'UGX', true, true),
('withdrawal_request', 10000, 3.0, 5000, 100000, 'UGX', true, true),
('transfer', 2500, 1.5, 1000, 25000, 'UGX', true, true)
ON CONFLICT (transaction_type, currency) DO UPDATE SET
  flat_fee = EXCLUDED.flat_fee,
  percentage_fee = EXCLUDED.percentage_fee,
  minimum_fee = EXCLUDED.minimum_fee,
  maximum_fee = EXCLUDED.maximum_fee,
  is_active = EXCLUDED.is_active,
  fee_collection_enabled = EXCLUDED.fee_collection_enabled;

-- Create admin fund wallet if it doesn't exist
INSERT INTO public.admin_sub_wallets (
  wallet_name,
  wallet_type,
  currency,
  balance,
  description,
  is_active
) VALUES (
  'Admin Fund - UGX',
  'admin_fund',
  'UGX',
  0,
  'Central admin fund for transaction fees and operational costs',
  true
) ON CONFLICT (wallet_type, currency) DO NOTHING;