-- Check and ensure required tables exist for demo simulation

-- Create referral_codes table if not exists
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create referral_earnings table if not exists  
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  earning_amount NUMERIC NOT NULL DEFAULT 0,
  earning_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_shares table if not exists (different from user_share_holdings)
CREATE TABLE IF NOT EXISTS public.user_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id UUID NOT NULL REFERENCES public.shares(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  purchase_price_per_share NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shares ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for referral_codes
CREATE POLICY "Users can view their own referral codes" 
ON public.referral_codes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral codes" 
ON public.referral_codes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for referral_earnings
CREATE POLICY "Users can view their own referral earnings" 
ON public.referral_earnings FOR SELECT 
USING (auth.uid() = referrer_id);

CREATE POLICY "System can create referral earnings" 
ON public.referral_earnings FOR INSERT 
WITH CHECK (true);

-- Create RLS policies for user_shares
CREATE POLICY "Users can view their own shares" 
ON public.user_shares FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own shares" 
ON public.user_shares FOR ALL 
USING (auth.uid() = user_id);