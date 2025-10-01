-- Fix the loop syntax error in the validation function
CREATE OR REPLACE FUNCTION validate_share_transaction_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_user_shares NUMERIC;
  total_issued_shares NUMERIC;
  available_shares NUMERIC;
  issues jsonb := '[]';
  user_record RECORD;
BEGIN
  -- Calculate total shares held by users
  SELECT COALESCE(SUM(quantity), 0) INTO total_user_shares 
  FROM user_shares WHERE quantity > 0;
  
  -- Get total issued and available shares
  SELECT 
    COALESCE(total_shares, 0),
    COALESCE(available_shares, 0)
  INTO total_issued_shares, available_shares
  FROM shares LIMIT 1;
  
  -- Check if user holdings + available = total issued
  IF total_user_shares + available_shares != total_issued_shares THEN
    issues := jsonb_set(issues, ARRAY[jsonb_array_length(issues)::text], 
      jsonb_build_object(
        'type', 'share_balance_mismatch',
        'description', 'User holdings + available shares != total issued shares',
        'user_shares', total_user_shares,
        'available_shares', available_shares,
        'total_issued', total_issued_shares,
        'difference', total_issued_shares - (total_user_shares + available_shares)
      )
    );
  END IF;
  
  -- Check for negative holdings
  FOR user_record IN SELECT user_id, quantity FROM user_shares WHERE quantity < 0 LOOP
    issues := jsonb_set(issues, ARRAY[jsonb_array_length(issues)::text],
      jsonb_build_object(
        'type', 'negative_holdings',
        'user_id', user_record.user_id,
        'quantity', user_record.quantity
      )
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_issues', jsonb_array_length(issues),
    'issues', issues,
    'summary', jsonb_build_object(
      'total_user_shares', total_user_shares,
      'available_shares', available_shares,
      'total_issued_shares', total_issued_shares
    )
  );
END;
$$;

-- Now run the reconciliation for your user to fix the data
SELECT reconcile_user_share_holdings('3378baf3-0b9c-4549-b5d6-7096f131f4c5');