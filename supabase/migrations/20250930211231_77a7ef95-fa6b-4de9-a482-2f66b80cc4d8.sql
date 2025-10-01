-- Drop existing function if it exists with any signature
DROP FUNCTION IF EXISTS public.record_share_purchase_transaction CASCADE;

-- =============================================
-- PHASE 1: Share Purchase Transaction Fix
-- Remove direct wallet updates, use transaction-based flow
-- =============================================

-- Create function to record share purchase transaction
CREATE OR REPLACE FUNCTION public.record_share_purchase_transaction(
  p_user_id UUID,
  p_share_id UUID,
  p_quantity INTEGER,
  p_price_per_share NUMERIC,
  p_total_amount NUMERIC,
  p_currency TEXT DEFAULT 'UGX',
  p_wallet_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_transaction_id UUID;
  v_fee_amount NUMERIC := 0;
  v_fee_settings RECORD;
BEGIN
  -- Get fee settings for share purchases
  SELECT * INTO v_fee_settings
  FROM transaction_fee_settings
  WHERE transaction_type = 'share_purchase' 
    AND currency = p_currency
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculate fee
  IF v_fee_settings IS NOT NULL THEN
    v_fee_amount := (p_total_amount * COALESCE(v_fee_settings.percentage_fee, 0) / 100) + 
                    COALESCE(v_fee_settings.flat_fee, 0);
    
    -- Apply min/max limits
    IF v_fee_settings.minimum_fee IS NOT NULL AND v_fee_amount < v_fee_settings.minimum_fee THEN
      v_fee_amount := v_fee_settings.minimum_fee;
    END IF;
    
    IF v_fee_settings.maximum_fee IS NOT NULL AND v_fee_amount > v_fee_settings.maximum_fee THEN
      v_fee_amount := v_fee_settings.maximum_fee;
    END IF;
  END IF;
  
  -- Create transaction record (negative amount for debit)
  INSERT INTO transactions (
    user_id,
    wallet_id,
    transaction_type,
    amount,
    currency,
    status,
    approval_status,
    fee_amount,
    fee_percentage,
    flat_fee,
    description,
    reference,
    metadata
  ) VALUES (
    p_user_id,
    p_wallet_id,
    'share_purchase',
    -(p_total_amount + v_fee_amount), -- Negative for debit
    p_currency,
    'completed',
    'approved',
    v_fee_amount,
    COALESCE(v_fee_settings.percentage_fee, 0),
    COALESCE(v_fee_settings.flat_fee, 0),
    format('Share purchase: %s shares @ %s each', p_quantity, p_price_per_share),
    p_order_id::TEXT,
    jsonb_build_object(
      'share_id', p_share_id,
      'quantity', p_quantity,
      'price_per_share', p_price_per_share
    )
  ) RETURNING id INTO v_transaction_id;
  
  -- Allocate fee to admin fund if any
  IF v_fee_amount > 0 THEN
    PERFORM allocate_transaction_fee(v_fee_amount, p_currency);
  END IF;
  
  RETURN v_transaction_id;
END;
$$;

-- =============================================
-- PHASE 2: Share Sell Transaction Processing
-- Complete sell order flow with transaction recording
-- =============================================

-- Create function to process share sell order completion
CREATE OR REPLACE FUNCTION public.process_sell_order_completion(
  p_order_id UUID,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_order RECORD;
  v_transaction_id UUID;
  v_fee_amount NUMERIC := 0;
  v_net_proceeds NUMERIC;
  v_fee_settings RECORD;
  v_wallet_id UUID;
  v_result JSONB;
  v_total_value NUMERIC;
  v_price_per_share NUMERIC;
BEGIN
  -- Get sell order details
  SELECT * INTO v_order
  FROM share_sell_orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sell order not found'
    );
  END IF;
  
  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order is not in pending status'
    );
  END IF;
  
  -- Get user's wallet
  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE user_id = v_order.user_id
    AND currency = 'UGX'
  LIMIT 1;
  
  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User wallet not found'
    );
  END IF;
  
  -- Get fee settings for share sales
  SELECT * INTO v_fee_settings
  FROM transaction_fee_settings
  WHERE transaction_type = 'share_sell'
    AND currency = 'UGX'
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get current share price
  SELECT price_per_share INTO v_price_per_share
  FROM shares
  WHERE id = v_order.share_id;
  
  v_total_value := v_price_per_share * v_order.quantity;
  
  -- Calculate fee
  IF v_fee_settings IS NOT NULL THEN
    v_fee_amount := (v_total_value * COALESCE(v_fee_settings.percentage_fee, 0) / 100) + 
                    COALESCE(v_fee_settings.flat_fee, 0);
    
    -- Apply min/max limits
    IF v_fee_settings.minimum_fee IS NOT NULL AND v_fee_amount < v_fee_settings.minimum_fee THEN
      v_fee_amount := v_fee_settings.minimum_fee;
    END IF;
    
    IF v_fee_settings.maximum_fee IS NOT NULL AND v_fee_amount > v_fee_settings.maximum_fee THEN
      v_fee_amount := v_fee_settings.maximum_fee;
    END IF;
  END IF;
  
  v_net_proceeds := v_total_value - v_fee_amount;
  
  -- Create share sale transaction (positive amount for credit)
  INSERT INTO transactions (
    user_id,
    wallet_id,
    transaction_type,
    amount,
    currency,
    status,
    approval_status,
    fee_amount,
    fee_percentage,
    flat_fee,
    description,
    reference,
    metadata
  ) VALUES (
    v_order.user_id,
    v_wallet_id,
    'share_sale',
    v_net_proceeds, -- Positive for credit (net proceeds after fees)
    'UGX',
    'completed',
    'approved',
    v_fee_amount,
    COALESCE(v_fee_settings.percentage_fee, 0),
    COALESCE(v_fee_settings.flat_fee, 0),
    format('Share sale: %s shares @ UGX %s each', v_order.quantity, v_order.requested_price),
    p_order_id::TEXT,
    jsonb_build_object(
      'share_id', v_order.share_id,
      'quantity', v_order.quantity,
      'price_per_share', v_order.requested_price,
      'total_value', v_total_value,
      'fee_amount', v_fee_amount,
      'net_proceeds', v_net_proceeds
    )
  ) RETURNING id INTO v_transaction_id;
  
  -- Update share_sell_orders
  UPDATE share_sell_orders
  SET 
    status = 'completed',
    processed_at = now(),
    processed_by = p_admin_id,
    estimated_fees = v_fee_amount,
    net_proceeds = v_net_proceeds,
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Update user_shares (reduce quantity)
  UPDATE user_shares
  SET 
    quantity = quantity - v_order.quantity,
    updated_at = now()
  WHERE user_id = v_order.user_id
    AND share_id = v_order.share_id;
  
  -- Delete user_shares record if quantity becomes 0
  DELETE FROM user_shares
  WHERE user_id = v_order.user_id
    AND share_id = v_order.share_id
    AND quantity <= 0;
  
  -- Create share_transaction record for tracking
  INSERT INTO share_transactions (
    user_id,
    share_id,
    transaction_type,
    quantity,
    price_per_share,
    total_amount,
    currency,
    status,
    reference
  ) VALUES (
    v_order.user_id,
    v_order.share_id,
    'sale',
    v_order.quantity,
    v_order.requested_price,
    v_total_value,
    'UGX',
    'completed',
    v_transaction_id::TEXT
  );
  
  -- Allocate fee to admin fund
  IF v_fee_amount > 0 THEN
    PERFORM allocate_transaction_fee(v_fee_amount, 'UGX');
  END IF;
  
  v_result := jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'order_id', p_order_id,
    'total_value', v_total_value,
    'fee_amount', v_fee_amount,
    'net_proceeds', v_net_proceeds,
    'message', 'Share sell order processed successfully'
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.record_share_purchase_transaction IS 'Records share purchase as a transaction with automatic wallet balance update via trigger';
COMMENT ON FUNCTION public.process_sell_order_completion IS 'Processes share sell order completion including transaction recording, fee allocation, and share quantity updates';