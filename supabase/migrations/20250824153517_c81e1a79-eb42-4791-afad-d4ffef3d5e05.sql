-- Fix security issues for the new views by creating proper RLS policies

-- Enable RLS on all the new views 
ALTER VIEW user_profile_essentials SET (security_barrier = true);
ALTER VIEW user_financial_summary SET (security_barrier = true);
ALTER VIEW admin_dashboard_metrics SET (security_barrier = true);
ALTER VIEW transaction_summary SET (security_barrier = true);
ALTER VIEW verification_priority_queue SET (security_barrier = true);
ALTER VIEW user_share_holdings_summary SET (security_barrier = true);
ALTER VIEW admin_wallet_summary SET (security_barrier = true);

-- Create RLS policies for the views
-- Since views inherit from base tables, we'll create proper access functions

-- User profile essentials - users can see their own data, admins can see all
CREATE POLICY "Users can view their own profile essentials" ON user_profile_essentials
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profile essentials" ON user_profile_essentials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- User financial summary - users can see their own, admins can see all
CREATE POLICY "Users can view their own financial summary" ON user_financial_summary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all financial summaries" ON user_financial_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- Admin dashboard metrics - only admins can view
CREATE POLICY "Only admins can view dashboard metrics" ON admin_dashboard_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- Transaction summary - users can see their own, admins can see all
CREATE POLICY "Users can view their own transaction summary" ON transaction_summary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transaction summaries" ON transaction_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- Verification priority queue - only admins can view
CREATE POLICY "Only admins can view verification queue" ON verification_priority_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- User share holdings summary - users can see their own, admins can see all
CREATE POLICY "Users can view their own share holdings summary" ON user_share_holdings_summary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all share holdings summaries" ON user_share_holdings_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- Admin wallet summary - only admins can view
CREATE POLICY "Only admins can view wallet summary" ON admin_wallet_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- Enable RLS on the views
ALTER VIEW user_profile_essentials ENABLE ROW LEVEL SECURITY;
ALTER VIEW user_financial_summary ENABLE ROW LEVEL SECURITY;
ALTER VIEW admin_dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER VIEW transaction_summary ENABLE ROW LEVEL SECURITY;
ALTER VIEW verification_priority_queue ENABLE ROW LEVEL SECURITY;
ALTER VIEW user_share_holdings_summary ENABLE ROW LEVEL SECURITY;
ALTER VIEW admin_wallet_summary ENABLE ROW LEVEL SECURITY;