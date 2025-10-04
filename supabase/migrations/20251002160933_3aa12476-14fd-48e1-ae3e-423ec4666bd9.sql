
-- Drop the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger pointing to the correct function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Drop the old function to avoid confusion
DROP FUNCTION IF EXISTS public.handle_new_user_profile_and_wallet();
