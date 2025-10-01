
-- 1. Ensure all users except the admin have user_role = 'user'
UPDATE public.profiles
SET user_role = 'user'
WHERE (user_role IS NULL OR user_role = '' OR user_role <> 'admin')
AND (email <> 'yawatu256@gmail.com');

-- 2. Ensure your admin has user_role = 'admin'
UPDATE public.profiles
SET user_role = 'admin'
WHERE email = 'yawatu256@gmail.com';

-- 3. Optionally enforce NOT NULL at the DB level for user_role (safe only if all rows populated)
-- ALTER TABLE public.profiles ALTER COLUMN user_role SET NOT NULL;
-- ALTER TABLE public.profiles ALTER COLUMN account_type SET NOT NULL;

-- 4. (Optional, if you wish to fully deprecate user_type)
-- UPDATE public.profiles SET user_type = NULL;

-- 5. Double check with:
-- SELECT id, email, user_role FROM public.profiles;
