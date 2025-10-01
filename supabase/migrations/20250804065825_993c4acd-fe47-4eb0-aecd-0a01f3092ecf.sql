-- Create RelWorx payment configurations table
CREATE TABLE public.relworx_payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  is_sandbox BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relworx_payment_configs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins only
CREATE POLICY "Admins can manage RelWorx configs" ON public.relworx_payment_configs
  FOR ALL USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Create payment gateway transactions table
CREATE TABLE public.payment_gateway_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_transaction_id UUID REFERENCES public.transactions(id),
  gateway_transaction_id TEXT NOT NULL,
  gateway_reference TEXT NOT NULL,
  gateway_name TEXT DEFAULT 'relworx',
  payment_method TEXT NOT NULL, -- 'mtn_momo', 'airtel_money', 'stripe_card'
  phone_number TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  gateway_response JSONB,
  webhook_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_gateway_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own gateway transactions" ON public.payment_gateway_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all gateway transactions" ON public.payment_gateway_transactions
  FOR ALL USING (is_admin(auth.uid()));

-- Add gateway fields to existing transactions table
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS gateway_reference TEXT,
  ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'internal';

-- Create phone number validation function
CREATE OR REPLACE FUNCTION public.validate_ugandan_phone(phone_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  cleaned_phone TEXT;
  network TEXT;
  is_valid BOOLEAN := false;
BEGIN
  -- Remove spaces, dashes, plus signs
  cleaned_phone := regexp_replace(phone_text, '[^0-9]', '', 'g');
  
  -- Handle different formats
  IF cleaned_phone ~ '^256[0-9]{9}$' THEN
    -- Format: 256XXXXXXXXX
    cleaned_phone := cleaned_phone;
    is_valid := true;
  ELSIF cleaned_phone ~ '^0[0-9]{9}$' THEN
    -- Format: 0XXXXXXXXX
    cleaned_phone := '256' || substring(cleaned_phone, 2);
    is_valid := true;
  ELSIF cleaned_phone ~ '^[0-9]{9}$' THEN
    -- Format: XXXXXXXXX
    cleaned_phone := '256' || cleaned_phone;
    is_valid := true;
  END IF;
  
  -- Detect network
  IF is_valid THEN
    CASE 
      WHEN cleaned_phone ~ '^256(77|78|76)[0-9]{7}$' THEN network := 'mtn';
      WHEN cleaned_phone ~ '^256(70|75|74)[0-9]{7}$' THEN network := 'airtel';
      ELSE 
        network := 'unknown';
        is_valid := false;
    END CASE;
  END IF;
  
  RETURN jsonb_build_object(
    'is_valid', is_valid,
    'formatted_phone', cleaned_phone,
    'network', network,
    'original_phone', phone_text
  );
END;
$function$;