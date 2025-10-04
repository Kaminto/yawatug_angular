-- Backfill missing profiles for transaction user_ids, then swap FK to profiles
BEGIN;

-- 1) Create minimal profiles for any user_id present in transactions but missing in profiles
INSERT INTO public.profiles (id, created_at, updated_at)
SELECT DISTINCT t.user_id, now(), now()
FROM public.transactions t
LEFT JOIN public.profiles p ON p.id = t.user_id
WHERE p.id IS NULL;

-- 2) Replace FK on transactions.user_id to reference profiles(id)
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

COMMIT;