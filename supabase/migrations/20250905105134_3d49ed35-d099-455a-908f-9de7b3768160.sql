-- Add fee columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN fee_amount NUMERIC DEFAULT 0,
ADD COLUMN fee_percentage NUMERIC DEFAULT 0,
ADD COLUMN flat_fee NUMERIC DEFAULT 0;

-- Update existing transactions with fees from transaction_fee_collections
UPDATE public.transactions 
SET 
  fee_amount = COALESCE(tfc.actual_fee_collected, 0),
  fee_percentage = COALESCE(tfc.fee_percentage, 0),
  flat_fee = COALESCE(tfc.flat_fee, 0)
FROM public.transaction_fee_collections tfc
WHERE transactions.id = tfc.transaction_id;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_created_at ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_fee_amount ON public.transactions(fee_amount) WHERE fee_amount > 0;