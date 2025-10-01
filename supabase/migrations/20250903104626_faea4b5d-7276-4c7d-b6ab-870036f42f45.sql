-- Retroactively allocate previous share purchases to admin sub-wallets
-- This processes all completed share purchases that haven't been allocated yet

DO $$
DECLARE
  purchase_record RECORD;
  transaction_record RECORD;
  total_allocated NUMERIC := 0;
  allocation_result JSONB;
BEGIN
  RAISE NOTICE 'Starting retroactive allocation of share purchase proceeds...';
  
  -- Process share purchase orders first
  FOR purchase_record IN 
    SELECT spo.*, st.id as transaction_id
    FROM share_purchase_orders spo
    LEFT JOIN share_transactions st ON st.user_id = spo.user_id 
      AND st.share_id = spo.share_id 
      AND st.transaction_type = 'buy'
      AND ABS(st.quantity - spo.quantity) < 0.01
      AND ABS(st.price_per_share - spo.price_per_share) < 0.01
    WHERE spo.status = 'completed'
      AND spo.total_amount > 0
    ORDER BY spo.created_at ASC
  LOOP
    BEGIN
      -- Call allocation function
      SELECT public.allocate_share_purchase_proceeds_enhanced(
        purchase_record.total_amount,
        purchase_record.currency,
        COALESCE(purchase_record.transaction_id, purchase_record.id),
        purchase_record.user_id
      ) INTO allocation_result;
      
      total_allocated := total_allocated + purchase_record.total_amount;
      
      RAISE NOTICE 'Allocated purchase order %: % % (Project: %, Admin: %, Buyback: %)', 
        purchase_record.id, 
        purchase_record.total_amount, 
        purchase_record.currency,
        allocation_result->>'project_funding',
        allocation_result->>'admin_fund',
        allocation_result->>'buyback_fund';
        
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to allocate purchase order %: %', purchase_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- Process standalone share transactions that might not have purchase orders
  FOR transaction_record IN 
    SELECT st.*
    FROM share_transactions st
    LEFT JOIN share_purchase_orders spo ON spo.user_id = st.user_id 
      AND spo.share_id = st.share_id
      AND ABS(spo.quantity - st.quantity) < 0.01
      AND ABS(spo.price_per_share - st.price_per_share) < 0.01
    WHERE st.transaction_type = 'buy'
      AND st.status = 'completed'
      AND st.quantity > 0
      AND st.price_per_share > 0
      AND spo.id IS NULL  -- Only transactions without corresponding purchase orders
    ORDER BY st.created_at ASC
  LOOP
    BEGIN
      -- Calculate total amount for transaction
      DECLARE
        transaction_amount NUMERIC;
      BEGIN
        transaction_amount := transaction_record.quantity * transaction_record.price_per_share;
        
        -- Call allocation function
        SELECT public.allocate_share_purchase_proceeds_enhanced(
          transaction_amount,
          transaction_record.currency,
          transaction_record.id,
          transaction_record.user_id
        ) INTO allocation_result;
        
        total_allocated := total_allocated + transaction_amount;
        
        RAISE NOTICE 'Allocated transaction %: % % (Project: %, Admin: %, Buyback: %)', 
          transaction_record.id, 
          transaction_amount, 
          transaction_record.currency,
          allocation_result->>'project_funding',
          allocation_result->>'admin_fund',
          allocation_result->>'buyback_fund';
      END;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to allocate transaction %: %', transaction_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Retroactive allocation completed. Total amount allocated: % UGX', total_allocated;
  
  -- Show final admin wallet balances
  RAISE NOTICE 'Current admin sub-wallet balances:';
  FOR purchase_record IN 
    SELECT wallet_type, currency, balance 
    FROM admin_sub_wallets 
    WHERE wallet_type IN ('project_funding', 'admin_fund', 'share_buyback')
    ORDER BY wallet_type, currency
  LOOP
    RAISE NOTICE '  %: % %', purchase_record.wallet_type, purchase_record.balance, purchase_record.currency;
  END LOOP;
  
END $$;