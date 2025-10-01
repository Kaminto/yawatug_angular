-- Create the trigger for auto-processing share transactions
DROP TRIGGER IF EXISTS trigger_process_share_transaction ON share_transactions;
CREATE TRIGGER trigger_process_share_transaction
  AFTER UPDATE ON share_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_share_transaction();