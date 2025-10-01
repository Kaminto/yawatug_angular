-- **PHASE 2: SMS SYSTEM ENHANCEMENT - CONTINUATION**
-- Task 2: Add missing database functions for SMS system

-- Create function to update SMS budget spending
CREATE OR REPLACE FUNCTION update_sms_budget_spending(p_cost numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the active budget control
  UPDATE sms_budget_controls 
  SET 
    current_day_spent = current_day_spent + p_cost,
    current_month_spent = current_month_spent + p_cost,
    updated_at = now()
  WHERE is_active = true;
  
  -- If no active budget exists, create a default one
  IF NOT FOUND THEN
    INSERT INTO sms_budget_controls (
      budget_name, 
      monthly_budget_limit, 
      daily_budget_limit,
      current_day_spent,
      current_month_spent
    ) VALUES (
      'Auto-created Budget', 
      1000.00, 
      50.00,
      p_cost,
      p_cost
    );
  END IF;
END;
$$;

-- Create function to reset daily budget spending (to be called by a cron job)
CREATE OR REPLACE FUNCTION reset_daily_sms_budget()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sms_budget_controls 
  SET 
    current_day_spent = 0,
    updated_at = now()
  WHERE is_active = true;
END;
$$;

-- Create function to reset monthly budget spending (to be called by a cron job)
CREATE OR REPLACE FUNCTION reset_monthly_sms_budget()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sms_budget_controls 
  SET 
    current_month_spent = 0,
    updated_at = now()
  WHERE is_active = true;
END;
$$;

-- Create function to get SMS provider by priority
CREATE OR REPLACE FUNCTION get_sms_providers_by_priority()
RETURNS TABLE(
  id uuid,
  provider_name text,
  provider_type text,
  api_endpoint text,
  cost_per_sms numeric,
  timeout_seconds integer,
  retry_attempts integer,
  configuration jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.provider_name,
    p.provider_type,
    p.api_endpoint,
    p.cost_per_sms,
    p.timeout_seconds,
    p.retry_attempts,
    p.configuration
  FROM sms_providers p
  WHERE p.is_active = true
  ORDER BY p.priority_order ASC;
END;
$$;

-- Reduce OTP expiry from 10 minutes to 5 minutes (security improvement)
-- Update default OTP expiry in existing configuration
UPDATE sms_config 
SET config_value = jsonb_set(
  config_value::jsonb, 
  '{expiry_minutes}', 
  '5'::jsonb
) 
WHERE config_key = 'otp_settings';

-- Create webhook endpoint function for SMS delivery confirmations
CREATE OR REPLACE FUNCTION process_sms_delivery_webhook(
  p_provider_name text,
  p_webhook_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  delivery_log_id uuid;
  delivery_status text;
  delivered_at_timestamp timestamp with time zone;
BEGIN
  -- Extract status based on provider
  IF p_provider_name = 'Twilio' THEN
    delivery_status := CASE 
      WHEN p_webhook_data->>'MessageStatus' IN ('delivered', 'sent') THEN 'delivered'
      WHEN p_webhook_data->>'MessageStatus' IN ('failed', 'undelivered') THEN 'failed'
      ELSE 'pending'
    END;
    delivered_at_timestamp := CASE 
      WHEN delivery_status = 'delivered' THEN now()
      ELSE null
    END;
  ELSIF p_provider_name = 'EasyUganda' THEN
    delivery_status := CASE 
      WHEN p_webhook_data->>'status' = 'delivered' THEN 'delivered'
      WHEN p_webhook_data->>'status' = 'failed' THEN 'failed'
      ELSE 'pending'
    END;
    delivered_at_timestamp := CASE 
      WHEN delivery_status = 'delivered' THEN now()
      ELSE null
    END;
  ELSE
    -- Generic handling
    delivery_status := COALESCE(p_webhook_data->>'status', 'unknown');
    delivered_at_timestamp := now();
  END IF;

  -- Update the delivery log
  UPDATE sms_delivery_logs 
  SET 
    status = delivery_status,
    delivered_at = delivered_at_timestamp,
    delivery_confirmation_received = true,
    webhook_received_at = now(),
    provider_response = jsonb_set(
      COALESCE(provider_response, '{}'::jsonb),
      '{webhook_data}',
      p_webhook_data
    ),
    updated_at = now()
  WHERE 
    provider_name = p_provider_name
    AND status IN ('sent', 'pending')
    AND delivery_confirmation_received = false
    -- Match based on provider-specific message ID
    AND (
      (p_provider_name = 'Twilio' AND provider_response->>'sid' = p_webhook_data->>'MessageSid')
      OR 
      (p_provider_name = 'EasyUganda' AND provider_response->>'message_id' = p_webhook_data->>'message_id')
    );
END;
$$;

-- Create function to get SMS analytics for dashboard
CREATE OR REPLACE FUNCTION get_sms_analytics_summary(
  p_start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_sent bigint,
  total_delivered bigint,
  total_failed bigint,
  success_rate numeric,
  total_cost numeric,
  avg_cost_per_sms numeric,
  top_provider text,
  daily_breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  analytics_result record;
BEGIN
  -- Get overall statistics
  SELECT 
    COALESCE(SUM(sa.total_sent), 0) as tot_sent,
    COALESCE(SUM(sa.total_delivered), 0) as tot_delivered,
    COALESCE(SUM(sa.total_failed), 0) as tot_failed,
    COALESCE(SUM(sa.total_cost), 0) as tot_cost
  INTO analytics_result
  FROM sms_analytics sa
  WHERE sa.date BETWEEN p_start_date AND p_end_date;

  RETURN QUERY
  SELECT
    analytics_result.tot_sent,
    analytics_result.tot_delivered,
    analytics_result.tot_failed,
    CASE 
      WHEN analytics_result.tot_sent > 0 
      THEN ROUND((analytics_result.tot_delivered::numeric / analytics_result.tot_sent::numeric) * 100, 2)
      ELSE 0::numeric 
    END as success_rate,
    analytics_result.tot_cost,
    CASE 
      WHEN analytics_result.tot_sent > 0 
      THEN ROUND(analytics_result.tot_cost / analytics_result.tot_sent, 4)
      ELSE 0::numeric 
    END as avg_cost_per_sms,
    (
      SELECT sp.provider_name
      FROM sms_analytics sa2
      JOIN sms_providers sp ON sa2.provider_id = sp.id
      WHERE sa2.date BETWEEN p_start_date AND p_end_date
      GROUP BY sp.provider_name
      ORDER BY SUM(sa2.total_sent) DESC
      LIMIT 1
    ) as top_provider,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', sa3.date,
          'sent', sa3.total_sent,
          'delivered', sa3.total_delivered,
          'failed', sa3.total_failed,
          'cost', sa3.total_cost
        )
        ORDER BY sa3.date
      )
      FROM sms_analytics sa3
      WHERE sa3.date BETWEEN p_start_date AND p_end_date
    ) as daily_breakdown;
END;
$$;