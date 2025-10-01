-- Add validation trigger to enforce minimum down payment for share bookings
-- This ensures bookings cannot be created without meeting the required down payment percentage

CREATE OR REPLACE FUNCTION validate_booking_down_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  required_percentage NUMERIC;
  user_account_type TEXT;
  calculated_min_down_payment NUMERIC;
BEGIN
  -- Get user's account type
  SELECT account_type INTO user_account_type
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Get required down payment percentage from share_buying_limits
  SELECT required_down_payment_percentage INTO required_percentage
  FROM share_buying_limits
  WHERE account_type = COALESCE(user_account_type, 'individual');
  
  -- Use default 30% if no setting found
  required_percentage := COALESCE(required_percentage, 30);
  
  -- Calculate minimum required down payment
  calculated_min_down_payment := (NEW.total_amount * required_percentage) / 100;
  
  -- Validate that down_payment_amount meets minimum requirement
  IF NEW.down_payment_amount < calculated_min_down_payment THEN
    RAISE EXCEPTION 'Down payment of % is below required minimum of % (% of total amount %)',
      NEW.down_payment_amount,
      calculated_min_down_payment,
      required_percentage || '%',
      NEW.total_amount;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS enforce_booking_down_payment ON share_bookings;

-- Create trigger to validate down payment before insert or update
CREATE TRIGGER enforce_booking_down_payment
  BEFORE INSERT OR UPDATE OF down_payment_amount, total_amount
  ON share_bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_down_payment();