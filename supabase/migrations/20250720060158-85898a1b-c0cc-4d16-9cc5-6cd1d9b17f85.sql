-- Remove the foreign key constraint from wallets table temporarily for bulk import
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;

-- Add a temporary marker to identify wallets for imported users
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS import_batch_id TEXT;