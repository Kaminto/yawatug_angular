-- Corrected retroactive processing migration for existing transactions
-- This migration works with the actual transactions table structure

-- Create a function to identify missed transactions (corrected version)
CREATE OR REPLACE FUNCTION public.identify_missed_transactions()
RETURNS TABLE(
  transaction_id UUID,
  user_id UUID,
  amount NUMERIC,
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

-- Create a safe batch processing function (corrected version)
CREATE OR REPLACE FUNCTION public.batch_process_missed_transactions(p_batch_size INTEGER DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  transaction_record RECORD;
  processed_count INTEGER := 0;
  results JSONB;
  calculated_fee NUMERIC := 0;
  fee_settings RECORD;
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
      -- Calculate fee for this transaction type if no fee collection exists
      SELECT * INTO fee_settings 
      FROM get_transaction_fee_settings(transaction_record.transaction_type);
      
      IF fee_settings IS NOT NULL THEN
        calculated_fee := GREATEST(
          (ABS(transaction_record.amount) * COALESCE(fee_settings.fee_percentage, 0)) / 100 + COALESCE(fee_settings.flat_fee, 0),
          COALESCE(fee_settings.minimum_fee, 0)
        );
        
        IF fee_settings.maximum_fee > 0 THEN
          calculated_fee := LEAST(calculated_fee, fee_settings.maximum_fee);
        END IF;
      ELSE
        calculated_fee := 0;
      END IF;
      
      -- Process fee allocation if applicable
      IF calculated_fee > 0 THEN
        PERFORM allocate_transaction_fee_enhanced(
          transaction_record.id,
          transaction_record.user_id,
          transaction_record.transaction_type,
          ABS(transaction_record.amount),
          calculated_fee,
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

-- Create a comprehensive retroactive processing function (corrected)
CREATE OR REPLACE FUNCTION public.retroactive_process_missed_transactions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  batch_result JSONB;
  total_batches INTEGER := 0;
  total_processed INTEGER := 0;
  max_batches INTEGER := 50; -- Safety limit
  results JSONB;
BEGIN
  -- Process in safe batches
  LOOP
    SELECT public.batch_process_missed_transactions(25) INTO batch_result;
    
    total_batches := total_batches + 1;
    total_processed := total_processed + (batch_result->>'batch_processed')::INTEGER;
    
    -- Exit if no more transactions to process or if we hit the safety limit
    IF (batch_result->>'batch_processed')::INTEGER = 0 OR total_batches >= max_batches THEN
      EXIT;
    END IF;
    
    -- Small delay between batches
    PERFORM pg_sleep(0.2);
  END LOOP;
  
  results := jsonb_build_object(
    'success', true,
    'total_batches_processed', total_batches,
    'total_transactions_processed', total_processed,
    'message', 'Retroactive processing completed successfully'
  );
  
  RETURN results;
END;
$function$;

-- Create a corrected view to monitor allocation status
CREATE OR REPLACE VIEW public.transaction_allocation_status AS
SELECT 
  t.id as transaction_id,
  t.user_id,
  t.amount,
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

-- Run initial check to see if there are any transactions to process
DO $$
DECLARE
  missed_count INTEGER;
  processing_result JSONB;
BEGIN
  -- Count missed transactions
  SELECT COUNT(*) INTO missed_count
  FROM public.transactions t
  LEFT JOIN public.transaction_fee_collections tfc ON t.id = tfc.transaction_id
  LEFT JOIN public.admin_wallet_fund_transfers awft ON awft.reference = t.id::TEXT
  WHERE t.status = 'completed'
    AND t.transaction_type IN ('share_purchase', 'booking_payment')
    AND t.amount < 0
    AND tfc.id IS NULL
    AND awft.id IS NULL
    AND t.created_at >= '2024-01-01'::timestamp;
    
  IF missed_count > 0 THEN
    RAISE NOTICE 'Found % transactions that need retroactive processing. Processing now...', missed_count;
    
    -- Process the missed transactions
    SELECT public.retroactive_process_missed_transactions() INTO processing_result;
    
    RAISE NOTICE 'Retroactive processing result: %', processing_result;
  ELSE
    RAISE NOTICE 'No missed transactions found. System is up to date.';
  END IF;
END
$$;