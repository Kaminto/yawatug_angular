-- Create the trigger function properly
CREATE OR REPLACE FUNCTION process_share_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process completed transactions
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    CASE NEW.transaction_type
      WHEN 'purchase' THEN
        -- Update user holdings
        INSERT INTO user_shares (user_id, share_id, quantity, purchase_price_per_share, currency)
        VALUES (NEW.user_id, NEW.share_id, NEW.quantity, NEW.price_per_share, NEW.currency)
        ON CONFLICT (user_id, share_id)
        DO UPDATE SET 
          quantity = user_shares.quantity + NEW.quantity,
          updated_at = now();
        
        -- Update user_share_holdings
        INSERT INTO user_share_holdings (user_id, share_id, quantity, average_purchase_price, currency)
        VALUES (NEW.user_id, NEW.share_id, NEW.quantity, NEW.price_per_share, NEW.currency)
        ON CONFLICT (user_id, share_id)
        DO UPDATE SET
          quantity = user_share_holdings.quantity + NEW.quantity,
          average_purchase_price = (
            (user_share_holdings.average_purchase_price * user_share_holdings.quantity + NEW.price_per_share * NEW.quantity) /
            (user_share_holdings.quantity + NEW.quantity)
          ),
          updated_at = now();
        
        -- Decrease available shares
        UPDATE shares SET 
          available_shares = available_shares - NEW.quantity,
          updated_at = now()
        WHERE id = NEW.share_id;
        
      WHEN 'sale' THEN
        -- Update user holdings
        UPDATE user_shares SET 
          quantity = quantity - NEW.quantity,
          updated_at = now()
        WHERE user_id = NEW.user_id AND share_id = NEW.share_id;
        
        -- Update user_share_holdings
        UPDATE user_share_holdings SET
          quantity = quantity - NEW.quantity,
          updated_at = now()
        WHERE user_id = NEW.user_id AND share_id = NEW.share_id;
        
        -- Increase available shares
        UPDATE shares SET 
          available_shares = available_shares + NEW.quantity,
          updated_at = now()
        WHERE id = NEW.share_id;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Now create the trigger
DROP TRIGGER IF EXISTS trigger_process_share_transaction ON share_transactions;
CREATE TRIGGER trigger_process_share_transaction
  AFTER UPDATE ON share_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_share_transaction();