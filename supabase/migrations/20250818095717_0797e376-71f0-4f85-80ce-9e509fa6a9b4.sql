-- Create demo user account if it doesn't exist
-- This will be handled by an edge function since we need to create auth users

-- First, let's check if we have any existing demo profiles and clean them up
DELETE FROM public.profiles WHERE email LIKE 'demo_%@example.com';

-- Insert the demo profile that will be linked to the auth user
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  phone,
  account_type,
  nationality,
  country_of_residence,
  status,
  user_role,
  is_demo_account,
  created_at,
  updated_at
) VALUES (
  'demo-user-uuid-12345678-1234-1234-1234-123456789012',
  'demo@yawatu.com',
  'Demo User',
  '+256701234567',
  'individual',
  'Uganda',
  'Uganda',
  'active',
  'user',
  true,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  account_type = EXCLUDED.account_type,
  nationality = EXCLUDED.nationality,
  country_of_residence = EXCLUDED.country_of_residence,
  status = EXCLUDED.status,
  is_demo_account = true,
  updated_at = now();