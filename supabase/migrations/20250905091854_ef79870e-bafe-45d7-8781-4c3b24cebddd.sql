-- Create transactions for existing share purchase orders that don't have corresponding transaction records
INSERT INTO transactions (
  user_id,
  wallet_id,
  amount,
  currency,
  transaction_type,
  status,
  approval_status,
  reference,
  created_at,
  updated_at
)
SELECT 
  spo.user_id,
  w.id as wallet_id,
  -spo.total_amount as amount, -- Negative for debit
  spo.currency,
  'share_purchase' as transaction_type,
  'completed' as status,
  'approved' as approval_status,
  'Backfilled: Share purchase order #' || spo.id as reference,
  spo.created_at,
  spo.updated_at
FROM share_purchase_orders spo
LEFT JOIN wallets w ON w.user_id = spo.user_id AND w.currency = spo.currency
LEFT JOIN transactions t ON t.reference LIKE '%' || spo.id || '%' OR (
  t.user_id = spo.user_id 
  AND t.amount = -spo.total_amount 
  AND t.transaction_type = 'share_purchase'
  AND t.created_at BETWEEN spo.created_at - INTERVAL '5 minutes' AND spo.created_at + INTERVAL '5 minutes'
)
WHERE spo.status = 'completed'
  AND w.id IS NOT NULL
  AND t.id IS NULL; -- Only insert if no matching transaction exists

-- Update wallet balances to reflect the actual spent amounts on shares
-- This recalculates balances based on all transactions
WITH wallet_balances AS (
  SELECT 
    w.id as wallet_id,
    COALESCE(SUM(
      CASE 
        WHEN t.transaction_type IN ('deposit', 'transfer_in') THEN t.amount
        ELSE t.amount -- already negative for debits
      END
    ), 0) as calculated_balance
  FROM wallets w
  LEFT JOIN transactions t ON t.wallet_id = w.id 
    AND t.status = 'completed' 
    AND t.approval_status IN ('approved', 'completed')
  GROUP BY w.id
)
UPDATE wallets 
SET balance = wb.calculated_balance,
    updated_at = now()
FROM wallet_balances wb
WHERE wallets.id = wb.wallet_id
  AND wallets.balance != wb.calculated_balance;