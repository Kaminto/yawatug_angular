-- Fix wallet balance calculation to include ALL transaction types
-- Current function is missing: admin_adjustment, booking_payment, exchange, share_transfer_fee, transfer

CREATE OR REPLACE FUNCTION public.calculate_simple_wallet_balance(p_wallet_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  total_balance NUMERIC := 0;
BEGIN
  -- Calculate balance by summing all completed and approved transactions
  -- Amounts are already signed correctly (positive = credit, negative = debit)
  SELECT COALESCE(SUM(amount - COALESCE(fee_amount, 0)), 0)
  INTO total_balance
  FROM transactions 
  WHERE wallet_id = p_wallet_id 
    AND status = 'completed'
    AND (approval_status IN ('completed', 'approved') OR approval_status IS NULL);
  
  RETURN total_balance;
END;
$function$;

-- Add a diagnostic function to check wallet balance breakdown by transaction type
CREATE OR REPLACE FUNCTION public.get_wallet_balance_breakdown(p_wallet_id uuid)
RETURNS TABLE(
  transaction_type text,
  transaction_count bigint,
  total_amount numeric,
  total_fees numeric,
  net_impact numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.transaction_type,
    COUNT(*)::bigint as transaction_count,
    COALESCE(SUM(t.amount), 0) as total_amount,
    COALESCE(SUM(t.fee_amount), 0) as total_fees,
    COALESCE(SUM(t.amount - COALESCE(t.fee_amount, 0)), 0) as net_impact
  FROM transactions t
  WHERE t.wallet_id = p_wallet_id
    AND t.status = 'completed'
    AND (t.approval_status IN ('completed', 'approved') OR t.approval_status IS NULL)
  GROUP BY t.transaction_type
  ORDER BY t.transaction_type;
END;
$function$;