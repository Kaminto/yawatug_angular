-- Fix email system setup by working with existing table structure

-- Insert default email provider using correct column names
INSERT INTO public.email_providers (name, provider_type, configuration, cost_per_email, priority, is_active)
VALUES ('Resend', 'resend', '{"from_domain": "admin@yawatug.com"}', 0.0001, 1, true)
ON CONFLICT (name) DO NOTHING;

-- Create missing email tables

-- Email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email budget controls table
CREATE TABLE IF NOT EXISTS public.email_budget_controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  max_budget NUMERIC NOT NULL DEFAULT 100.00,
  current_spending NUMERIC DEFAULT 0.00,
  max_emails_per_day INTEGER DEFAULT 1000,
  max_emails_per_month INTEGER DEFAULT 30000,
  current_daily_count INTEGER DEFAULT 0,
  current_monthly_count INTEGER DEFAULT 0,
  reset_daily_at DATE DEFAULT CURRENT_DATE,
  reset_monthly_at DATE DEFAULT date_trunc('month', CURRENT_DATE),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email delivery logs table
CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_address TEXT NOT NULL,
  subject TEXT,
  template_id UUID REFERENCES public.email_templates(id),
  provider_id UUID REFERENCES public.email_providers(id),
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  cost NUMERIC DEFAULT 0,
  delivery_attempts INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Club share consent invitations table
CREATE TABLE IF NOT EXISTS public.club_share_consent_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_allocation_id TEXT NOT NULL,
  club_member_id TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'consented', 'rejected', 'expired')),
  consented_at TIMESTAMP WITH TIME ZONE,
  consent_ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_budget_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_share_consent_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admin can manage email templates" ON public.email_templates FOR ALL USING (get_current_user_role() = 'admin');
CREATE POLICY "Admin can manage email budget" ON public.email_budget_controls FOR ALL USING (get_current_user_role() = 'admin');
CREATE POLICY "Admin can view email logs" ON public.email_delivery_logs FOR SELECT USING (get_current_user_role() = 'admin');
CREATE POLICY "Admin can manage consent invitations" ON public.club_share_consent_invitations FOR ALL USING (get_current_user_role() = 'admin');

-- Allow public read access to consent invitations by token (for consent page)
CREATE POLICY "Public can view consent invitations by token" ON public.club_share_consent_invitations 
FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates(template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_email_logs_email ON public.email_delivery_logs(email_address);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_consent_token ON public.club_share_consent_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_consent_status ON public.club_share_consent_invitations(status);

-- Insert default budget control
INSERT INTO public.email_budget_controls (max_budget, max_emails_per_day, max_emails_per_month, is_active)
VALUES (100.00, 1000, 30000, true)
ON CONFLICT DO NOTHING;

-- Insert basic email templates
INSERT INTO public.email_templates (name, template_type, subject, html_content, text_content, variables, is_active)
VALUES 
('Welcome Email', 'welcome', 'Welcome to Yawatu Minerals & Mining PLC', 
 '<h1>Welcome {{name}}!</h1><p>{{message}}</p>', 
 'Welcome {{name}}! {{message}}', 
 '{"name": "User Name", "message": "Welcome message"}', true),
('Notification Email', 'notification', '{{title}}', 
 '<h2>{{title}}</h2><p>{{message}}</p>', 
 '{{title}} - {{message}}', 
 '{"title": "Notification Title", "message": "Notification message"}', true)
ON CONFLICT DO NOTHING;