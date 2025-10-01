-- ============================================================
-- PHASE 1: CRITICAL DATABASE PERFORMANCE & ADMIN OPERATIONS
-- ============================================================

-- Performance indexes for profiles table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_role ON public.profiles(user_role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_import_batch ON public.profiles(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_status_created ON public.profiles(status, created_at DESC);

-- Composite indexes for common admin queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_verification_queue ON public.profiles(status, updated_at DESC) WHERE status = 'pending_verification';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_edit_requests ON public.profiles(edit_requested, edit_request_status, last_edit_request DESC) WHERE edit_requested = true;

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

-- Enable RLS and create policies for admin operations queue
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

-- Enable RLS and create policies for audit log
ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit log"
ON public.user_audit_log
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Users can view their own audit log (read-only)
CREATE POLICY "Users can view their own audit log"
ON public.user_audit_log
FOR SELECT USING (auth.uid() = user_id);

-- Performance monitoring table
CREATE TABLE IF NOT EXISTS public.admin_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('query_time', 'operation_count', 'error_rate', 'success_rate')),
    entity_type TEXT NOT NULL,
    time_period TEXT NOT NULL DEFAULT 'hourly',
    recorded_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User session tracking for better admin insights
CREATE TABLE IF NOT EXISTS public.user_session_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_start TIMESTAMPTZ DEFAULT now(),
    session_end TIMESTAMPTZ,
    pages_visited INTEGER DEFAULT 1,
    actions_performed INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bulk operation results tracking
CREATE TABLE IF NOT EXISTS public.bulk_operation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES public.admin_operations_queue(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    before_values JSONB DEFAULT '{}'::jsonb,
    after_values JSONB DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_admin_operations_queue_status ON public.admin_operations_queue(status, priority DESC, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_admin_operations_queue_created_by ON public.admin_operations_queue(created_by);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON public.user_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_admin_id ON public.user_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_action_type ON public.user_audit_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON public.admin_performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_session_analytics_user_id ON public.user_session_analytics(user_id, session_start DESC);

-- Enhanced profile views for admin operations
CREATE OR REPLACE VIEW public.admin_user_summary AS
SELECT 
    p.*,
    COUNT(DISTINCT ud.id) as document_count,
    COUNT(DISTINCT CASE WHEN ud.status = 'approved' THEN ud.id END) as approved_documents,
    COUNT(DISTINCT CASE WHEN ud.status = 'pending' THEN ud.id END) as pending_documents,
    COUNT(DISTINCT CASE WHEN ud.status = 'rejected' THEN ud.id END) as rejected_documents,
    COUNT(DISTINCT cp.id) as contact_count,
    CASE 
        WHEN p.import_batch_id IS NOT NULL THEN 'imported'
        ELSE 'organic'
    END as user_origin,
    COALESCE(p.profile_completion_percentage, 0) as completion_score,
    CASE 
        WHEN p.last_login IS NULL THEN 'never_logged_in'
        WHEN p.last_login < (now() - INTERVAL '30 days') THEN 'inactive'
        WHEN p.last_login < (now() - INTERVAL '7 days') THEN 'dormant'
        ELSE 'active'
    END as activity_status
FROM public.profiles p
LEFT JOIN public.user_documents ud ON ud.user_id = p.id
LEFT JOIN public.contact_persons cp ON cp.user_id = p.id
GROUP BY p.id;

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

-- Audit logging trigger function
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only log actual changes
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

-- Update timestamps trigger for new tables
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_admin_operations_queue_updated_at
    BEFORE UPDATE ON public.admin_operations_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Cleanup function for old data
CREATE OR REPLACE FUNCTION public.cleanup_old_admin_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clean up completed operations older than 30 days
    DELETE FROM public.admin_operations_queue 
    WHERE status = 'completed' 
    AND completed_at < now() - INTERVAL '30 days';
    
    -- Clean up old audit logs (keep 1 year)
    DELETE FROM public.user_audit_log 
    WHERE created_at < now() - INTERVAL '1 year';
    
    -- Clean up old performance metrics (keep 90 days)
    DELETE FROM public.admin_performance_metrics 
    WHERE recorded_at < now() - INTERVAL '90 days';
    
    -- Clean up old session analytics (keep 6 months)
    DELETE FROM public.user_session_analytics 
    WHERE created_at < now() - INTERVAL '6 months';
END;
$$;