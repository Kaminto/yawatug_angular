-- Correct retroactive processing using actual fee settings
-- Remove incorrect fee collections first
DELETE FROM public.transaction_fee_collections 
WHERE transaction_id IN (
  SELECT id FROM public.transactions 
  WHERE transaction_type = 'deposit' AND status = 'completed'
);

-- Remove incorrect admin fund allocations
DELETE FROM public.admin_wallet_fund_transfers 
WHERE transfer_type = 'fee_allocation' 
AND reference IN (
  SELECT id::TEXT FROM public.transactions 
  WHERE transaction_type = 'deposit' AND status = 'completed'
);

-- Now process with correct fee calculations
DO $$
DECLARE
  transaction_record RECORD;
  fee_settings RECORD;
  calculated_fee NUMERIC := 0;
  percentage_component NUMERIC := 0;
  total_fees NUMERIC := 0;
  admin_fund_id UUID;
BEGIN
  -- Get admin fund wallet
  SELECT id INTO admin_fund_id
  FROM admin_sub_wallets
  WHERE wallet_type = 'admin_fund' AND currency = 'UGX'
  LIMIT 1;

  -- Get fee settings for deposits
  SELECT * INTO fee_settings
  FROM transaction_fee_settings
  WHERE transaction_type = 'deposit' 
    AND currency = 'UGX' 
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  FOR transaction_record IN 
    SELECT * FROM public.transactions 
    WHERE transaction_type = 'deposit' 
      AND status = 'completed' 
      AND currency = 'UGX'
    ORDER BY created_at ASC
  LOOP
    -- Calculate fee using actual settings
    percentage_component := (transaction_record.amount * fee_settings.percentage_fee) / 100;
    calculated_fee := percentage_component + fee_settings.flat_fee;
    
    -- Apply min/max limits
    calculated_fee := GREATEST(calculated_fee, fee_settings.minimum_fee);
    calculated_fee := LEAST(calculated_fee, fee_settings.maximum_fee);
    
    -- Insert fee collection record
    INSERT INTO transaction_fee_collections (
      transaction_id, user_id, transaction_type, base_amount,
      fee_percentage, flat_fee, calculated_fee, actual_fee_collected,
      currency, allocation_status, fee_settings_snapshot
    ) VALUES (
      transaction_record.id, transaction_record.user_id, 'deposit', transaction_record.amount,
      fee_settings.percentage_fee, fee_settings.flat_fee, calculated_fee, calculated_fee,
      'UGX', 'allocated', 
      jsonb_build_object(
        'fee_percentage', fee_settings.percentage_fee,
        'flat_fee', fee_settings.flat_fee,
        'minimum_fee', fee_settings.minimum_fee,
        'maximum_fee', fee_settings.maximum_fee
      )
    );
    
    -- Allocate to admin fund
    IF admin_fund_id IS NOT NULL THEN
      UPDATE admin_sub_wallets 
      SET balance = balance + calculated_fee, updated_at = now()
      WHERE id = admin_fund_id;
      
      INSERT INTO admin_wallet_fund_transfers (
        to_wallet_id, amount, currency, transfer_type, description, reference
      ) VALUES (
        admin_fund_id, calculated_fee, 'UGX', 'fee_allocation', 
        'Retroactive deposit fee collection', transaction_record.id::TEXT
      );
    END IF;
    
    total_fees := total_fees + calculated_fee;
    RAISE NOTICE 'Processed deposit % (% UGX): Fee = % UGX', 
      transaction_record.id, transaction_record.amount, calculated_fee;
  END LOOP;
  
  RAISE NOTICE 'Total fees correctly allocated: % UGX', total_fees;
END $$;