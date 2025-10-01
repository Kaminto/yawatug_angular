-- Fix missing RLS policies for tables with RLS enabled but no policies

-- Add RLS policy for announcements table
CREATE POLICY "Users can view published announcements" ON public.announcements
FOR SELECT 
USING (is_published = true);

CREATE POLICY "Admins can manage announcements" ON public.announcements
FOR ALL 
USING (is_admin(auth.uid()));

-- Add RLS policy for balance_update_logs table  
CREATE POLICY "Admins can view balance update logs" ON public.balance_update_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Add RLS policy for biometric_settings table
CREATE POLICY "Users can manage their own biometric settings" ON public.biometric_settings
FOR ALL
USING (auth.uid() = user_id);

-- Add RLS policy for bulk_operations_log table
CREATE POLICY "Admins can view bulk operations log" ON public.bulk_operations_log
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create bulk operations log" ON public.bulk_operations_log
FOR INSERT
WITH CHECK (is_admin(auth.uid()));