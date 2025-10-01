-- Work with existing table structures and create only what's missing

-- Insert default data into existing email_budget_controls table with correct budget_type
INSERT INTO public.email_budget_controls (budget_type, max_budget, current_spending, max_emails_per_day, max_emails_per_month, current_daily_count, current_monthly_count, is_active)
VALUES ('general', 100.00, 0.00, 1000, 30000, 0, 0, true)
ON CONFLICT DO NOTHING;

-- Create missing email tables only if they don't exist

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

-- Enable RLS on tables (only if they were just created)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates') THEN
    ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admin can manage email templates" ON public.email_templates FOR ALL USING (get_current_user_role() = 'admin');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_delivery_logs') THEN
    ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admin can view email logs" ON public.email_delivery_logs FOR SELECT USING (get_current_user_role() = 'admin');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'club_share_consent_invitations') THEN
    ALTER TABLE public.club_share_consent_invitations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admin can manage consent invitations" ON public.club_share_consent_invitations FOR ALL USING (get_current_user_role() = 'admin');
    CREATE POLICY "Public can view consent invitations by token" ON public.club_share_consent_invitations FOR SELECT USING (true);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates(template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_email_logs_email ON public.email_delivery_logs(email_address);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_consent_token ON public.club_share_consent_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_consent_status ON public.club_share_consent_invitations(status);

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
ON CONFLICT (name, template_type) DO NOTHING;