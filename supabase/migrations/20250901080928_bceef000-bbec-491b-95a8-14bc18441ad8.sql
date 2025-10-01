-- Add missing cancelled_at column to share_purchase_orders table
ALTER TABLE public.share_purchase_orders 
ADD COLUMN cancelled_at timestamp with time zone DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.share_purchase_orders.cancelled_at IS 'Timestamp when the share purchase order was cancelled';