-- **PHASE 2: SMS SYSTEM ENHANCEMENT**
-- Task 1: Add SMS provider management and failover capabilities

-- Create SMS providers table for multi-provider support
CREATE TABLE IF NOT EXISTS public.sms_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL UNIQUE,
  provider_type text NOT NULL CHECK (provider_type IN ('primary', 'backup', 'emergency')),
  api_endpoint text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority_order integer NOT NULL DEFAULT 1,
  rate_limit_per_minute integer NOT NULL DEFAULT 100,
  cost_per_sms numeric(10,4) NOT NULL DEFAULT 0.05,
  success_rate numeric(5,2) NOT NULL DEFAULT 100.00,
  avg_delivery_time_seconds integer NOT NULL DEFAULT 30,
  timeout_seconds integer NOT NULL DEFAULT 30,
  retry_attempts integer NOT NULL DEFAULT 2,
  configuration jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on SMS providers table
ALTER TABLE public.sms_providers ENABLE ROW LEVEL SECURITY;

-- Create policies for SMS providers
CREATE POLICY "Admins can manage SMS providers" 
ON sms_providers FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active SMS providers" 
ON sms_providers FOR SELECT 
TO authenticated 
USING (is_active = true);

-- Create SMS delivery analytics table
CREATE TABLE IF NOT EXISTS public.sms_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  provider_id uuid REFERENCES sms_providers(id),
  total_sent integer NOT NULL DEFAULT 0,
  total_delivered integer NOT NULL DEFAULT 0,
  total_failed integer NOT NULL DEFAULT 0,
  avg_delivery_time_seconds numeric(8,2) NOT NULL DEFAULT 0,
  total_cost numeric(10,4) NOT NULL DEFAULT 0,
  success_rate numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(date, provider_id)
);

-- Enable RLS on SMS analytics
ALTER TABLE public.sms_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for SMS analytics
CREATE POLICY "Admins can manage SMS analytics" 
ON sms_analytics FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create SMS templates table for better message management
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL UNIQUE,
  template_category text NOT NULL CHECK (template_category IN ('otp', 'notification', 'marketing', 'alert')),
  purpose text NOT NULL,
  message_template text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  language text NOT NULL DEFAULT 'en',
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on SMS templates
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for SMS templates
CREATE POLICY "Admins can manage SMS templates" 
ON sms_templates FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active SMS templates" 
ON sms_templates FOR SELECT 
TO authenticated 
USING (is_active = true);

-- Create SMS budget controls table
CREATE TABLE IF NOT EXISTS public.sms_budget_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_name text NOT NULL,
  monthly_budget_limit numeric(12,2) NOT NULL,
  daily_budget_limit numeric(10,2) NOT NULL,
  current_month_spent numeric(12,2) NOT NULL DEFAULT 0,
  current_day_spent numeric(10,2) NOT NULL DEFAULT 0,
  alert_threshold_percent integer NOT NULL DEFAULT 80,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on SMS budget controls
ALTER TABLE public.sms_budget_controls ENABLE ROW LEVEL SECURITY;

-- Create policies for SMS budget controls
CREATE POLICY "Admins can manage SMS budget controls" 
ON sms_budget_controls FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Insert default SMS providers
INSERT INTO public.sms_providers (provider_name, provider_type, api_endpoint, cost_per_sms, configuration) VALUES
('EasyUganda', 'primary', 'https://api.easyuganda.com/api/v1/sms/send', 0.05, '{"requires_auth": true, "auth_type": "basic"}'),
('Twilio', 'backup', 'https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json', 0.075, '{"requires_auth": true, "auth_type": "token"}')
ON CONFLICT (provider_name) DO NOTHING;

-- Insert default SMS templates
INSERT INTO public.sms_templates (template_name, template_category, purpose, message_template, variables) VALUES
('otp_wallet_transaction', 'otp', 'wallet_transaction', 'YAWATU: Your OTP is {otp}. Use this to complete your {transaction_type} of {amount} {currency}. Valid for {expiry_minutes} minutes. Do not share.', '["otp", "transaction_type", "amount", "currency", "expiry_minutes"]'),
('otp_verification', 'otp', 'verification', 'YAWATU: Your verification OTP is {otp}. Valid for {expiry_minutes} minutes. Do not share this code.', '["otp", "expiry_minutes"]'),
('transaction_alert', 'notification', 'transaction_notification', 'YAWATU: Transaction alert - {transaction_type} of {amount} {currency} has been {status}. Ref: {reference}', '["transaction_type", "amount", "currency", "status", "reference"]')
ON CONFLICT (template_name) DO NOTHING;

-- Insert default budget control
INSERT INTO public.sms_budget_controls (budget_name, monthly_budget_limit, daily_budget_limit) VALUES
('Default SMS Budget', 1000.00, 50.00)
ON CONFLICT DO NOTHING;

-- Update existing sms_delivery_logs table to track costs and provider details better
ALTER TABLE public.sms_delivery_logs 
ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES sms_providers(id),
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES sms_templates(id),
ADD COLUMN IF NOT EXISTS delivery_confirmation_received boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_received_at timestamp with time zone;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sms_delivery_logs_provider_id ON sms_delivery_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_sms_delivery_logs_created_at ON sms_delivery_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_analytics_date ON sms_analytics(date);
CREATE INDEX IF NOT EXISTS idx_sms_providers_priority ON sms_providers(priority_order, is_active);

-- Create trigger to update SMS analytics
CREATE OR REPLACE FUNCTION update_sms_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily analytics when SMS delivery status changes
  IF NEW.status != OLD.status AND NEW.status IN ('delivered', 'failed') THEN
    INSERT INTO sms_analytics (date, provider_id, total_sent, total_delivered, total_failed, total_cost)
    VALUES (
      CURRENT_DATE,
      NEW.provider_id,
      CASE WHEN NEW.status IN ('delivered', 'failed') THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
      COALESCE(NEW.cost_amount, 0)
    )
    ON CONFLICT (date, provider_id) DO UPDATE SET
      total_sent = sms_analytics.total_sent + EXCLUDED.total_sent,
      total_delivered = sms_analytics.total_delivered + EXCLUDED.total_delivered,
      total_failed = sms_analytics.total_failed + EXCLUDED.total_failed,
      total_cost = sms_analytics.total_cost + EXCLUDED.total_cost,
      success_rate = CASE 
        WHEN (sms_analytics.total_sent + EXCLUDED.total_sent) > 0 
        THEN ((sms_analytics.total_delivered + EXCLUDED.total_delivered)::numeric / (sms_analytics.total_sent + EXCLUDED.total_sent)::numeric) * 100
        ELSE 0 
      END,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for SMS analytics
DROP TRIGGER IF EXISTS trigger_update_sms_analytics ON sms_delivery_logs;
CREATE TRIGGER trigger_update_sms_analytics
  AFTER UPDATE ON sms_delivery_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_analytics();