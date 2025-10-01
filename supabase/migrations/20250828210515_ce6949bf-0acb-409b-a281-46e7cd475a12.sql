-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add update_interval_hours column to admin_dynamic_pricing_settings if not exists
ALTER TABLE admin_dynamic_pricing_settings 
ADD COLUMN IF NOT EXISTS update_interval_hours integer DEFAULT 24;

-- Create cron management table
CREATE TABLE IF NOT EXISTS auto_pricing_cron_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name text NOT NULL UNIQUE,
  cron_expression text NOT NULL,
  is_active boolean DEFAULT true,
  last_execution timestamp with time zone,
  next_execution timestamp with time zone,
  execution_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE auto_pricing_cron_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage auto pricing cron jobs" 
ON auto_pricing_cron_jobs 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create function to manage auto pricing cron jobs
CREATE OR REPLACE FUNCTION manage_auto_pricing_cron(
  p_interval_hours integer,
  p_enabled boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cron_expression text;
  job_name text := 'auto_pricing_scheduler';
  result jsonb;
BEGIN
  -- Only admins can manage cron jobs
  IF NOT is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin permissions required');
  END IF;

  -- Delete existing cron job
  PERFORM cron.unschedule(job_name);
  
  IF NOT p_enabled THEN
    -- Update cron job record as inactive
    UPDATE auto_pricing_cron_jobs 
    SET is_active = false, updated_at = now()
    WHERE job_name = job_name;
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Auto pricing cron job disabled',
      'job_name', job_name
    );
  END IF;

  -- Create cron expression based on interval
  IF p_interval_hours = 1 THEN
    cron_expression := '0 * * * *'; -- Every hour
  ELSIF p_interval_hours = 4 THEN
    cron_expression := '0 */4 * * *'; -- Every 4 hours
  ELSIF p_interval_hours = 6 THEN
    cron_expression := '0 */6 * * *'; -- Every 6 hours
  ELSIF p_interval_hours = 12 THEN
    cron_expression := '0 */12 * * *'; -- Every 12 hours
  ELSIF p_interval_hours = 24 THEN
    cron_expression := '0 0 * * *'; -- Daily at midnight
  ELSIF p_interval_hours = 168 THEN
    cron_expression := '0 0 * * 0'; -- Weekly on Sunday
  ELSE
    -- For custom intervals, use hourly multiplier
    cron_expression := format('0 */%s * * *', p_interval_hours);
  END IF;

  -- Schedule the cron job
  PERFORM cron.schedule(
    job_name,
    cron_expression,
    $$
    SELECT net.http_post(
      url := 'https://lqmcokwbqnjuufcvodos.supabase.co/functions/v1/trigger-auto-pricing',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxbWNva3dicW5qdXVmY3ZvZG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNTA2ODksImV4cCI6MjA2MjgyNjY4OX0.NGjUtUJJaChBRTBsHMCV_20ZZNp1f9iB0RHRM65Dksw"}'::jsonb,
      body := '{"automated": true}'::jsonb
    ) as request_id;
    $$
  );

  -- Update or insert cron job record
  INSERT INTO auto_pricing_cron_jobs (job_name, cron_expression, is_active)
  VALUES (job_name, cron_expression, true)
  ON CONFLICT (job_name) DO UPDATE SET
    cron_expression = EXCLUDED.cron_expression,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  result := jsonb_build_object(
    'success', true,
    'message', 'Auto pricing cron job scheduled successfully',
    'job_name', job_name,
    'cron_expression', cron_expression,
    'interval_hours', p_interval_hours
  );

  RETURN result;
END;
$$;

-- Function to get cron job status
CREATE OR REPLACE FUNCTION get_auto_pricing_cron_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_record record;
  system_job record;
  result jsonb;
BEGIN
  -- Get our job record
  SELECT * INTO job_record
  FROM auto_pricing_cron_jobs
  WHERE job_name = 'auto_pricing_scheduler'
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Get system cron job info
  SELECT * INTO system_job
  FROM cron.job
  WHERE jobname = 'auto_pricing_scheduler';

  result := jsonb_build_object(
    'job_exists', job_record IS NOT NULL,
    'is_active', COALESCE(job_record.is_active, false),
    'cron_expression', job_record.cron_expression,
    'last_execution', job_record.last_execution,
    'execution_count', COALESCE(job_record.execution_count, 0),
    'system_job_active', system_job IS NOT NULL AND system_job.active,
    'created_at', job_record.created_at,
    'updated_at', job_record.updated_at
  );

  RETURN result;
END;
$$;

-- Create function to log cron execution
CREATE OR REPLACE FUNCTION log_cron_execution()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auto_pricing_cron_jobs 
  SET 
    last_execution = now(),
    execution_count = execution_count + 1,
    next_execution = now() + interval '1 hour' * (
      SELECT update_interval_hours 
      FROM admin_dynamic_pricing_settings 
      WHERE is_enabled = true 
      ORDER BY created_at DESC 
      LIMIT 1
    )
  WHERE job_name = 'auto_pricing_scheduler';
END;
$$;