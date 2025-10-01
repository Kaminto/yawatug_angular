
-- Add missing total_amount column to share_transactions table
ALTER TABLE public.share_transactions 
ADD COLUMN IF NOT EXISTS total_amount NUMERIC;

-- Update existing records to calculate total_amount from quantity * price_per_share
UPDATE public.share_transactions 
SET total_amount = quantity * price_per_share 
WHERE total_amount IS NULL;
