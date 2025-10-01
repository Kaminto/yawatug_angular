-- Create merchant codes and bank accounts tables for admin configuration

-- Table for storing merchant codes for payment providers
CREATE TABLE public.admin_merchant_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL,
  merchant_code TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  is_active BOOLEAN NOT NULL DEFAULT true,
  environment TEXT NOT NULL DEFAULT 'production', -- sandbox, production
  api_endpoint TEXT,
  webhook_url TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_name, currency, environment)
);

-- Table for storing bank accounts for different currencies and purposes
CREATE TABLE public.admin_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_code TEXT,
  swift_code TEXT,
  currency TEXT NOT NULL DEFAULT 'UGX',
  account_type TEXT NOT NULL DEFAULT 'business', -- business, escrow, operational
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_merchant_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for merchant codes
CREATE POLICY "Admins can manage merchant codes" 
ON public.admin_merchant_codes 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create policies for bank accounts
CREATE POLICY "Admins can manage bank accounts" 
ON public.admin_bank_accounts 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_merchant_codes_provider_currency ON public.admin_merchant_codes(provider_name, currency);
CREATE INDEX idx_bank_accounts_currency_type ON public.admin_bank_accounts(currency, account_type);

-- Create triggers for updated_at
CREATE TRIGGER update_merchant_codes_updated_at
  BEFORE UPDATE ON public.admin_merchant_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.admin_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();