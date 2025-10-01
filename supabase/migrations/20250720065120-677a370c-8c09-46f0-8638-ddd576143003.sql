-- Update all non-admin profiles to have an import_batch_id
UPDATE public.profiles 
SET 
  import_batch_id = 'BATCH_' || to_char(created_at, 'YYYY_MM_DD') || '_001',
  account_activation_status = 'pending'
WHERE user_role != 'admin' 
  AND import_batch_id IS NULL;