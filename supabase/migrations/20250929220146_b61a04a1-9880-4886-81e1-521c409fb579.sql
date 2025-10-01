-- Add processed_at column to share_sell_orders if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'share_sell_orders' 
    AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE public.share_sell_orders 
    ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;