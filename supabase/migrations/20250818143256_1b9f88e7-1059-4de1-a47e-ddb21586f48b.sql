-- Fix RelWorx payment configuration issues
-- Add missing account_no field to relworx_payment_configs if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'relworx_payment_configs' AND column_name = 'account_no') THEN
        ALTER TABLE public.relworx_payment_configs ADD COLUMN account_no TEXT;
    END IF;
END $$;

-- Update any existing RelWorx config with placeholder account_no if missing
UPDATE public.relworx_payment_configs 
SET account_no = 'RELWORX_ACCOUNT_NUMBER_REQUIRED'
WHERE account_no IS NULL OR account_no = '';

-- Add a constraint to ensure account_no is not empty for active configs
ALTER TABLE public.relworx_payment_configs 
ADD CONSTRAINT check_account_no_not_empty 
CHECK (NOT is_active OR (account_no IS NOT NULL AND account_no != ''));