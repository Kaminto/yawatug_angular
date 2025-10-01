-- Fix share stock movements source bucket constraint violation
CREATE OR REPLACE FUNCTION trigger_record_purchase_order_movement()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  movement_type_val TEXT := 'purchase';
  admin_user_id UUID := NULL;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;
    
    -- Use 'available_shares' as source bucket (not 'share_pool' which violates constraint)
    PERFORM record_share_movement(
      movement_type_val, 
      'available_shares',  -- Fixed: was 'share_pool', now using valid bucket name
      'user_holdings',
      NEW.share_id, 
      NEW.quantity, 
      NEW.price_per_share, 
      NEW.total_amount, 
      NEW.currency,
      NEW.user_id, 
      admin_user_id, 
      'share_purchase_order', 
      NEW.id,
      movement_type_val || ' of ' || NEW.quantity || ' shares to ' || COALESCE(user_name, 'user'), 
      'completed'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user_share_balances_calculated materialized view to include progressive shares
-- This ensures booking installment shares (progressive ownership) count as held shares
DROP MATERIALIZED VIEW IF EXISTS user_share_balances_calculated CASCADE;

CREATE MATERIALIZED VIEW user_share_balances_calculated AS
WITH movement_balances AS (
  SELECT 
    user_id,
    share_id,
    SUM(
      CASE 
        WHEN destination_bucket IN ('user_holdings', 'progressive_holdings') THEN quantity
        WHEN source_bucket IN ('user_holdings', 'progressive_holdings') THEN -quantity
        ELSE 0
      END
    ) as movement_balance
  FROM share_stock_movements
  WHERE user_id IS NOT NULL
    AND status = 'completed'
  GROUP BY user_id, share_id
),
progressive_balances AS (
  SELECT 
    user_id,
    share_id,
    SUM(shares_owned_progressively) as progressive_balance
  FROM share_bookings
  WHERE status IN ('active', 'partially_paid', 'completed')
    AND shares_owned_progressively > 0
  GROUP BY user_id, share_id
)
SELECT 
  COALESCE(mb.user_id, pb.user_id) as user_id,
  COALESCE(mb.share_id, pb.share_id) as share_id,
  COALESCE(mb.movement_balance, 0) + COALESCE(pb.progressive_balance, 0) as calculated_balance
FROM movement_balances mb
FULL OUTER JOIN progressive_balances pb 
  ON mb.user_id = pb.user_id AND mb.share_id = pb.share_id
WHERE COALESCE(mb.movement_balance, 0) + COALESCE(pb.progressive_balance, 0) > 0;

-- Recreate the unique index
CREATE UNIQUE INDEX idx_user_share_balances_calculated_user_share 
ON user_share_balances_calculated(user_id, share_id);

-- Grant permissions
GRANT SELECT ON user_share_balances_calculated TO authenticated;