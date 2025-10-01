-- Create share_sell_orders table for managing share sell orders
CREATE TABLE IF NOT EXISTS public.share_sell_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  share_id UUID NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  order_type TEXT NOT NULL DEFAULT 'market' CHECK (order_type IN ('market', 'limit')),
  requested_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'expired')),
  fifo_position INTEGER,
  total_value NUMERIC,
  fee_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC,
  processing_batch_id UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  cancellation_reason TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.share_sell_orders
ADD CONSTRAINT fk_share_sell_orders_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.share_sell_orders
ADD CONSTRAINT fk_share_sell_orders_share_id 
FOREIGN KEY (share_id) REFERENCES public.shares(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_share_sell_orders_user_id ON public.share_sell_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_share_sell_orders_share_id ON public.share_sell_orders(share_id);
CREATE INDEX IF NOT EXISTS idx_share_sell_orders_status ON public.share_sell_orders(status);
CREATE INDEX IF NOT EXISTS idx_share_sell_orders_fifo_position ON public.share_sell_orders(fifo_position);
CREATE INDEX IF NOT EXISTS idx_share_sell_orders_created_at ON public.share_sell_orders(created_at);

-- Enable RLS
ALTER TABLE public.share_sell_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sell orders"
ON public.share_sell_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sell orders"
ON public.share_sell_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending sell orders"
ON public.share_sell_orders FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all sell orders"
ON public.share_sell_orders FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update sell orders"
ON public.share_sell_orders FOR UPDATE
USING (is_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_share_sell_orders_updated_at
BEFORE UPDATE ON public.share_sell_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create submit_sell_order function
CREATE OR REPLACE FUNCTION public.submit_sell_order(
  p_user_id UUID,
  p_share_id UUID,
  p_quantity INTEGER,
  p_order_type TEXT DEFAULT 'market',
  p_requested_price NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_share_price NUMERIC;
  v_total_value NUMERIC;
  v_fee_amount NUMERIC := 0;
  v_net_amount NUMERIC;
  v_fifo_position INTEGER;
BEGIN
  -- Get current share price
  SELECT price_per_share INTO v_share_price
  FROM public.shares
  WHERE id = p_share_id;
  
  IF v_share_price IS NULL THEN
    RAISE EXCEPTION 'Share not found';
  END IF;
  
  -- Calculate values
  v_total_value := v_share_price * p_quantity;
  
  -- For now, set fee to 0 (can be updated later with proper fee calculation)
  v_fee_amount := 0;
  v_net_amount := v_total_value - v_fee_amount;
  
  -- Get next FIFO position
  SELECT COALESCE(MAX(fifo_position), 0) + 1 INTO v_fifo_position
  FROM public.share_sell_orders
  WHERE status = 'pending';
  
  -- Insert sell order
  INSERT INTO public.share_sell_orders (
    user_id,
    share_id,
    quantity,
    order_type,
    requested_price,
    total_value,
    fee_amount,
    net_amount,
    fifo_position,
    status
  ) VALUES (
    p_user_id,
    p_share_id,
    p_quantity,
    p_order_type,
    p_requested_price,
    v_total_value,
    v_fee_amount,
    v_net_amount,
    v_fifo_position,
    'pending'
  ) RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$;