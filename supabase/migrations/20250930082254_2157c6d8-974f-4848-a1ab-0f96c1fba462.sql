-- Create function to refresh the user share balances materialized view
CREATE OR REPLACE FUNCTION refresh_user_share_balances()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_share_balances_calculated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to refresh after share movements
CREATE OR REPLACE FUNCTION trigger_refresh_share_balances()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_user_share_balances();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to auto-refresh the materialized view
DROP TRIGGER IF EXISTS trigger_refresh_balances_on_movement ON share_stock_movements;
CREATE TRIGGER trigger_refresh_balances_on_movement
  AFTER INSERT OR UPDATE OR DELETE ON share_stock_movements
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_share_balances();

DROP TRIGGER IF EXISTS trigger_refresh_balances_on_booking ON share_bookings;
CREATE TRIGGER trigger_refresh_balances_on_booking
  AFTER INSERT OR UPDATE OR DELETE ON share_bookings
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_share_balances();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_user_share_balances() TO authenticated;