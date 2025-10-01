-- Fix the process_share_transfer function to handle fee allocation properly
CREATE OR REPLACE FUNCTION public.process_share_transfer(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  transfer_record RECORD;
  sender_holding RECORD;
  recipient_holding RECORD;
  sender_wallet_balance NUMERIC;
  transaction_id UUID;
  result jsonb;
BEGIN
  -- Start transaction
  BEGIN
    -- Lock and validate transfer request
    SELECT * INTO transfer_record 
    FROM share_transfer_requests 
    WHERE id = p_transfer_id AND status = 'approved'
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Transfer not found or not approved');
    END IF;
    
    -- Get sender's current wallet balance for audit
    SELECT balance INTO sender_wallet_balance
    FROM wallets 
    WHERE user_id = transfer_record.sender_id AND currency = 'UGX';
    
    -- Validate sender has enough balance for fees
    IF sender_wallet_balance < transfer_record.transfer_fee THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance for transfer fee');
    END IF;
    
    -- Lock sender's shares
    SELECT * INTO sender_holding
    FROM user_share_holdings
    WHERE user_id = transfer_record.sender_id 
      AND share_id = transfer_record.share_id
    FOR UPDATE;
    
    -- Validate sender has enough shares
    IF sender_holding.quantity < transfer_record.quantity THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient shares');
    END IF;
    
    -- Store audit information
    UPDATE share_transfer_requests 
    SET sender_balance_before = sender_holding.quantity,
        recipient_balance_before = COALESCE((SELECT quantity FROM user_share_holdings WHERE user_id = transfer_record.recipient_id AND share_id = transfer_record.share_id), 0)
    WHERE id = p_transfer_id;
    
    -- Create a transaction record for the transfer fee
    INSERT INTO transactions (
      user_id,
      wallet_id,
      transaction_type,
      amount,
      currency,
      status,
      description,
      admin_notes
    )
    SELECT 
      transfer_record.sender_id,
      w.id,
      'share_transfer_fee',
      -transfer_record.transfer_fee,
      'UGX',
      'completed',
      'Share transfer fee',
      'Fee for transferring ' || transfer_record.quantity || ' shares'
    FROM wallets w 
    WHERE w.user_id = transfer_record.sender_id AND w.currency = 'UGX'
    RETURNING id INTO transaction_id;
    
    -- Update sender's holdings
    UPDATE user_share_holdings 
    SET quantity = quantity - transfer_record.quantity,
        updated_at = now()
    WHERE user_id = transfer_record.sender_id 
      AND share_id = transfer_record.share_id;
    
    -- Delete sender's holding if quantity becomes 0
    DELETE FROM user_share_holdings 
    WHERE user_id = transfer_record.sender_id 
      AND share_id = transfer_record.share_id 
      AND quantity = 0;
    
    -- Update or create recipient's holdings (FIXED: include total_invested)
    INSERT INTO user_share_holdings (user_id, share_id, quantity, average_buy_price, total_invested, created_at, updated_at)
    VALUES (
      transfer_record.recipient_id, 
      transfer_record.share_id, 
      transfer_record.quantity, 
      transfer_record.share_price, 
      transfer_record.quantity * transfer_record.share_price,
      now(), 
      now()
    )
    ON CONFLICT (user_id, share_id) 
    DO UPDATE SET 
      quantity = user_share_holdings.quantity + transfer_record.quantity,
      average_buy_price = (
        (user_share_holdings.quantity * user_share_holdings.average_buy_price + 
         transfer_record.quantity * transfer_record.share_price) / 
        (user_share_holdings.quantity + transfer_record.quantity)
      ),
      total_invested = user_share_holdings.total_invested + (transfer_record.quantity * transfer_record.share_price),
      updated_at = now();
    
    -- Deduct transfer fee from sender's wallet
    UPDATE wallets 
    SET balance = balance - transfer_record.transfer_fee,
        updated_at = now()
    WHERE user_id = transfer_record.sender_id AND currency = 'UGX';
    
    -- Allocate fee to admin fund using the proper transaction ID
    IF transaction_id IS NOT NULL THEN
      PERFORM allocate_transaction_fee_enhanced(
        transaction_id,
        transfer_record.sender_id,
        'share_transfer',
        transfer_record.transfer_value,
        transfer_record.transfer_fee,
        'UGX'
      );
    END IF;
    
    -- Update audit trail
    UPDATE share_transfer_requests 
    SET sender_balance_after = COALESCE((SELECT quantity FROM user_share_holdings WHERE user_id = transfer_record.sender_id AND share_id = transfer_record.share_id), 0),
        recipient_balance_after = (SELECT quantity FROM user_share_holdings WHERE user_id = transfer_record.recipient_id AND share_id = transfer_record.share_id)
    WHERE id = p_transfer_id;
    
    -- Mark transfer as completed
    UPDATE share_transfer_requests 
    SET status = 'completed', 
        completed_at = now()
    WHERE id = p_transfer_id;
    
    -- Create notifications
    INSERT INTO transfer_notifications (transfer_id, user_id, notification_type, title, message)
    VALUES 
    (p_transfer_id, transfer_record.sender_id, 'completed', 'Transfer Completed', 'Your share transfer has been completed successfully'),
    (p_transfer_id, transfer_record.recipient_id, 'completed', 'Shares Received', 'You have received shares via transfer');
    
    RETURN jsonb_build_object('success', true, 'message', 'Transfer completed successfully');
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$function$;