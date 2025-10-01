-- Phase 3: Email System Enhancement - Add missing database functions
-- Create function to update email budget spending
CREATE OR REPLACE FUNCTION update_email_budget_spending(p_cost numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update the active budget control
  UPDATE public.email_budget_controls 
  SET 
    current_spending = current_spending + p_cost,
    current_daily_count = current_daily_count + 1,
    current_monthly_count = current_monthly_count + 1,
    updated_at = now()
  WHERE is_active = true;
  
  -- If no active budget exists, create a default one
  IF NOT FOUND THEN
    INSERT INTO public.email_budget_controls (
      budget_type, 
      max_budget, 
      max_emails_per_day,
      max_emails_per_month,
      current_spending,
      current_daily_count,
      current_monthly_count
    ) VALUES (
      'default', 
      500.00, 
      1000,
      30000,
      p_cost,
      1,
      1
    );
  END IF;
END;
$$;

-- Create function to reset daily email budget (to be called by a cron job)
CREATE OR REPLACE FUNCTION reset_daily_email_budget()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.email_budget_controls 
  SET 
    current_daily_count = 0,
    updated_at = now()
  WHERE is_active = true;
END;
$$;

-- Create function to reset monthly email budget (to be called by a cron job)
CREATE OR REPLACE FUNCTION reset_monthly_email_budget()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.email_budget_controls 
  SET 
    current_monthly_count = 0,
    current_spending = 0,
    updated_at = now()
  WHERE is_active = true;
END;
$$;

-- Create function to get email providers by priority
CREATE OR REPLACE FUNCTION get_email_providers_by_priority()
RETURNS TABLE(
  id uuid,
  name text,
  provider_type text,
  api_endpoint text,
  cost_per_email numeric,
  configuration jsonb,
  daily_limit integer,
  monthly_limit integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.provider_type,
    p.api_endpoint,
    p.cost_per_email,
    p.configuration,
    p.daily_limit,
    p.monthly_limit
  FROM public.email_providers p
  WHERE p.is_active = true
  ORDER BY p.priority ASC;
END;
$$;

-- Create webhook endpoint function for email delivery confirmations
CREATE OR REPLACE FUNCTION process_email_delivery_webhook(
  p_provider_name text,
  p_webhook_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivery_status text;
  delivered_at_timestamp timestamp with time zone;
BEGIN
  -- Extract status based on provider
  IF p_provider_name = 'Resend' THEN
    delivery_status := CASE 
      WHEN p_webhook_data->>'type' = 'email.delivered' THEN 'delivered'
      WHEN p_webhook_data->>'type' = 'email.bounced' THEN 'bounced'
      WHEN p_webhook_data->>'type' = 'email.complained' THEN 'failed'
      ELSE 'pending'
    END;
    delivered_at_timestamp := CASE 
      WHEN delivery_status IN ('delivered', 'bounced', 'failed') THEN now()
      ELSE null
    END;
  ELSIF p_provider_name = 'SendGrid' THEN
    delivery_status := CASE 
      WHEN p_webhook_data->>'event' = 'delivered' THEN 'delivered'
      WHEN p_webhook_data->>'event' = 'bounce' THEN 'bounced'
      WHEN p_webhook_data->>'event' = 'dropped' THEN 'failed'
      ELSE 'pending'
    END;
    delivered_at_timestamp := CASE 
      WHEN delivery_status IN ('delivered', 'bounced', 'failed') THEN now()
      ELSE null
    END;
  ELSE
    -- Generic handling
    delivery_status := COALESCE(p_webhook_data->>'status', 'unknown');
    delivered_at_timestamp := now();
  END IF;

  -- Update the delivery log
  UPDATE public.email_delivery_logs 
  SET 
    status = delivery_status,
    delivered_at = delivered_at_timestamp,
    bounced_at = CASE WHEN delivery_status = 'bounced' THEN now() ELSE bounced_at END,
    failed_at = CASE WHEN delivery_status = 'failed' THEN now() ELSE failed_at END,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{webhook_data}',
      p_webhook_data
    ),
    updated_at = now()
  WHERE 
    status IN ('sent', 'pending')
    -- Match based on provider-specific message ID
    AND (
      (p_provider_name = 'Resend' AND provider_message_id = p_webhook_data->>'id')
      OR 
      (p_provider_name = 'SendGrid' AND provider_message_id = p_webhook_data->>'sg_message_id')
    );
END;
$$;

-- Create function to get email analytics summary
CREATE OR REPLACE FUNCTION get_email_analytics_summary(
  p_start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_sent bigint,
  total_delivered bigint,
  total_bounced bigint,
  total_failed bigint,
  delivery_rate numeric,
  bounce_rate numeric,
  total_cost numeric,
  avg_cost_per_email numeric,
  top_provider text,
  daily_breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  analytics_result record;
BEGIN
  -- Get overall statistics
  SELECT 
    COALESCE(SUM(ea.total_sent), 0) as tot_sent,
    COALESCE(SUM(ea.total_delivered), 0) as tot_delivered,
    COALESCE(SUM(ea.total_bounced), 0) as tot_bounced,
    COALESCE(SUM(ea.total_failed), 0) as tot_failed,
    COALESCE(SUM(ea.total_cost), 0) as tot_cost
  INTO analytics_result
  FROM public.email_analytics ea
  WHERE ea.analytics_date BETWEEN p_start_date AND p_end_date;

  RETURN QUERY
  SELECT
    analytics_result.tot_sent,
    analytics_result.tot_delivered,
    analytics_result.tot_bounced,
    analytics_result.tot_failed,
    CASE 
      WHEN analytics_result.tot_sent > 0 
      THEN ROUND((analytics_result.tot_delivered::numeric / analytics_result.tot_sent::numeric) * 100, 2)
      ELSE 0::numeric 
    END as delivery_rate,
    CASE 
      WHEN analytics_result.tot_sent > 0 
      THEN ROUND((analytics_result.tot_bounced::numeric / analytics_result.tot_sent::numeric) * 100, 2)
      ELSE 0::numeric 
    END as bounce_rate,
    analytics_result.tot_cost,
    CASE 
      WHEN analytics_result.tot_sent > 0 
      THEN ROUND(analytics_result.tot_cost / analytics_result.tot_sent, 4)
      ELSE 0::numeric 
    END as avg_cost_per_email,
    (
      SELECT ep.name
      FROM public.email_analytics ea2
      JOIN public.email_providers ep ON ea2.provider_id = ep.id
      WHERE ea2.analytics_date BETWEEN p_start_date AND p_end_date
      GROUP BY ep.name
      ORDER BY SUM(ea2.total_sent) DESC
      LIMIT 1
    ) as top_provider,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', ea3.analytics_date,
          'sent', ea3.total_sent,
          'delivered', ea3.total_delivered,
          'bounced', ea3.total_bounced,
          'failed', ea3.total_failed,
          'cost', ea3.total_cost
        )
        ORDER BY ea3.analytics_date
      )
      FROM public.email_analytics ea3
      WHERE ea3.analytics_date BETWEEN p_start_date AND p_end_date
    ) as daily_breakdown;
END;
$$;