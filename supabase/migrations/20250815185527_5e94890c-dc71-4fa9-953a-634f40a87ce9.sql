-- Create or update relworx_payment_configs table
CREATE TABLE IF NOT EXISTS public.relworx_payment_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_no TEXT NOT NULL,
  api_key_hash TEXT,
  base_url TEXT NOT NULL DEFAULT 'https://payments.relworx.com',
  is_sandbox BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relworx_payment_configs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins only
CREATE POLICY "Admins can manage RelWorx configs" 
ON public.relworx_payment_configs 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Insert initial configuration (this will use the secrets from environment)
INSERT INTO public.relworx_payment_configs (
  account_no, 
  base_url, 
  is_active
) VALUES (
  'placeholder_account_no', -- This will be updated with actual account number
  'https://payments.relworx.com',
  true
) ON CONFLICT DO NOTHING;