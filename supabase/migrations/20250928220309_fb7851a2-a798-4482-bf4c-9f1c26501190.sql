-- Enhance agent system with better commission tracking and transaction integration

-- Create function to automatically assign commissions when transactions occur through agents
CREATE OR REPLACE FUNCTION public.create_agent_commission_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_record RECORD;
  client_agent_record RECORD;
  commission_amount NUMERIC;
BEGIN
  -- Only process completed transactions
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Check if transaction is from an agent's client
  SELECT ac.agent_id, a.commission_rate, a.user_id as agent_user_id 
  INTO client_agent_record
  FROM agent_clients ac
  JOIN agents a ON a.id = ac.agent_id
  WHERE ac.client_id = NEW.user_id 
    AND ac.status = 'active'
    AND a.status = 'active'
  LIMIT 1;
    
  IF client_agent_record.agent_id IS NOT NULL THEN
    -- Calculate commission (use transaction fee amount as base)
    commission_amount := GREATEST(ABS(NEW.amount) * client_agent_record.commission_rate, 0);
    
    -- Create commission record
    INSERT INTO agent_commissions (
      agent_id,
      client_id,
      transaction_id,
      transaction_amount,
      commission_rate,
      commission_amount,
      status,
      created_at
    ) VALUES (
      client_agent_record.agent_id,
      NEW.user_id,
      NEW.id,
      ABS(NEW.amount),
      client_agent_record.commission_rate,
      commission_amount,
      'pending',
      now()
    );
    
    -- Also create entry in agent_income_streams for comprehensive tracking
    INSERT INTO agent_income_streams (
      agent_id,
      income_type,
      amount,
      currency,
      source_transaction_id,
      source_reference,
      payment_status,
      metadata,
      created_at
    ) VALUES (
      client_agent_record.agent_id,
      'agent_commission',
      commission_amount,
      NEW.currency,
      NEW.id,
      'transaction_commission',
      'pending',
      jsonb_build_object(
        'transaction_type', NEW.transaction_type,
        'transaction_amount', ABS(NEW.amount),
        'commission_rate', client_agent_record.commission_rate
      ),
      now()
    );
    
    -- Update agent statistics
    UPDATE agents 
    SET total_transaction_volume = COALESCE(total_transaction_volume, 0) + ABS(NEW.amount),
        updated_at = now()
    WHERE id = client_agent_record.agent_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic commission assignment
DROP TRIGGER IF EXISTS trigger_create_agent_commission ON transactions;
CREATE TRIGGER trigger_create_agent_commission
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION create_agent_commission_on_transaction();

-- Function to generate unique agent code
CREATE OR REPLACE FUNCTION public.generate_unique_agent_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code with current timestamp and random component
    new_code := 'AGT' || LPAD((EXTRACT(EPOCH FROM now())::BIGINT % 100000)::TEXT, 5, '0') || 
                LPAD((RANDOM() * 999)::INTEGER::TEXT, 3, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM agents WHERE agent_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to process commission payouts
CREATE OR REPLACE FUNCTION public.process_agent_commission_payout(
  p_agent_id UUID,
  p_commission_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_record RECORD;
  total_payout NUMERIC := 0;
  commission_record RECORD;
  agent_wallet_id UUID;
BEGIN
  -- Get agent details
  SELECT * INTO agent_record FROM agents WHERE id = p_agent_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agent not found or inactive');
  END IF;
  
  -- Get or create agent wallet
  SELECT id INTO agent_wallet_id 
  FROM wallets 
  WHERE user_id = agent_record.user_id AND currency = 'UGX';
  
  IF agent_wallet_id IS NULL THEN
    INSERT INTO wallets (user_id, currency, balance, status)
    VALUES (agent_record.user_id, 'UGX', 0, 'active')
    RETURNING id INTO agent_wallet_id;
  END IF;
  
  -- Process specific commissions or all pending
  IF p_commission_ids IS NOT NULL THEN
    -- Update specific commissions
    UPDATE agent_commissions 
    SET status = 'paid', paid_at = now()
    WHERE agent_id = p_agent_id 
      AND id = ANY(p_commission_ids)
      AND status = 'pending'
    RETURNING commission_amount INTO total_payout;
    
    -- Update corresponding income streams
    UPDATE agent_income_streams
    SET payment_status = 'paid', paid_at = now()
    WHERE agent_id = p_agent_id 
      AND source_transaction_id IN (
        SELECT transaction_id FROM agent_commissions 
        WHERE id = ANY(p_commission_ids)
      )
      AND payment_status = 'pending';
  ELSE
    -- Calculate total pending commissions
    SELECT COALESCE(SUM(commission_amount), 0) INTO total_payout
    FROM agent_commissions 
    WHERE agent_id = p_agent_id AND status = 'pending';
    
    -- Update all pending commissions
    UPDATE agent_commissions 
    SET status = 'paid', paid_at = now()
    WHERE agent_id = p_agent_id AND status = 'pending';
    
    -- Update corresponding income streams
    UPDATE agent_income_streams
    SET payment_status = 'paid', paid_at = now()
    WHERE agent_id = p_agent_id AND payment_status = 'pending';
  END IF;
  
  -- Add to agent wallet
  IF total_payout > 0 THEN
    UPDATE wallets 
    SET balance = balance + total_payout, updated_at = now()
    WHERE id = agent_wallet_id;
    
    -- Create transaction record
    INSERT INTO transactions (
      user_id,
      wallet_id,
      amount,
      transaction_type,
      status,
      currency,
      description
    ) VALUES (
      agent_record.user_id,
      agent_wallet_id,
      total_payout,
      'commission_payout',
      'completed',
      'UGX',
      'Agent commission payout'
    );
    
    -- Update agent total earnings
    UPDATE agents 
    SET total_earnings = COALESCE(total_earnings, 0) + total_payout,
        updated_at = now()
    WHERE id = p_agent_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'amount_paid', total_payout,
    'agent_code', agent_record.agent_code
  );
END;
$$;

-- Function to update agent performance metrics
CREATE OR REPLACE FUNCTION public.update_agent_performance_metrics(p_agent_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_record RECORD;
  performance_data RECORD;
  client_count INTEGER;
  active_client_count INTEGER;
BEGIN
  -- Get agent details
  SELECT * INTO agent_record FROM agents WHERE id = p_agent_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate performance metrics
  SELECT 
    COUNT(DISTINCT ac.client_id) as total_clients,
    COUNT(DISTINCT CASE WHEN ac.status = 'active' THEN ac.client_id END) as active_clients,
    COALESCE(SUM(c.commission_amount), 0) as total_commissions,
    COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0) as paid_commissions,
    COUNT(DISTINCT c.transaction_id) as total_transactions,
    COALESCE(AVG(c.transaction_amount), 0) as avg_transaction_size
  INTO performance_data
  FROM agent_clients ac
  LEFT JOIN agent_commissions c ON c.agent_id = ac.agent_id
  WHERE ac.agent_id = p_agent_id;
  
  -- Insert or update performance metrics for today
  INSERT INTO agent_performance_metrics (
    agent_id,
    metric_date,
    total_clients,
    active_clients,
    total_transactions_facilitated,
    total_transaction_volume,
    agent_fee_earnings,
    commission_earnings,
    total_earnings,
    average_transaction_size,
    currency
  ) VALUES (
    p_agent_id,
    CURRENT_DATE,
    performance_data.total_clients,
    performance_data.active_clients,
    performance_data.total_transactions,
    agent_record.total_transaction_volume,
    0, -- fee earnings calculated separately
    performance_data.total_commissions,
    performance_data.paid_commissions,
    performance_data.avg_transaction_size,
    'UGX'
  )
  ON CONFLICT (agent_id, metric_date) 
  DO UPDATE SET
    total_clients = EXCLUDED.total_clients,
    active_clients = EXCLUDED.active_clients,
    total_transactions_facilitated = EXCLUDED.total_transactions_facilitated,
    commission_earnings = EXCLUDED.commission_earnings,
    total_earnings = EXCLUDED.total_earnings,
    average_transaction_size = EXCLUDED.average_transaction_size,
    updated_at = now();
END;
$$;