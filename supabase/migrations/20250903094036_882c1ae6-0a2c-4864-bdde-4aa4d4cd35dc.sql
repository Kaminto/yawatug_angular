-- Retroactively process existing transactions that missed fee collection and fund allocation
-- This migration identifies and processes completed share_purchase and booking_payment transactions

-- First, let's create a function to retroactively process missed transactions
CREATE OR REPLACE FUNCTION public.retroactive_process_missed_transactions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  transaction_record RECORD;
  processed_count INTEGER := 0;
  fee_allocated_count INTEGER := 0;
  funds_allocated_count INTEGER := 0;
  total_fees_collected NUMERIC := 0;
  total_funds_allocated NUMERIC := 0;
  results JSONB;
BEGIN
  -- Process completed share_purchase and booking_payment transactions that haven't been allocated
  FOR transaction_record IN 
    SELECT DISTINCT t.*
    FROM public.transactions t
    LEFT JOIN public.transaction_fee_collections tfc ON t.id = tfc.transaction_id
    LEFT JOIN public.admin_wallet_fund_transfers awft ON awft.reference = t.id::TEXT
    WHERE t.status = 'completed'
      AND t.transaction_type IN ('share_purchase', 'booking_payment')
      AND t.amount < 0 -- Only outgoing transactions (user payments)
      AND tfc.id IS NULL -- No fee collection record exists
      AND awft.id IS NULL -- No fund transfer record exists
      AND t.created_at >= '2024-01-01'::timestamp -- Only process recent transactions
    ORDER BY t.created_at ASC
  LOOP
    BEGIN
      processed_count := processed_count + 1;
      
      -- 1. Process fee allocation if there was a fee but no fee collection record
      IF transaction_record.fee_amount > 0 THEN
        -- Create fee collection record retroactively
        PERFORM allocate_transaction_fee_enhanced(
          transaction_record.id,
          transaction_record.user_id,
          transaction_record.transaction_type,
          ABS(transaction_record.amount),
          transaction_record.fee_amount,
          transaction_record.currency
        );
        
        fee_allocated_count := fee_allocated_count + 1;
        total_fees_collected := total_fees_collected + transaction_record.fee_amount;
      END IF;
      
      -- 2. Process fund allocation for the transaction amount
      PERFORM allocate_share_purchase_proceeds_enhanced(
        ABS(transaction_record.amount),
        transaction_record.currency,
        transaction_record.id,
        transaction_record.user_id
      );
      
      funds_allocated_count := funds_allocated_count + 1;
      total_funds_allocated := total_funds_allocated + ABS(transaction_record.amount);
      
      -- Add a small delay to prevent overwhelming the system
      IF processed_count % 50 = 0 THEN
        PERFORM pg_sleep(0.1);
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but continue processing
      RAISE NOTICE 'Error processing transaction %: %', transaction_record.id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
  
  -- Return summary results
  results := jsonb_build_object(
    'success', true,
    'processed_transactions', processed_count,
    'fee_allocations_created', fee_allocated_count,
    'fund_allocations_created', funds_allocated_count,
    'total_fees_collected', total_fees_collected,
    'total_funds_allocated', total_funds_allocated,
    'message', 'Retroactive processing completed successfully'
  );
  
  RETURN results;
END;
$function$;

-- Create a function to identify missed transactions (for reporting)
CREATE OR REPLACE FUNCTION public.identify_missed_transactions()
RETURNS TABLE(
  transaction_id UUID,
  user_id UUID,
  amount NUMERIC,
  fee_amount NUMERIC,
  transaction_type TEXT,
  currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  has_fee_collection BOOLEAN,
  has_fund_allocation BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as transaction_id,
    t.user_id,
    t.amount,
    t.fee_amount,
    t.transaction_type,
    t.currency,
    t.created_at,
    (tfc.id IS NOT NULL) as has_fee_collection,
    (awft.id IS NOT NULL) as has_fund_allocation
  FROM public.transactions t
  LEFT JOIN public.transaction_fee_collections tfc ON t.id = tfc.transaction_id
  LEFT JOIN public.admin_wallet_fund_transfers awft ON awft.reference = t.id::TEXT
  WHERE t.status = 'completed'
    AND t.transaction_type IN ('share_purchase', 'booking_payment')
    AND t.amount < 0 -- Only outgoing transactions
    AND t.created_at >= '2024-01-01'::timestamp
    AND (tfc.id IS NULL OR awft.id IS NULL) -- Missing either fee collection or fund allocation
  ORDER BY t.created_at DESC;
END;
$function$;

-- Create a safe batch processing function that processes in smaller chunks
CREATE OR REPLACE FUNCTION public.batch_process_missed_transactions(p_batch_size INTEGER DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  transaction_record RECORD;
  processed_count INTEGER := 0;
  batch_count INTEGER := 0;
  total_processed INTEGER := 0;
  results JSONB;
BEGIN
  -- Process in batches to avoid overwhelming the system
  FOR transaction_record IN 
    SELECT DISTINCT t.*
    FROM public.transactions t
    LEFT JOIN public.transaction_fee_collections tfc ON t.id = tfc.transaction_id
    LEFT JOIN public.admin_wallet_fund_transfers awft ON awft.reference = t.id::TEXT
    WHERE t.status = 'completed'
      AND t.transaction_type IN ('share_purchase', 'booking_payment')
      AND t.amount < 0 -- Only outgoing transactions
      AND tfc.id IS NULL -- No fee collection record exists
      AND awft.id IS NULL -- No fund transfer record exists
      AND t.created_at >= '2024-01-01'::timestamp
    ORDER BY t.created_at ASC
    LIMIT p_batch_size
  LOOP
    BEGIN
      -- Process fee allocation if applicable
      IF transaction_record.fee_amount > 0 THEN
        PERFORM allocate_transaction_fee_enhanced(
          transaction_record.id,
          transaction_record.user_id,
          transaction_record.transaction_type,
          ABS(transaction_record.amount),
          transaction_record.fee_amount,
          transaction_record.currency
        );
      END IF;
      
      -- Process fund allocation
      PERFORM allocate_share_purchase_proceeds_enhanced(
        ABS(transaction_record.amount),
        transaction_record.currency,
        transaction_record.id,
        transaction_record.user_id
      );
      
      processed_count := processed_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error processing transaction %: %', transaction_record.id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
  
  results := jsonb_build_object(
    'success', true,
    'batch_processed', processed_count,
    'batch_size_requested', p_batch_size,
    'message', CASE 
      WHEN processed_count = 0 THEN 'No more transactions to process'
      WHEN processed_count < p_batch_size THEN 'Final batch processed - all transactions complete'
      ELSE 'Batch completed - more transactions may remain'
    END
  );
  
  RETURN results;
END;
$function$;

-- Execute the retroactive processing
-- This will run automatically when the migration is applied
DO $$
DECLARE
  processing_result JSONB;
  batch_result JSONB;
  total_batches INTEGER := 0;
  max_batches INTEGER := 50; -- Safety limit
BEGIN
  -- First, let's process in safe batches
  LOOP
    SELECT public.batch_process_missed_transactions(25) INTO batch_result;
    
    total_batches := total_batches + 1;
    
    -- Exit if no more transactions to process or if we hit the safety limit
    IF (batch_result->>'batch_processed')::INTEGER = 0 OR total_batches >= max_batches THEN
      EXIT;
    END IF;
    
    -- Small delay between batches
    PERFORM pg_sleep(0.2);
  END LOOP;
  
  -- Log the completion
  RAISE NOTICE 'Retroactive processing completed. Processed % batches.', total_batches;
END
$$;

-- Create a view to easily monitor the allocation status
CREATE OR REPLACE VIEW public.transaction_allocation_status AS
SELECT 
  t.id as transaction_id,
  t.user_id,
  t.amount,
  t.fee_amount,
  t.transaction_type,
  t.currency,
  t.created_at,
  t.status,
  (tfc.id IS NOT NULL) as has_fee_collection,
  (awft.id IS NOT NULL) as has_fund_allocation,
  tfc.actual_fee_collected,
  awft.amount as allocated_amount,
  awft.transfer_type
FROM public.transactions t
LEFT JOIN public.transaction_fee_collections tfc ON t.id = tfc.transaction_id
LEFT JOIN public.admin_wallet_fund_transfers awft ON awft.reference = t.id::TEXT
WHERE t.transaction_type IN ('share_purchase', 'booking_payment')
  AND t.status = 'completed'
  AND t.amount < 0
ORDER BY t.created_at DESC;