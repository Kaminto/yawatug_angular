-- ============================================================
-- PHASE 1: CRITICAL DATABASE PERFORMANCE & ADMIN OPERATIONS (Fixed)
-- ============================================================

-- Performance indexes for profiles table (without CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON public.profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_import_batch ON public.profiles(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_status_created ON public.profiles(status, created_at DESC);

-- Composite indexes for common admin queries  
CREATE INDEX IF NOT EXISTS idx_profiles_verification_queue ON public.profiles(status, updated_at DESC) WHERE status = 'pending_verification';
CREATE INDEX IF NOT EXISTS idx_profiles_edit_requests ON public.profiles(edit_requested, edit_request_status, last_edit_request DESC) WHERE edit_requested = true;

-- Admin operations queue for background processing
CREATE TABLE IF NOT EXISTS public.admin_operations_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT NOT NULL,
    operation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    target_table TEXT NOT NULL,
    target_ids UUID[] NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_operations_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage operations queue"
ON public.admin_operations_queue
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Comprehensive user audit log
CREATE TABLE IF NOT EXISTS public.user_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.profiles(id),
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'profile',
    entity_id UUID,
    old_values JSONB DEFAULT '{}'::jsonb,
    new_values JSONB DEFAULT '{}'::jsonb,
    change_summary TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit log"
ON public.user_audit_log
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own audit log"
ON public.user_audit_log
FOR SELECT USING (auth.uid() = user_id);

-- Performance optimization functions
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', COUNT(*),
        'active_users', COUNT(*) FILTER (WHERE status = 'active'),
        'pending_verification', COUNT(*) FILTER (WHERE status = 'pending_verification'),
        'blocked_users', COUNT(*) FILTER (WHERE status = 'blocked'),
        'imported_users', COUNT(*) FILTER (WHERE import_batch_id IS NOT NULL),
        'organic_users', COUNT(*) FILTER (WHERE import_batch_id IS NULL),
        'edit_requests', COUNT(*) FILTER (WHERE edit_requested = true AND edit_request_status = 'pending'),
        'high_completion_profiles', COUNT(*) FILTER (WHERE profile_completion_percentage >= 80),
        'incomplete_profiles', COUNT(*) FILTER (WHERE profile_completion_percentage < 50),
        'recent_registrations_24h', COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours'),
        'recent_registrations_7d', COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '7 days'),
        'recent_logins_24h', COUNT(*) FILTER (WHERE last_login > now() - INTERVAL '24 hours'),
        'never_logged_in', COUNT(*) FILTER (WHERE last_login IS NULL AND created_at < now() - INTERVAL '7 days'),
        'last_updated', now()
    ) INTO result
    FROM public.profiles;
    
    RETURN result;
END;
$$;

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_admin_operations_queue_status ON public.admin_operations_queue(status, priority DESC, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_admin_operations_queue_created_by ON public.admin_operations_queue(created_by);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON public.user_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_admin_id ON public.user_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_action_type ON public.user_audit_log(action_type, created_at DESC);

-- Audit logging trigger function
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD IS DISTINCT FROM NEW THEN
        INSERT INTO public.user_audit_log (
            user_id,
            admin_id,
            action_type,
            entity_type,
            entity_id,
            old_values,
            new_values,
            change_summary,
            ip_address
        ) VALUES (
            NEW.id,
            auth.uid(),
            'profile_update',
            'profile',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            CASE 
                WHEN OLD.status != NEW.status THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
                WHEN OLD.user_role != NEW.user_role THEN 'Role changed from ' || OLD.user_role || ' to ' || NEW.user_role
                ELSE 'Profile updated'
            END,
            inet_client_addr()
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.user_audit_log (
            user_id,
            admin_id,
            action_type,
            entity_type,
            entity_id,
            new_values,
            change_summary
        ) VALUES (
            NEW.id,
            auth.uid(),
            'profile_created',
            'profile',
            NEW.id,
            to_jsonb(NEW),
            'Profile created'
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit trigger to profiles table
DROP TRIGGER IF EXISTS trigger_profile_audit ON public.profiles;
CREATE TRIGGER trigger_profile_audit
    AFTER INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_profile_changes();