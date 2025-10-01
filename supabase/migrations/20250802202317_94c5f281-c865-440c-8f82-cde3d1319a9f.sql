-- First, let's check the current foreign key constraint
-- and modify it to reference the profiles table instead of auth.users

-- Drop the existing foreign key constraint on investment_club_members
ALTER TABLE public.investment_club_members
DROP CONSTRAINT IF EXISTS investment_club_members_user_id_fkey;

-- Add new foreign key constraint that references profiles table
ALTER TABLE public.investment_club_members
ADD CONSTRAINT investment_club_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;