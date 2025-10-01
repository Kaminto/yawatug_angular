-- Phase 3: Email System Enhancement Migration
-- Create email providers table for multi-provider support
CREATE TABLE IF NOT EXISTS public.email_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL, -- 'resend', 'sendgrid', 'ses', etc.
  api_endpoint TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1, -- Lower number = higher priority
  daily_limit INTEGER DEFAULT 1000,
  monthly_limit INTEGER DEFAULT 30000,
  cost_per_email NUMERIC(10,4) DEFAULT 0.0001, -- Cost in USD
  configuration JSONB DEFAULT '{}', -- Provider-specific config
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  template_type TEXT NOT NULL, -- 'activation', 'password_reset', 'welcome', etc.
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '{}', -- Available template variables
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email delivery logs table
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  provider_id UUID REFERENCES public.email_providers(id),
  provider_message_id TEXT, -- Provider's unique message ID
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'bounced', 'failed'
  cost NUMERIC(10,4) DEFAULT 0,
  delivery_attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email analytics table
CREATE TABLE IF NOT EXISTS public.email_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analytics_date DATE NOT NULL DEFAULT CURRENT_DATE,
  provider_id UUID REFERENCES public.email_providers(id),
  template_type TEXT,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_cost NUMERIC(10,2) DEFAULT 0,
  delivery_rate NUMERIC(5,2) DEFAULT 0, -- Percentage
  bounce_rate NUMERIC(5,2) DEFAULT 0, -- Percentage
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(analytics_date, provider_id, template_type)
);

-- Create email budget controls table
CREATE TABLE IF NOT EXISTS public.email_budget_controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_type TEXT NOT NULL, -- 'daily', 'monthly'
  max_budget NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  current_spending NUMERIC(10,2) DEFAULT 0,
  max_emails_per_day INTEGER DEFAULT 1000,
  max_emails_per_month INTEGER DEFAULT 30000,
  current_daily_count INTEGER DEFAULT 0,
  current_monthly_count INTEGER DEFAULT 0,
  reset_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(budget_type)
);

-- Enable RLS on all email tables
ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_budget_controls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_providers
CREATE POLICY "Admins can manage email providers" ON public.email_providers
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active email providers" ON public.email_providers
FOR SELECT USING (is_active = true);

-- RLS Policies for email_templates
CREATE POLICY "Admins can manage email templates" ON public.email_templates
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active email templates" ON public.email_templates
FOR SELECT USING (is_active = true);

-- RLS Policies for email_delivery_logs
CREATE POLICY "Admins can view all email delivery logs" ON public.email_delivery_logs
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "System can insert email delivery logs" ON public.email_delivery_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update email delivery logs" ON public.email_delivery_logs
FOR UPDATE USING (true);

-- RLS Policies for email_analytics
CREATE POLICY "Admins can manage email analytics" ON public.email_analytics
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for email_budget_controls
CREATE POLICY "Admins can manage email budget controls" ON public.email_budget_controls
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Insert default email providers
INSERT INTO public.email_providers (name, provider_type, api_endpoint, priority, daily_limit, monthly_limit, cost_per_email, configuration) VALUES
('Resend Primary', 'resend', 'https://api.resend.com', 1, 1000, 30000, 0.0001, '{"from_domain": "onboarding@resend.dev"}'),
('SendGrid Backup', 'sendgrid', 'https://api.sendgrid.com', 2, 5000, 150000, 0.0000895, '{"from_email": "noreply@yawatu.com"}')
ON CONFLICT (name) DO NOTHING;

-- Insert default email templates
INSERT INTO public.email_templates (name, template_type, subject, html_content, text_content, variables) VALUES
('Account Activation', 'activation', 'Activate Your Yawatu Account', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #D4AF37;">Welcome to Yawatu!</h1>
  <p>Hello {{full_name}},</p>
  <p>Your account has been created. Click the button below to activate:</p>
  <a href="{{activation_url}}" style="background-color: #D4AF37; color: black; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Activate Account</a>
  <p>If the button doesn''t work, copy this link: {{activation_url}}</p>
</div>',
'Welcome to Yawatu! Hello {{full_name}}, your account has been created. Visit this link to activate: {{activation_url}}',
'{"full_name": "User full name", "activation_url": "Account activation link"}'),

('Password Reset', 'password_reset', 'Reset Your Yawatu Password',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #D4AF37;">Password Reset Request</h1>
  <p>Hello {{full_name}},</p>
  <p>Click the button below to reset your password:</p>
  <a href="{{reset_url}}" style="background-color: #D4AF37; color: black; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
  <p>This link expires in 24 hours.</p>
</div>',
'Password Reset Request. Hello {{full_name}}, visit this link to reset your password: {{reset_url}}. This link expires in 24 hours.',
'{"full_name": "User full name", "reset_url": "Password reset link"}')
ON CONFLICT (name) DO NOTHING;

-- Insert default email budget controls
INSERT INTO public.email_budget_controls (budget_type, max_budget, max_emails_per_day, max_emails_per_month) VALUES
('daily', 50.00, 1000, NULL),
('monthly', 500.00, NULL, 30000)
ON CONFLICT (budget_type) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_email ON public.email_delivery_logs(email_address);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_status ON public.email_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_created_at ON public.email_delivery_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_analytics_date ON public.email_analytics(analytics_date);
CREATE INDEX IF NOT EXISTS idx_email_providers_priority ON public.email_providers(priority) WHERE is_active = true;

-- Create trigger to update email analytics
CREATE OR REPLACE FUNCTION update_email_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update analytics when email status changes
  IF NEW.status != OLD.status THEN
    INSERT INTO public.email_analytics (
      analytics_date, provider_id, template_type, 
      total_sent, total_delivered, total_bounced, total_failed, total_cost
    )
    SELECT 
      CURRENT_DATE,
      NEW.provider_id,
      COALESCE(et.template_type, 'unknown'),
      CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'bounced' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
      COALESCE(NEW.cost, 0)
    FROM public.email_templates et
    WHERE et.id = NEW.template_id
    ON CONFLICT (analytics_date, provider_id, template_type) 
    DO UPDATE SET
      total_sent = email_analytics.total_sent + CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
      total_delivered = email_analytics.total_delivered + CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
      total_bounced = email_analytics.total_bounced + CASE WHEN NEW.status = 'bounced' THEN 1 ELSE 0 END,
      total_failed = email_analytics.total_failed + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
      total_cost = email_analytics.total_cost + COALESCE(NEW.cost, 0),
      delivery_rate = CASE 
        WHEN (email_analytics.total_sent + CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END) > 0 
        THEN ((email_analytics.total_delivered + CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END) * 100.0) / 
             (email_analytics.total_sent + CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END)
        ELSE 0 
      END,
      bounce_rate = CASE 
        WHEN (email_analytics.total_sent + CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END) > 0 
        THEN ((email_analytics.total_bounced + CASE WHEN NEW.status = 'bounced' THEN 1 ELSE 0 END) * 100.0) / 
             (email_analytics.total_sent + CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END)
        ELSE 0 
      END,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER email_analytics_trigger
  AFTER UPDATE ON public.email_delivery_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_analytics();