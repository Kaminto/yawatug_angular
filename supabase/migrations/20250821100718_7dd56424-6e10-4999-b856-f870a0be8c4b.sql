-- Ensure we have default limits for each account type in all limit tables

-- Insert default buying limits for all account types if not exists
INSERT INTO share_buying_limits (account_type, min_buy_amount, max_buy_amount, required_down_payment_percentage, credit_period_days)
VALUES 
  ('individual', 1, 10000, 30, 30),
  ('business', 1, 50000, 20, 45),
  ('organisation', 1, 25000, 25, 30)
ON CONFLICT (account_type) DO NOTHING;

-- Insert default selling limits for all account types if not exists  
INSERT INTO share_selling_limits_by_account (account_type, limit_type, daily_limit, weekly_limit, monthly_limit, is_active)
VALUES 
  ('individual', 'quantity', 1000, 5000, 15000, true),
  ('individual', 'percentage', 10, 25, 50, true),
  ('business', 'quantity', 5000, 25000, 75000, true),
  ('business', 'percentage', 15, 35, 70, true),
  ('organisation', 'quantity', 2500, 12500, 40000, true),
  ('organisation', 'percentage', 12, 30, 60, true)
ON CONFLICT (account_type, limit_type) DO NOTHING;

-- Insert default transfer limits for all account types if not exists
INSERT INTO share_transfer_limits_by_account (account_type, daily_limit_shares, weekly_limit_shares, monthly_limit_shares, minimum_transfer_value, is_active)
VALUES 
  ('individual', 500, 2500, 10000, 50000, true),
  ('business', 2500, 12500, 50000, 100000, true),
  ('organisation', 1500, 7500, 30000, 75000, true)
ON CONFLICT (account_type) DO NOTHING;