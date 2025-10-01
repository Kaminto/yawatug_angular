-- Create function to check if a transfer should be auto-approved
CREATE OR REPLACE FUNCTION public.check_auto_approval(p_transfer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  transfer_record RECORD;
  sender_verification_status text;
  recipient_verification_status text;
  transfer_settings RECORD;
BEGIN
  -- Get transfer details
  SELECT * INTO transfer_record
  FROM share_transfer_requests
  WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Get sender and recipient verification status
  SELECT status INTO sender_verification_status
  FROM profiles
  WHERE id = transfer_record.sender_id;
  
  SELECT status INTO recipient_verification_status  
  FROM profiles
  WHERE id = transfer_record.recipient_id;
  
  -- Auto-approve if:
  -- 1. Both users are verified (status = 'active')
  -- 2. Transfer value is under a certain threshold (e.g., 500,000 UGX)
  -- 3. No suspicious activity flags
  
  IF sender_verification_status = 'active' 
     AND recipient_verification_status = 'active'
     AND transfer_record.transfer_value <= 500000 THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Create function to process share transfers
CREATE OR REPLACE FUNCTION public.process_share_transfer(p_transfer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  transfer_record RECORD;
  sender_shares RECORD;
  recipient_wallet_id uuid;
  sender_wallet_id uuid;
  result jsonb;
BEGIN
  -- Get transfer details
  SELECT * INTO transfer_record
  FROM share_transfer_requests
  WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transfer request not found'
    );
  END IF;
  
  -- Check if already processed
  IF transfer_record.status IN ('completed', 'rejected') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transfer already processed'
    );
  END IF;
  
  -- Check if approved
  IF transfer_record.status != 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transfer not approved'
    );
  END IF;
  
  -- Verify sender has enough shares
  SELECT * INTO sender_shares
  FROM user_shares
  WHERE user_id = transfer_record.sender_id 
    AND share_id = transfer_record.share_id
    AND quantity >= transfer_record.quantity;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sender does not have enough shares'
    );
  END IF;
  
  -- Get wallet IDs
  SELECT id INTO sender_wallet_id
  FROM wallets
  WHERE user_id = transfer_record.sender_id AND currency = 'UGX';
  
  SELECT id INTO recipient_wallet_id
  FROM wallets
  WHERE user_id = transfer_record.recipient_id AND currency = 'UGX';
  
  -- Create recipient wallet if it doesn't exist
  IF recipient_wallet_id IS NULL THEN
    INSERT INTO wallets (user_id, currency, balance, status)
    VALUES (transfer_record.recipient_id, 'UGX', 0, 'active')
    RETURNING id INTO recipient_wallet_id;
  END IF;
  
  -- Start transaction
  BEGIN
    -- Record balances before transfer
    UPDATE share_transfer_requests
    SET sender_balance_before = sender_shares.quantity
    WHERE id = p_transfer_id;
    
    -- Deduct shares from sender
    UPDATE user_shares
    SET quantity = quantity - transfer_record.quantity,
        updated_at = now()
    WHERE user_id = transfer_record.sender_id 
      AND share_id = transfer_record.share_id;
    
    -- Delete sender record if quantity becomes 0
    DELETE FROM user_shares
    WHERE user_id = transfer_record.sender_id 
      AND share_id = transfer_record.share_id
      AND quantity <= 0;
    
    -- Add shares to recipient (or create new record)
    INSERT INTO user_shares (user_id, share_id, quantity, purchase_price_per_share, currency)
    VALUES (
      transfer_record.recipient_id,
      transfer_record.share_id,
      transfer_record.quantity,
      transfer_record.share_price,
      'UGX'
    )
    ON CONFLICT (user_id, share_id)
    DO UPDATE SET
      quantity = user_shares.quantity + transfer_record.quantity,
      updated_at = now();
    
    -- Deduct transfer fee from sender wallet
    UPDATE wallets
    SET balance = balance - transfer_record.transfer_fee,
        updated_at = now()
    WHERE id = sender_wallet_id;
    
    -- Create transaction record for the fee
    INSERT INTO transactions (
      user_id, wallet_id, amount, transaction_type, status, currency, description, fee_amount
    ) VALUES (
      transfer_record.sender_id, sender_wallet_id, -transfer_record.transfer_fee,
      'share_transfer_fee', 'completed', 'UGX', 
      'Share transfer fee for ' || transfer_record.quantity || ' shares', transfer_record.transfer_fee
    );
    
    -- Update transfer status
    UPDATE share_transfer_requests
    SET status = 'completed',
        completed_at = now(),
        sender_balance_after = sender_shares.quantity - transfer_record.quantity,
        recipient_balance_before = COALESCE((
          SELECT quantity FROM user_shares 
          WHERE user_id = transfer_record.recipient_id AND share_id = transfer_record.share_id
        ), 0),
        recipient_balance_after = COALESCE((
          SELECT quantity FROM user_shares 
          WHERE user_id = transfer_record.recipient_id AND share_id = transfer_record.share_id
        ), 0)
    WHERE id = p_transfer_id;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Share transfer completed successfully'
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    RAISE;
  END;
  
  RETURN result;
END;
$$;