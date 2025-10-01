-- Create unified communications tracking table
CREATE TABLE IF NOT EXISTS public.communications_unified (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    business_process text NOT NULL, -- 'wallet_withdrawal', 'consent_invitation', 'otp_verification', etc.
    user_id uuid REFERENCES public.profiles(id),
    channels_requested text[] NOT NULL DEFAULT '{}', -- ['sms', 'email']
    channels_completed text[] NOT NULL DEFAULT '{}', -- successful deliveries
    channels_failed text[] NOT NULL DEFAULT '{}', -- failed deliveries
    overall_status text NOT NULL DEFAULT 'pending' CHECK (overall_status IN ('pending', 'partial_success', 'complete', 'failed')),
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    template_type text,
    template_data jsonb DEFAULT '{}',
    initiated_by uuid REFERENCES public.profiles(id),
    business_reference_id uuid, -- Links to transaction, OTP, etc.
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    failed_at timestamp with time zone
);

-- Add communication correlation to existing tables
ALTER TABLE public.sms_delivery_logs 
ADD COLUMN IF NOT EXISTS communication_correlation_id uuid REFERENCES public.communications_unified(correlation_id);

ALTER TABLE public.email_delivery_logs 
ADD COLUMN IF NOT EXISTS communication_correlation_id uuid REFERENCES public.communications_unified(correlation_id);

-- Add business process reference
ALTER TABLE public.sms_delivery_logs 
ADD COLUMN IF NOT EXISTS business_process_reference uuid;

ALTER TABLE public.email_delivery_logs 
ADD COLUMN IF NOT EXISTS business_process_reference uuid;

-- Enable RLS
ALTER TABLE public.communications_unified ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own communications" 
ON public.communications_unified 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all communications" 
ON public.communications_unified 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "System can manage communications" 
ON public.communications_unified 
FOR ALL 
USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_communications_unified_correlation_id ON public.communications_unified(correlation_id);
CREATE INDEX IF NOT EXISTS idx_communications_unified_user_id ON public.communications_unified(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_unified_business_process ON public.communications_unified(business_process);
CREATE INDEX IF NOT EXISTS idx_communications_unified_status ON public.communications_unified(overall_status);
CREATE INDEX IF NOT EXISTS idx_sms_delivery_logs_correlation ON public.sms_delivery_logs(communication_correlation_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_correlation ON public.email_delivery_logs(communication_correlation_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_communications_unified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    
    -- Auto-update overall status based on channels
    IF array_length(NEW.channels_completed, 1) = array_length(NEW.channels_requested, 1) THEN
        NEW.overall_status = 'complete';
        NEW.completed_at = now();
    ELSIF array_length(NEW.channels_failed, 1) = array_length(NEW.channels_requested, 1) THEN
        NEW.overall_status = 'failed';
        NEW.failed_at = now();
    ELSIF array_length(NEW.channels_completed, 1) > 0 OR array_length(NEW.channels_failed, 1) > 0 THEN
        NEW.overall_status = 'partial_success';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_communications_unified_timestamp_trigger
    BEFORE UPDATE ON public.communications_unified
    FOR EACH ROW
    EXECUTE FUNCTION update_communications_unified_timestamp();