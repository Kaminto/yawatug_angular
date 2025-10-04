-- Function to process deposit with fee separation
-- Credits full amount to user wallet, then deducts fee to admin fund
CREATE OR REPLACE FUNCTION public.process_deposit_with_fee_separation(
  p_user_id UUID,
  p_wallet_id UUID,
  p_gross_amount NUMERIC,
  p_fee_amount NUMERIC,
  p_currency TEXT,
  p_description TEXT DEFAULT 'Deposit',
  p_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deposit_transaction_id UUID;
  fee_transaction_id UUID;
  admin_wallet_id UUID;
  result JSONB;
BEGIN
  -- Step 1: Credit FULL amount (gross amount including fee) to user wallet
  INSERT INTO public.transactions (
    user_id,
    wallet_id,
    transaction_type,
    amount,
    currency,
    description,
    status,
    approval_status,
    fee_amount,
    reference
  ) VALUES (
    p_user_id,
    p_wallet_id,
    'deposit',
    p_gross_amount, -- Full amount including fee
    p_currency,
    p_description || ' (Gross)',
    'completed',
    'approved',
    0, -- No fee on this transaction, it's handled separately
    p_reference
  ) RETURNING id INTO deposit_transaction_id;

  -- Step 2: Get admin fund wallet
  SELECT id INTO admin_wallet_id
  FROM public.admin_sub_wallets
  WHERE wallet_type = 'admin_fund' AND currency = p_currency
  LIMIT 1;

  -- Step 3: Deduct fee from user wallet to admin fund
  IF admin_wallet_id IS NOT NULL AND p_fee_amount > 0 THEN
    -- Deduct from user wallet
    INSERT INTO public.transactions (
      user_id,
      wallet_id,
      transaction_type,
      amount,
      currency,
      description,
      status,
      approval_status,
      fee_amount,
      reference,
      metadata
    ) VALUES (
      p_user_id,
      p_wallet_id,
      'fee_deduction',
      -p_fee_amount, -- Negative to deduct
      p_currency,
      'Deposit transaction fee',
      'completed',
      'approved',
      0,
      p_reference,
      jsonb_build_object(
        'related_deposit_id', deposit_transaction_id,
        'fee_type', 'deposit_fee'
      )
    ) RETURNING id INTO fee_transaction_id;

    -- Credit to admin fund
    UPDATE public.admin_sub_wallets
    SET balance = balance + p_fee_amount,
        updated_at = now()
    WHERE id = admin_wallet_id;

    -- Record admin wallet transfer
    INSERT INTO public.admin_wallet_fund_transfers (
      to_wallet_id,
      amount,
      currency,
      transfer_type,
      description,
      reference
    ) VALUES (
      admin_wallet_id,
      p_fee_amount,
      p_currency,
      'deposit_fee',
      'Deposit transaction fee',
      deposit_transaction_id::TEXT
    );
  END IF;

  result := jsonb_build_object(
    'success', true,
    'deposit_transaction_id', deposit_transaction_id,
    'fee_transaction_id', fee_transaction_id,
    'net_deposited', p_gross_amount - p_fee_amount,
    'gross_amount', p_gross_amount,
    'fee_amount', p_fee_amount
  );

  RETURN result;
END;
$$;

-- Function to process withdrawal with fee split
-- Deducts total from user wallet, splits: fee → admin, net → withdrawal
CREATE OR REPLACE FUNCTION public.process_withdrawal_with_fee_split(
  p_user_id UUID,
  p_wallet_id UUID,
  p_withdrawal_amount NUMERIC, -- Net amount user wants to receive
  p_fee_amount NUMERIC,
  p_currency TEXT,
  p_description TEXT DEFAULT 'Withdrawal',
  p_reference TEXT DEFAULT NULL,
  p_recipient_phone TEXT DEFAULT NULL,
  p_recipient_name TEXT DEFAULT NULL,
  p_withdrawal_method TEXT DEFAULT 'mobile_money'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  withdrawal_transaction_id UUID;
  fee_transaction_id UUID;
  admin_wallet_id UUID;
  total_deduction NUMERIC;
  current_balance NUMERIC;
  result JSONB;
BEGIN
  -- Calculate total deduction
  total_deduction := p_withdrawal_amount + p_fee_amount;

  -- Check user balance
  SELECT balance INTO current_balance
  FROM public.wallets
  WHERE id = p_wallet_id;

  IF current_balance < total_deduction THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'required', total_deduction,
      'available', current_balance
    );
  END IF;

  -- Step 1: Deduct total amount from user wallet
  INSERT INTO public.transactions (
    user_id,
    wallet_id,
    transaction_type,
    amount,
    currency,
    description,
    status,
    approval_status,
    fee_amount,
    reference,
    metadata
  ) VALUES (
    p_user_id,
    p_wallet_id,
    'withdraw',
    -total_deduction, -- Total deduction (withdrawal + fee)
    p_currency,
    p_description || ' (Total: ' || total_deduction::TEXT || ')',
    'processing',
    'pending',
    p_fee_amount,
    p_reference,
    jsonb_build_object(
      'net_withdrawal', p_withdrawal_amount,
      'fee_amount', p_fee_amount,
      'total_deduction', total_deduction,
      'recipient_phone', p_recipient_phone,
      'recipient_name', p_recipient_name,
      'withdrawal_method', p_withdrawal_method
    )
  ) RETURNING id INTO withdrawal_transaction_id;

  -- Step 2: Get admin fund wallet and credit fee
  SELECT id INTO admin_wallet_id
  FROM public.admin_sub_wallets
  WHERE wallet_type = 'admin_fund' AND currency = p_currency
  LIMIT 1;

  IF admin_wallet_id IS NOT NULL AND p_fee_amount > 0 THEN
    -- Credit fee to admin fund
    UPDATE public.admin_sub_wallets
    SET balance = balance + p_fee_amount,
        updated_at = now()
    WHERE id = admin_wallet_id;

    -- Record admin wallet transfer
    INSERT INTO public.admin_wallet_fund_transfers (
      to_wallet_id,
      amount,
      currency,
      transfer_type,
      description,
      reference
    ) VALUES (
      admin_wallet_id,
      p_fee_amount,
      p_currency,
      'withdrawal_fee',
      'Withdrawal transaction fee',
      withdrawal_transaction_id::TEXT
    );
  END IF;

  result := jsonb_build_object(
    'success', true,
    'withdrawal_transaction_id', withdrawal_transaction_id,
    'net_withdrawal', p_withdrawal_amount,
    'fee_amount', p_fee_amount,
    'total_deducted', total_deduction
  );

  RETURN result;
END;
$$;