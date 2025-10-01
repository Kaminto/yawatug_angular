-- Allow users to view their own sell orders so the client UI can display them
-- Enable RLS (safe if already enabled)
ALTER TABLE public.share_sell_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own sell orders
DROP POLICY IF EXISTS "Users can view their own sell orders" ON public.share_sell_orders;

CREATE POLICY "Users can view their own sell orders"
ON public.share_sell_orders
FOR SELECT
USING (auth.uid() = user_id);