-- Create atomic wallet transfer function
CREATE OR REPLACE FUNCTION process_wallet_transfer(
  p_sender_wallet_id UUID,
  p_recipient_wallet_id UUID,
  p_sender_user_id UUID,
  p_recipient_user_id UUID,
  p_amount NUMERIC,
  p_fee_amount NUMERIC,
  p_currency TEXT,
  p_reference TEXT,
  p_recipient_name TEXT,
  p_recipient_identifier TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_balance NUMERIC;
  recipient_balance NUMERIC;
  total_deduction NUMERIC;
  result JSONB;
BEGIN
  -- Calculate total deduction
  total_deduction := p_amount + p_fee_amount;
  
  -- Start transaction
  BEGIN
    -- Get and lock sender wallet
    SELECT balance INTO sender_balance
    FROM wallets 
    WHERE id = p_sender_wallet_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sender wallet not found';
    END IF;
    
    -- Check sufficient balance
    IF sender_balance < total_deduction THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Get and lock recipient wallet
    SELECT balance INTO recipient_balance
    FROM wallets 
    WHERE id = p_recipient_wallet_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Recipient wallet not found';
    END IF;
    
    -- Update sender wallet
    UPDATE wallets 
    SET balance = balance - total_deduction,
        updated_at = NOW()
    WHERE id = p_sender_wallet_id;
    
    -- Update recipient wallet
    UPDATE wallets 
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = p_recipient_wallet_id;
    
    -- Create sender transaction record
    INSERT INTO transactions (
      user_id,
      wallet_id,
      transaction_type,
      amount,
      currency,
      reference,
      status,
      approval_status,
      admin_notes,
      created_at,
      updated_at
    ) VALUES (
      p_sender_user_id,
      p_sender_wallet_id,
      'transfer',
      -total_deduction,
      p_currency,
      p_reference,
      'completed',
      'completed',
      'Transfer to ' || p_recipient_name || ' (' || p_recipient_identifier || '). Fee: ' || p_fee_amount || ' ' || p_currency,
      NOW(),
      NOW()
    );
    
    -- Create recipient transaction record
    INSERT INTO transactions (
      user_id,
      wallet_id,
      transaction_type,
      amount,
      currency,
      reference,
      status,
      approval_status,
      admin_notes,
      created_at,
      updated_at
    ) VALUES (
      p_recipient_user_id,
      p_recipient_wallet_id,
      'transfer',
      p_amount,
      p_currency,
      p_reference,
      'completed',
      'completed',
      'Transfer received from user',
      NOW(),
      NOW()
    );
    
    -- Prepare success result
    result := jsonb_build_object(
      'success', true,
      'sender_balance', sender_balance - total_deduction,
      'recipient_balance', recipient_balance + p_amount,
      'reference', p_reference
    );
    
    RETURN result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE EXCEPTION 'Transfer failed: %', SQLERRM;
  END;
END;
$$;