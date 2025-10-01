-- Process missed deposit transactions with fee collection and allocation
-- This will handle the 4 existing deposit transactions that missed processing

DO $$
DECLARE
  transaction_record RECORD;
  processed_count INTEGER := 0;
  calculated_fee NUMERIC := 0;
  fee_settings RECORD;
  total_fees_collected NUMERIC := 0;
  total_funds_processed NUMERIC := 0;
BEGIN
  -- Process existing deposit transactions that missed fee collection and fund allocation
  FOR transaction_record IN 
    SELECT DISTINCT t.*
    FROM public.transactions t
    LEFT JOIN public.transaction_fee_collections tfc ON t.id = tfc.transaction_id
    LEFT JOIN public.admin_wallet_fund_transfers awft ON awft.reference = t.id::TEXT
    WHERE t.status = 'completed'
      AND t.transaction_type = 'deposit'
      AND t.amount > 0 -- Deposit transactions are positive
      AND tfc.id IS NULL -- No fee collection record exists
      AND awft.id IS NULL -- No fund transfer record exists
    ORDER BY t.created_at ASC
  LOOP
    BEGIN
      RAISE NOTICE 'Processing deposit transaction: % (Amount: % %)', transaction_record.id, transaction_record.amount, transaction_record.currency;
      
      -- Calculate fee for this deposit transaction
      SELECT * INTO fee_settings 
      FROM get_transaction_fee_settings('deposit');
      
      IF fee_settings IS NOT NULL THEN
        calculated_fee := GREATEST(
          (transaction_record.amount * COALESCE(fee_settings.fee_percentage, 0)) / 100 + COALESCE(fee_settings.flat_fee, 0),
          COALESCE(fee_settings.minimum_fee, 0)
        );
        
        IF fee_settings.maximum_fee > 0 THEN
          calculated_fee := LEAST(calculated_fee, fee_settings.maximum_fee);
        END IF;
        
        RAISE NOTICE 'Calculated fee: % %', calculated_fee, transaction_record.currency;
      ELSE
        calculated_fee := 0;
        RAISE NOTICE 'No fee settings found for deposit transactions';
      END IF;
      
      -- Process fee allocation if applicable
      IF calculated_fee > 0 THEN
        PERFORM allocate_transaction_fee_enhanced(
          transaction_record.id,
          transaction_record.user_id,
          transaction_record.transaction_type,
          transaction_record.amount,
          calculated_fee,
          transaction_record.currency
        );
        
        total_fees_collected := total_fees_collected + calculated_fee;
        RAISE NOTICE 'Fee allocated: % %', calculated_fee, transaction_record.currency;
      END IF;
      
      -- For deposits, we don't typically allocate the deposit amount itself to admin wallets
      -- since it goes to the user's wallet. But we can track it for reporting
      total_funds_processed := total_funds_processed + transaction_record.amount;
      processed_count := processed_count + 1;
      
      RAISE NOTICE 'Successfully processed transaction: %', transaction_record.id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error processing transaction %: %', transaction_record.id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
  
  RAISE NOTICE '=== PROCESSING COMPLETE ===';
  RAISE NOTICE 'Total transactions processed: %', processed_count;
  RAISE NOTICE 'Total fees collected: % UGX', total_fees_collected;
  RAISE NOTICE 'Total deposit amount processed: % UGX', total_funds_processed;
  
END
$$;