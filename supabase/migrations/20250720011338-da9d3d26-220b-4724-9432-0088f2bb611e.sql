-- Remove the foreign key constraint temporarily for bulk import
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Allow duplicate phone numbers during import (we can clean up later)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;

-- Add a temporary marker to identify imported users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS import_batch_id TEXT;