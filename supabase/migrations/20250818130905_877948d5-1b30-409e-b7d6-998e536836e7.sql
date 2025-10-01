-- Create transaction fee settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.transaction_fee_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_type TEXT NOT NULL,
  percentage_fee NUMERIC NOT NULL DEFAULT 0,
  flat_fee NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'UGX',
  minimum_fee NUMERIC DEFAULT NULL,
  maximum_fee NUMERIC DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fee_collection_enabled BOOLEAN NOT NULL DEFAULT true,
  fee_type TEXT NOT NULL DEFAULT 'percentage',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_fee_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage transaction fee settings" 
ON public.transaction_fee_settings 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view transaction fee settings" 
ON public.transaction_fee_settings 
FOR SELECT 
USING (true);

-- Insert default fee settings for different transaction types
INSERT INTO public.transaction_fee_settings (transaction_type, percentage_fee, flat_fee, currency, minimum_fee, maximum_fee) VALUES
('transfer', 1.5, 1000, 'UGX', 1000, 50000),
('share_transfer', 1.0, 5000, 'UGX', 5000, 100000),
('exchange', 2.0, 2000, 'UGX', 2000, 75000),
('withdraw', 2.5, 3000, 'UGX', 3000, 100000),
('deposit', 0.5, 500, 'UGX', 500, 25000),
('share_purchase', 0.5, 1000, 'UGX', 1000, 50000),
('share_sale', 1.0, 2000, 'UGX', 2000, 75000)
ON CONFLICT DO NOTHING;