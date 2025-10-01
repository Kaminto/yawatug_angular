-- Create investment club members table first
CREATE TABLE public.investment_club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_code TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  total_deposits NUMERIC DEFAULT 0,
  total_withdrawals NUMERIC DEFAULT 0,
  net_balance NUMERIC DEFAULT 0,
  member_type TEXT DEFAULT 'regular',
  join_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investment_club_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own club membership" 
ON public.investment_club_members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all club members" 
ON public.investment_club_members 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create debt conversion agreements table
CREATE TABLE public.debt_conversion_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_member_id UUID NOT NULL REFERENCES investment_club_members(id) ON DELETE CASCADE,
  debt_amount NUMERIC NOT NULL,
  shares_to_receive NUMERIC NOT NULL,
  conversion_rate NUMERIC NOT NULL,
  consent_given BOOLEAN DEFAULT FALSE,
  consent_given_at TIMESTAMP WITH TIME ZONE,
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.debt_conversion_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Club members can view their own conversion agreements" 
ON public.debt_conversion_agreements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM investment_club_members icm 
  WHERE icm.id = club_member_id AND icm.user_id = auth.uid()
));

CREATE POLICY "Club members can create their own conversion agreements" 
ON public.debt_conversion_agreements 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM investment_club_members icm 
  WHERE icm.id = club_member_id AND icm.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all conversion agreements" 
ON public.debt_conversion_agreements 
FOR ALL 
USING (is_admin(auth.uid()));