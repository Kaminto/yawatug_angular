-- Phase 1: Database Schema Enhancement for Share Stock Movement Tracking

-- 1.1 Drop constraint temporarily, update data, then add new constraint
DO $$
BEGIN
  -- Drop constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'share_stock_movements_movement_type_check'
    AND table_name = 'share_stock_movements'
  ) THEN
    ALTER TABLE share_stock_movements DROP CONSTRAINT share_stock_movements_movement_type_check;
  END IF;
END $$;

-- Migrate existing movement_type values
UPDATE share_stock_movements 
SET movement_type = CASE
  WHEN movement_type = 'share_purchase' THEN 'purchase'
  WHEN movement_type = 'share_booking' THEN 'booking'
  ELSE movement_type
END
WHERE movement_type IN ('share_purchase', 'share_booking');

-- Add comprehensive CHECK constraint
ALTER TABLE share_stock_movements 
ADD CONSTRAINT share_stock_movements_movement_type_check 
CHECK (movement_type IN (
  'purchase', 'booking', 'booking_payment', 'booking_completion',
  'company_issue', 'reserve_issue', 'dividend_issue', 'share_sale',
  'transfer_out', 'transfer_in'
));

-- 1.2 Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='share_stock_movements' AND column_name='admin_id') THEN
    ALTER TABLE share_stock_movements ADD COLUMN admin_id UUID REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='share_stock_movements' AND column_name='reference_type') THEN
    ALTER TABLE share_stock_movements ADD COLUMN reference_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='share_stock_movements' AND column_name='reference_id') THEN
    ALTER TABLE share_stock_movements ADD COLUMN reference_id UUID;
  END IF;
END $$;

-- 1.3 Update share_transactions table
ALTER TABLE share_transactions DROP CONSTRAINT IF EXISTS share_transactions_transaction_type_check;
ALTER TABLE share_transactions 
ADD CONSTRAINT share_transactions_transaction_type_check 
CHECK (transaction_type IN (
  'buy', 'purchase', 'sell', 'sale', 'company_issue', 'reserve_issue',
  'dividend_issue', 'transfer_out', 'transfer_in', 'booking', 'booking_payment'
));

-- 1.4 Create indexes
CREATE INDEX IF NOT EXISTS idx_share_stock_movements_user_share ON share_stock_movements(user_id, share_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_stock_movements_type_status ON share_stock_movements(movement_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_stock_movements_reference ON share_stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_share_transactions_user_type ON share_transactions(user_id, transaction_type, created_at DESC);

-- 1.5 Create balance calculation function
CREATE OR REPLACE FUNCTION calculate_user_share_balance(p_user_id UUID, p_share_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_balance INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN destination_bucket = 'user_holdings' AND user_id = p_user_id THEN quantity
      WHEN source_bucket = 'user_holdings' AND user_id = p_user_id THEN -quantity
      ELSE 0
    END
  ), 0)
  INTO total_balance
  FROM share_stock_movements
  WHERE share_id = p_share_id AND status = 'completed'
    AND (user_id = p_user_id OR (source_bucket = 'user_holdings' AND user_id = p_user_id));
  
  RETURN total_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.6 Create materialized view
DROP MATERIALIZED VIEW IF EXISTS user_share_balances_calculated CASCADE;
CREATE MATERIALIZED VIEW user_share_balances_calculated AS
SELECT 
  user_id, share_id,
  calculate_user_share_balance(user_id, share_id) as calculated_balance,
  (SELECT COALESCE(SUM(quantity), 0) FROM user_shares WHERE user_shares.user_id = u.user_id AND user_shares.share_id = u.share_id) as recorded_balance,
  NOW() as calculated_at
FROM (
  SELECT DISTINCT user_id, share_id 
  FROM share_stock_movements
  WHERE user_id IS NOT NULL
) u;

CREATE UNIQUE INDEX idx_user_share_balances_calculated_user_share 
ON user_share_balances_calculated(user_id, share_id);

-- 1.7 Create movement recording function
CREATE OR REPLACE FUNCTION record_share_movement(
  p_movement_type TEXT, p_source_bucket TEXT, p_destination_bucket TEXT,
  p_share_id UUID, p_quantity INTEGER, p_price_per_share NUMERIC,
  p_total_value NUMERIC, p_currency TEXT, p_user_id UUID DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL, p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL, p_description TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'completed'
) RETURNS UUID AS $$
DECLARE
  movement_id UUID;
BEGIN
  INSERT INTO share_stock_movements (
    movement_type, source_bucket, destination_bucket, share_id, quantity,
    price_per_share, total_value, currency, user_id, admin_id,
    reference_type, reference_id, description, status
  ) VALUES (
    p_movement_type, p_source_bucket, p_destination_bucket, p_share_id, p_quantity,
    p_price_per_share, p_total_value, p_currency, p_user_id, p_admin_id,
    p_reference_type, p_reference_id, p_description, p_status
  ) RETURNING id INTO movement_id;
  
  RETURN movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.8 Create trigger functions
CREATE OR REPLACE FUNCTION trigger_record_purchase_order_movement()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  movement_type_val TEXT;
  admin_user_id UUID;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;
    
    IF NEW.metadata ? 'issue_type' THEN
      movement_type_val := NEW.metadata->>'issue_type';
      admin_user_id := (NEW.metadata->>'admin_id')::UUID;
    ELSE
      movement_type_val := 'purchase';
    END IF;
    
    PERFORM record_share_movement(
      movement_type_val, 'share_pool', 'user_holdings',
      NEW.share_id, NEW.quantity, NEW.price_per_share, NEW.total_amount, NEW.currency,
      NEW.user_id, admin_user_id, 'share_purchase_order', NEW.id,
      movement_type_val || ' of ' || NEW.quantity || ' shares to ' || COALESCE(user_name, 'user'), 'completed'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_record_sell_order_movement()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;
    PERFORM record_share_movement(
      'share_sale', 'user_holdings', 'share_pool',
      NEW.share_id, NEW.processed_quantity, NEW.price_per_share,
      NEW.processed_quantity * NEW.price_per_share, NEW.currency,
      NEW.user_id, NEW.processed_by, 'share_sell_order', NEW.id,
      'Sale of ' || NEW.processed_quantity || ' shares from ' || COALESCE(user_name, 'user'), 'completed'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS trigger_purchase_order_movement ON share_purchase_orders;
CREATE TRIGGER trigger_purchase_order_movement
  AFTER INSERT OR UPDATE ON share_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_record_purchase_order_movement();

DROP TRIGGER IF EXISTS trigger_sell_order_movement ON share_sell_orders;
CREATE TRIGGER trigger_sell_order_movement
  AFTER UPDATE ON share_sell_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_record_sell_order_movement();

-- Grants
GRANT SELECT ON user_share_balances_calculated TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_share_balance TO authenticated;
GRANT EXECUTE ON FUNCTION record_share_movement TO authenticated;