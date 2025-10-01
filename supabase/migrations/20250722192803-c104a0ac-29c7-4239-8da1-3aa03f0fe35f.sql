
-- Enhanced Agent System with Multi-Income Streams

-- Create agent income streams table
CREATE TABLE IF NOT EXISTS agent_income_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
    income_type TEXT NOT NULL CHECK (income_type IN ('agent_commission', 'transaction_fee_share', 'referral_commission', 'dividend_income', 'capital_gains')),
    amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'UGX',
    source_transaction_id UUID,
    source_reference TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processed', 'paid', 'failed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB
);

-- Create agent transaction fees table for fee sharing tracking
CREATE TABLE IF NOT EXISTS agent_transaction_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL,
    transaction_amount NUMERIC NOT NULL,
    total_fee_amount NUMERIC NOT NULL,
    agent_fee_share_percentage NUMERIC NOT NULL DEFAULT 30,
    agent_fee_amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UGX',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processed', 'paid', 'failed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create agent performance metrics table
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_clients INTEGER DEFAULT 0,
    active_clients INTEGER DEFAULT 0,
    new_clients_month INTEGER DEFAULT 0,
    total_transactions_facilitated INTEGER DEFAULT 0,
    total_transaction_volume NUMERIC DEFAULT 0,
    total_fees_generated NUMERIC DEFAULT 0,
    agent_fee_earnings NUMERIC DEFAULT 0,
    commission_earnings NUMERIC DEFAULT 0,
    referral_earnings NUMERIC DEFAULT 0,
    dividend_earnings NUMERIC DEFAULT 0,
    capital_gains NUMERIC DEFAULT 0,
    total_earnings NUMERIC DEFAULT 0,
    client_retention_rate NUMERIC DEFAULT 0,
    average_transaction_size NUMERIC DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'UGX',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(agent_id, metric_date)
);

-- Add tier system and performance fields to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
ADD COLUMN IF NOT EXISTS fee_share_percentage NUMERIC DEFAULT 30,
ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_clients INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_clients INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_transaction_volume NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_fees_generated NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_performance_update TIMESTAMP WITH TIME ZONE;

-- Create function to calculate agent tier based on performance
CREATE OR REPLACE FUNCTION calculate_agent_tier(p_agent_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_clients INTEGER := 0;
  agent_volume NUMERIC := 0;
  new_tier TEXT := 'bronze';
BEGIN
  -- Get agent metrics
  SELECT total_clients, total_transaction_volume 
  INTO agent_clients, agent_volume
  FROM agents 
  WHERE id = p_agent_id;
  
  -- Calculate tier based on clients and volume
  IF agent_clients >= 50 AND agent_volume >= 50000000 THEN
    new_tier := 'platinum';
  ELSIF agent_clients >= 26 AND agent_volume >= 25000000 THEN
    new_tier := 'gold';
  ELSIF agent_clients >= 11 AND agent_volume >= 10000000 THEN
    new_tier := 'silver';
  ELSE
    new_tier := 'bronze';
  END IF;
  
  RETURN new_tier;
END;
$$;

-- Create function to get agent tier benefits
CREATE OR REPLACE FUNCTION get_agent_tier_benefits(p_tier TEXT)
RETURNS TABLE(
  commission_rate NUMERIC,
  fee_share_percentage NUMERIC,
  tier_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE p_tier
      WHEN 'platinum' THEN 0.06::NUMERIC
      WHEN 'gold' THEN 0.05::NUMERIC
      WHEN 'silver' THEN 0.04::NUMERIC
      ELSE 0.03::NUMERIC
    END as commission_rate,
    CASE p_tier
      WHEN 'platinum' THEN 40::NUMERIC
      WHEN 'gold' THEN 35::NUMERIC
      WHEN 'silver' THEN 30::NUMERIC
      ELSE 25::NUMERIC
    END as fee_share_percentage,
    p_tier as tier_name;
END;
$$;

-- Create function to process agent transaction fee sharing
CREATE OR REPLACE FUNCTION process_agent_transaction_fee_share(
  p_transaction_id UUID,
  p_agent_id UUID,
  p_client_id UUID,
  p_fee_amount NUMERIC,
  p_currency TEXT DEFAULT 'UGX'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_tier TEXT;
  fee_share_percentage NUMERIC;
  agent_fee_amount NUMERIC;
  admin_fund_id UUID;
  agent_wallet_id UUID;
  transaction_record RECORD;
  result JSONB;
BEGIN
  -- Get transaction details
  SELECT * INTO transaction_record
  FROM transactions
  WHERE id = p_transaction_id;
  
  -- Get agent tier and fee share percentage
  SELECT tier INTO agent_tier FROM agents WHERE id = p_agent_id;
  SELECT fee_share_percentage INTO fee_share_percentage 
  FROM get_agent_tier_benefits(agent_tier);
  
  -- Calculate agent fee amount
  agent_fee_amount := (p_fee_amount * fee_share_percentage) / 100;
  
  -- Get admin fund for fee sharing
  SELECT id INTO admin_fund_id
  FROM admin_sub_wallets
  WHERE wallet_type = 'admin_fund' AND currency = p_currency
  LIMIT 1;
  
  -- Get agent wallet
  SELECT id INTO agent_wallet_id
  FROM wallets
  WHERE user_id = (SELECT user_id FROM agents WHERE id = p_agent_id)
    AND currency = p_currency
  LIMIT 1;
  
  IF admin_fund_id IS NOT NULL AND agent_wallet_id IS NOT NULL THEN
    -- Check admin fund balance
    IF (SELECT balance FROM admin_sub_wallets WHERE id = admin_fund_id) >= agent_fee_amount THEN
      -- Deduct from admin fund
      UPDATE admin_sub_wallets
      SET balance = balance - agent_fee_amount,
          updated_at = now()
      WHERE id = admin_fund_id;
      
      -- Credit agent wallet
      UPDATE wallets
      SET balance = balance + agent_fee_amount,
          updated_at = now()
      WHERE id = agent_wallet_id;
      
      -- Record agent transaction fee
      INSERT INTO agent_transaction_fees (
        agent_id, transaction_id, client_id, transaction_type,
        transaction_amount, total_fee_amount, agent_fee_share_percentage,
        agent_fee_amount, currency, payment_status, processed_at
      ) VALUES (
        p_agent_id, p_transaction_id, p_client_id, transaction_record.transaction_type,
        ABS(transaction_record.amount), p_fee_amount, fee_share_percentage,
        agent_fee_amount, p_currency, 'paid', now()
      );
      
      -- Record income stream
      INSERT INTO agent_income_streams (
        agent_id, income_type, amount, currency, source_transaction_id,
        source_reference, payment_status, processed_at, paid_at
      ) VALUES (
        p_agent_id, 'transaction_fee_share', agent_fee_amount, p_currency,
        p_transaction_id, 'FEE-SHARE-' || p_transaction_id, 'paid', now(), now()
      );
      
      -- Record admin fund transfer
      INSERT INTO admin_wallet_fund_transfers (
        from_wallet_id, amount, currency, transfer_type, description, reference
      ) VALUES (
        admin_fund_id, agent_fee_amount, p_currency, 'agent_fee_share',
        'Agent transaction fee sharing for transaction: ' || p_transaction_id,
        'AGENT-FEE-' || p_transaction_id
      );
      
      result := jsonb_build_object(
        'success', true,
        'agent_fee_amount', agent_fee_amount,
        'fee_share_percentage', fee_share_percentage,
        'tier', agent_tier
      );
    ELSE
      result := jsonb_build_object(
        'success', false,
        'error', 'Insufficient admin fund balance'
      );
    END IF;
  ELSE
    result := jsonb_build_object(
      'success', false,
      'error', 'Admin fund or agent wallet not found'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Create function to update agent performance metrics
CREATE OR REPLACE FUNCTION update_agent_performance_metrics(p_agent_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  metrics_record RECORD;
  new_tier TEXT;
  tier_benefits RECORD;
BEGIN
  -- Calculate current metrics
  WITH agent_stats AS (
    SELECT 
      COUNT(DISTINCT ac.client_id) as total_clients,
      COUNT(DISTINCT CASE WHEN ac.status = 'active' THEN ac.client_id END) as active_clients,
      COUNT(DISTINCT CASE WHEN ac.created_at::date >= date_trunc('month', CURRENT_DATE) THEN ac.client_id END) as new_clients_month,
      COALESCE(SUM(t.amount), 0) as total_transaction_volume,
      COUNT(t.id) as total_transactions,
      COALESCE(SUM(tfc.actual_fee_collected), 0) as total_fees_generated
    FROM agents a
    LEFT JOIN agent_clients ac ON a.id = ac.agent_id
    LEFT JOIN transactions t ON ac.client_id = t.user_id AND t.status = 'completed'
    LEFT JOIN transaction_fee_collections tfc ON t.id = tfc.transaction_id
    WHERE a.id = p_agent_id
  ),
  income_stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN income_type = 'transaction_fee_share' THEN amount END), 0) as fee_earnings,
      COALESCE(SUM(CASE WHEN income_type = 'agent_commission' THEN amount END), 0) as commission_earnings,
      COALESCE(SUM(CASE WHEN income_type = 'referral_commission' THEN amount END), 0) as referral_earnings,
      COALESCE(SUM(CASE WHEN income_type = 'dividend_income' THEN amount END), 0) as dividend_earnings,
      COALESCE(SUM(CASE WHEN income_type = 'capital_gains' THEN amount END), 0) as capital_gains,
      COALESCE(SUM(amount), 0) as total_earnings
    FROM agent_income_streams
    WHERE agent_id = p_agent_id AND payment_status = 'paid'
  )
  SELECT 
    s.total_clients, s.active_clients, s.new_clients_month,
    s.total_transactions, s.total_transaction_volume, s.total_fees_generated,
    i.fee_earnings, i.commission_earnings, i.referral_earnings,
    i.dividend_earnings, i.capital_gains, i.total_earnings,
    CASE WHEN s.total_clients > 0 THEN (s.active_clients::NUMERIC / s.total_clients * 100) ELSE 0 END as retention_rate,
    CASE WHEN s.total_transactions > 0 THEN (s.total_transaction_volume / s.total_transactions) ELSE 0 END as avg_transaction_size
  INTO metrics_record
  FROM agent_stats s
  CROSS JOIN income_stats i;
  
  -- Insert or update performance metrics
  INSERT INTO agent_performance_metrics (
    agent_id, metric_date, total_clients, active_clients, new_clients_month,
    total_transactions_facilitated, total_transaction_volume, total_fees_generated,
    agent_fee_earnings, commission_earnings, referral_earnings,
    dividend_earnings, capital_gains, total_earnings,
    client_retention_rate, average_transaction_size
  ) VALUES (
    p_agent_id, current_date, metrics_record.total_clients, metrics_record.active_clients,
    metrics_record.new_clients_month, metrics_record.total_transactions,
    metrics_record.total_transaction_volume, metrics_record.total_fees_generated,
    metrics_record.fee_earnings, metrics_record.commission_earnings, metrics_record.referral_earnings,
    metrics_record.dividend_earnings, metrics_record.capital_gains, metrics_record.total_earnings,
    metrics_record.retention_rate, metrics_record.avg_transaction_size
  )
  ON CONFLICT (agent_id, metric_date) DO UPDATE SET
    total_clients = EXCLUDED.total_clients,
    active_clients = EXCLUDED.active_clients,
    new_clients_month = EXCLUDED.new_clients_month,
    total_transactions_facilitated = EXCLUDED.total_transactions_facilitated,
    total_transaction_volume = EXCLUDED.total_transaction_volume,
    total_fees_generated = EXCLUDED.total_fees_generated,
    agent_fee_earnings = EXCLUDED.agent_fee_earnings,
    commission_earnings = EXCLUDED.commission_earnings,
    referral_earnings = EXCLUDED.referral_earnings,
    dividend_earnings = EXCLUDED.dividend_earnings,
    capital_gains = EXCLUDED.capital_gains,
    total_earnings = EXCLUDED.total_earnings,
    client_retention_rate = EXCLUDED.client_retention_rate,
    average_transaction_size = EXCLUDED.average_transaction_size,
    updated_at = now();
    
  -- Update agent summary data
  UPDATE agents 
  SET 
    total_clients = metrics_record.total_clients,
    active_clients = metrics_record.active_clients,
    total_transaction_volume = metrics_record.total_transaction_volume,
    total_fees_generated = metrics_record.total_fees_generated,
    total_earnings = metrics_record.total_earnings,
    last_performance_update = now()
  WHERE id = p_agent_id;
  
  -- Calculate and update tier
  new_tier := calculate_agent_tier(p_agent_id);
  SELECT * INTO tier_benefits FROM get_agent_tier_benefits(new_tier);
  
  UPDATE agents 
  SET 
    tier = new_tier,
    commission_rate = tier_benefits.commission_rate,
    fee_share_percentage = tier_benefits.fee_share_percentage
  WHERE id = p_agent_id;
END;
$$;

-- Create trigger to automatically process agent fee sharing on fee collections
CREATE OR REPLACE FUNCTION auto_process_agent_fee_sharing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_id UUID;
  client_user_id UUID;
BEGIN
  -- Only process allocated fee collections
  IF NEW.allocation_status = 'allocated' AND 
     (OLD.allocation_status IS NULL OR OLD.allocation_status != 'allocated') THEN
    
    -- Check if transaction user has an assigned agent
    SELECT ac.agent_id, ac.client_id 
    INTO agent_id, client_user_id
    FROM agent_clients ac
    WHERE ac.client_id = NEW.user_id AND ac.status = 'active'
    LIMIT 1;
    
    IF agent_id IS NOT NULL THEN
      -- Process agent fee sharing
      PERFORM process_agent_transaction_fee_share(
        NEW.transaction_id,
        agent_id,
        client_user_id,
        NEW.actual_fee_collected,
        NEW.currency
      );
      
      -- Update agent performance metrics
      PERFORM update_agent_performance_metrics(agent_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic agent fee sharing
DROP TRIGGER IF EXISTS auto_process_agent_fee_sharing_trigger ON transaction_fee_collections;
CREATE TRIGGER auto_process_agent_fee_sharing_trigger
  AFTER UPDATE ON transaction_fee_collections
  FOR EACH ROW
  EXECUTE FUNCTION auto_process_agent_fee_sharing();

-- Create function to process agent dividend income
CREATE OR REPLACE FUNCTION process_agent_dividend_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_record RECORD;
BEGIN
  -- Check if the dividend recipient is an agent
  SELECT a.* INTO agent_record
  FROM agents a
  WHERE a.user_id = NEW.user_id;
  
  IF FOUND THEN
    -- Record agent dividend income
    INSERT INTO agent_income_streams (
      agent_id, income_type, amount, currency, source_reference,
      payment_status, processed_at, paid_at, metadata
    ) VALUES (
      agent_record.id, 'dividend_income', NEW.amount, 'UGX',
      'DIV-' || NEW.dividend_declaration_id, 'paid', now(), now(),
      jsonb_build_object(
        'dividend_declaration_id', NEW.dividend_declaration_id,
        'shares_owned', NEW.shares_owned
      )
    );
    
    -- Update agent performance metrics
    PERFORM update_agent_performance_metrics(agent_record.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for agent dividend tracking
DROP TRIGGER IF EXISTS track_agent_dividend_income_trigger ON dividend_payments;
CREATE TRIGGER track_agent_dividend_income_trigger
  AFTER INSERT ON dividend_payments
  FOR EACH ROW
  EXECUTE FUNCTION process_agent_dividend_income();

-- Enable RLS on new tables
ALTER TABLE agent_income_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_transaction_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agent income streams
CREATE POLICY "Agents can view their own income streams"
  ON agent_income_streams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE id = agent_income_streams.agent_id 
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all agent income streams"
  ON agent_income_streams FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage agent income streams"
  ON agent_income_streams FOR ALL
  USING (is_admin(auth.uid()));

-- Create RLS policies for agent transaction fees
CREATE POLICY "Agents can view their own transaction fees"
  ON agent_transaction_fees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE id = agent_transaction_fees.agent_id 
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all agent transaction fees"
  ON agent_transaction_fees FOR SELECT
  USING (is_admin(auth.uid()));

-- Create RLS policies for agent performance metrics
CREATE POLICY "Agents can view their own performance metrics"
  ON agent_performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE id = agent_performance_metrics.agent_id 
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all agent performance metrics"
  ON agent_performance_metrics FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage agent performance metrics"
  ON agent_performance_metrics FOR ALL
  USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_income_streams_agent_id ON agent_income_streams(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_income_streams_income_type ON agent_income_streams(income_type);
CREATE INDEX IF NOT EXISTS idx_agent_income_streams_payment_status ON agent_income_streams(payment_status);
CREATE INDEX IF NOT EXISTS idx_agent_transaction_fees_agent_id ON agent_transaction_fees(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_transaction_fees_transaction_id ON agent_transaction_fees(transaction_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent_id ON agent_performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_metric_date ON agent_performance_metrics(metric_date);
