
-- Drop the existing trigger first, then the function
DROP TRIGGER IF EXISTS create_default_wallets_trigger ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP FUNCTION IF EXISTS public.create_default_wallets() CASCADE;

-- Recreate the function
CREATE OR REPLACE FUNCTION public.create_default_wallets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Insert default wallets for new user
  INSERT INTO public.wallets (user_id, currency, balance, status)
  VALUES 
    (NEW.id, 'USD', 0, 'active'),
    (NEW.id, 'UGX', 0, 'active')
  ON CONFLICT (user_id, currency) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically create wallets when a profile is created
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_wallets();

-- Create wallets for existing users who don't have them
INSERT INTO public.wallets (user_id, currency, balance, status)
SELECT p.id, 'USD', 0, 'active'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets w 
  WHERE w.user_id = p.id AND w.currency = 'USD'
);

INSERT INTO public.wallets (user_id, currency, balance, status)
SELECT p.id, 'UGX', 0, 'active'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets w 
  WHERE w.user_id = p.id AND w.currency = 'UGX'
);

-- Ensure wallets table has proper structure
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add unique constraint to prevent duplicate wallets (ignore if exists)
DO $$ 
BEGIN
    ALTER TABLE public.wallets ADD CONSTRAINT unique_user_currency UNIQUE (user_id, currency);
EXCEPTION 
    WHEN duplicate_table THEN NULL;
END $$;

-- Add foreign key constraint (ignore if exists)
DO $$ 
BEGIN
    ALTER TABLE public.transactions 
    ADD CONSTRAINT fk_transactions_wallet 
    FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;

-- Add RLS policies for wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallet status" ON public.wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins can update all wallets" ON public.wallets;

CREATE POLICY "Users can view their own wallets" 
  ON public.wallets 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet status" 
  ON public.wallets 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" 
  ON public.wallets 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  ));

CREATE POLICY "Admins can update all wallets" 
  ON public.wallets 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  ));

-- Add RLS policies for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update all transactions" ON public.transactions;

CREATE POLICY "Users can view their own transactions" 
  ON public.transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" 
  ON public.transactions 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  ));

CREATE POLICY "Admins can update all transactions" 
  ON public.transactions 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  ));
