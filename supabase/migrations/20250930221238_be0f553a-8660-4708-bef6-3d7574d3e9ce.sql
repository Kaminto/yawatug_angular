-- Fix record_share_purchase_transaction to avoid non-existent column references and enforce transaction-based wallet updates
DROP FUNCTION IF EXISTS public.record_share_purchase_transaction CASCADE;

CREATE OR REPLACE FUNCTION public.record_share_purchase_transaction(
  p_user_id UUID,
  p_wallet_id UUID,
  p_share_id UUID,
  p_quantity INTEGER,
  p_price_per_share NUMERIC,
  p_total_amount NUMERIC,
  p_currency TEXT,
  p_order_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx_id UUID;
BEGIN
  -- Create a financial transaction for the share purchase (negative amount)
  INSERT INTO public.transactions (
    user_id,
    wallet_id,
    transaction_type,
    amount,
    currency,
    status,
    description,
    reference,
    metadata
  ) VALUES (
    p_user_id,
    p_wallet_id,
    'share_purchase',
    -ABS(p_total_amount),
    p_currency,
    'completed',
    'Share purchase via wallet',
    p_order_id::TEXT,
    jsonb_build_object(
      'share_id', p_share_id,
      'quantity', p_quantity,
      'price_per_share', p_price_per_share
    )
  ) RETURNING id INTO v_tx_id;

  -- Allocate fees snapshot (updates transactions.fee_*) without referencing any non-existent columns
  PERFORM public.allocate_transaction_fee_with_snapshot(v_tx_id, p_user_id, 'share_purchase', p_total_amount, p_currency);

  RETURN v_tx_id;
END;
$$;