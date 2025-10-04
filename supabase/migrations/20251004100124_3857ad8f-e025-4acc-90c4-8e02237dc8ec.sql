-- Create transaction audit logs table
CREATE TABLE IF NOT EXISTS public.transaction_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'approved', 'rejected', 'completed', 'failed', 'cancelled')),
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.transaction_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own audit logs"
  ON public.transaction_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON public.transaction_audit_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.transaction_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transaction_audit_logs_transaction_id 
  ON public.transaction_audit_logs(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_logs_user_id 
  ON public.transaction_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_logs_created_at 
  ON public.transaction_audit_logs(created_at DESC);