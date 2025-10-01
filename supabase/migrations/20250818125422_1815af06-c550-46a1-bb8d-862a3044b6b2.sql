-- Ensure demo user setup and missing tables for complete user journey

-- First, let's ensure we have a proper shares table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shares') THEN
    CREATE TABLE public.shares (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      price_per_share NUMERIC NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UGX',
      available_shares INTEGER NOT NULL DEFAULT 0,
      total_shares INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Anyone can view shares" ON public.shares FOR SELECT USING (true);
    CREATE POLICY "Admins can manage shares" ON public.shares FOR ALL USING (is_admin(auth.uid()));
  END IF;
END $$;

-- Ensure user_shares table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_shares') THEN
    CREATE TABLE public.user_shares (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      share_id UUID NOT NULL REFERENCES public.shares(id),
      quantity INTEGER NOT NULL DEFAULT 0,
      purchase_price_per_share NUMERIC NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UGX',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    ALTER TABLE public.user_shares ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own shares" ON public.user_shares FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can manage their own shares" ON public.user_shares FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure referral_codes table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_codes') THEN
    CREATE TABLE public.referral_codes (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      code TEXT NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own referral codes" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can manage their own referral codes" ON public.referral_codes FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure referral_earnings table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_earnings') THEN
    CREATE TABLE public.referral_earnings (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      referrer_id UUID NOT NULL,
      referred_id UUID NOT NULL,
      earning_amount NUMERIC NOT NULL DEFAULT 0,
      earning_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own referral earnings" ON public.referral_earnings FOR SELECT USING (auth.uid() = referrer_id);
    CREATE POLICY "Users can manage their own referral earnings" ON public.referral_earnings FOR ALL USING (auth.uid() = referrer_id);
  END IF;
END $$;

-- Ensure share_buyback_orders table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'share_buyback_orders') THEN
    CREATE TABLE public.share_buyback_orders (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      share_id UUID NOT NULL REFERENCES public.shares(id),
      quantity INTEGER NOT NULL,
      requested_price NUMERIC NOT NULL,
      total_amount NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    ALTER TABLE public.share_buyback_orders ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own buyback orders" ON public.share_buyback_orders FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can manage their own buyback orders" ON public.share_buyback_orders FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure share_transfer_requests table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'share_transfer_requests') THEN
    CREATE TABLE public.share_transfer_requests (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      sender_id UUID NOT NULL,
      recipient_id UUID NOT NULL,
      share_id UUID NOT NULL REFERENCES public.shares(id),
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    ALTER TABLE public.share_transfer_requests ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view transfers they're involved in" ON public.share_transfer_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
    CREATE POLICY "Users can create transfer requests" ON public.share_transfer_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;

-- Insert initial demo share if not exists
INSERT INTO public.shares (name, price_per_share, currency, available_shares, total_shares, description)
SELECT 'Yawatu Ordinary Shares', 25000, 'UGX', 999990, 1000000, 'Ordinary shares in Yawatu mining operations'
WHERE NOT EXISTS (SELECT 1 FROM public.shares WHERE name = 'Yawatu Ordinary Shares');

-- Create function to setup demo user data
CREATE OR REPLACE FUNCTION setup_demo_user_data(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Create or update profile
  INSERT INTO public.profiles (
    id, email, full_name, user_role, status, 
    account_type, profile_completion_percentage,
    created_at, updated_at
  ) VALUES (
    p_user_id, 'demo@yawatu.com', 'Demo User', 'user', 'active',
    'individual', 100,
    now(), now()
  ) 
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    status = 'active',
    updated_at = now();

  -- Ensure default wallets exist
  INSERT INTO public.wallets (user_id, currency, balance, status)
  VALUES 
    (p_user_id, 'USD', 0, 'active'),
    (p_user_id, 'UGX', 0, 'active')
  ON CONFLICT (user_id, currency) DO NOTHING;

  result := jsonb_build_object(
    'success', true,
    'message', 'Demo user data setup completed',
    'user_id', p_user_id
  );

  RETURN result;
END;
$$;