-- Phase 1: Database Query Optimization Views
-- Create optimized views for better performance and reduced data fetching

-- User profile essentials for lists and dashboard displays
CREATE VIEW user_profile_essentials AS 
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.profile_picture_url,
  p.status,
  p.profile_completion_percentage,
  p.account_type,
  p.user_role,
  p.created_at,
  p.last_login,
  p.login_count,
  CASE 
    WHEN p.import_batch_id IS NOT NULL THEN true 
    ELSE false 
  END as is_imported
FROM profiles p;

-- Dashboard financial summary for quick overview
CREATE VIEW user_financial_summary AS
SELECT 
  w.user_id,
  w.currency,
  SUM(w.balance) as total_balance,
  COUNT(*) as wallet_count,
  MAX(w.updated_at) as last_wallet_update
FROM wallets w 
WHERE w.status = 'active'
GROUP BY w.user_id, w.currency;

-- Admin dashboard metrics view
CREATE VIEW admin_dashboard_metrics AS
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN status = 'pending_verification' THEN 1 END) as pending_verifications,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
  COUNT(CASE WHEN import_batch_id IS NOT NULL THEN 1 END) as imported_users,
  COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked_users,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' AND import_batch_id IS NULL THEN 1 END) as new_registrations_week
FROM profiles;

-- Transaction summary for quick transaction lists
CREATE VIEW transaction_summary AS
SELECT 
  t.id,
  t.user_id,
  t.transaction_type,
  t.amount,
  t.currency,
  t.status,
  t.approval_status,
  t.created_at,
  t.updated_at,
  p.full_name as user_name,
  p.email as user_email
FROM transactions t
JOIN profiles p ON t.user_id = p.id;

-- User verification priority queue
CREATE VIEW verification_priority_queue AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.status,
  p.verification_submitted_at,
  p.profile_completion_percentage,
  EXTRACT(EPOCH FROM (NOW() - p.verification_submitted_at))/3600 as hours_waiting,
  CASE 
    WHEN p.verification_submitted_at < NOW() - INTERVAL '48 hours' THEN 'critical'
    WHEN p.verification_submitted_at < NOW() - INTERVAL '24 hours' THEN 'high'
    WHEN p.verification_submitted_at < NOW() - INTERVAL '12 hours' THEN 'medium'
    ELSE 'low'
  END as priority_level
FROM profiles p
WHERE p.status = 'pending_verification'
ORDER BY p.verification_submitted_at ASC;

-- Share holdings summary for user portfolios
CREATE VIEW user_share_holdings_summary AS
SELECT 
  ush.user_id,
  COUNT(DISTINCT ush.share_id) as unique_shares_held,
  SUM(ush.quantity) as total_shares_quantity,
  SUM(ush.quantity * s.price_per_share) as total_portfolio_value,
  MAX(ush.updated_at) as last_portfolio_update
FROM user_share_holdings ush
JOIN shares s ON ush.share_id = s.id
WHERE ush.quantity > 0
GROUP BY ush.user_id;

-- Admin wallet summary for financial overview
CREATE VIEW admin_wallet_summary AS
SELECT 
  asw.wallet_type,
  asw.currency,
  SUM(asw.balance) as total_balance,
  COUNT(*) as wallet_count,
  MAX(asw.updated_at) as last_update
FROM admin_sub_wallets asw
WHERE asw.is_active = true
GROUP BY asw.wallet_type, asw.currency;