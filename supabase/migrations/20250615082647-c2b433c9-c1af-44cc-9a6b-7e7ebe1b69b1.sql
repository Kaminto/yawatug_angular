
-- Add RLS policies for the shares table to allow admin operations
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to manage shares
CREATE POLICY "Admins can manage shares" 
  ON public.shares 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  ));

-- Policy to allow authenticated users to view shares
CREATE POLICY "Users can view shares" 
  ON public.shares 
  FOR SELECT 
  USING (true);

-- Create missing table for share booking payments
CREATE TABLE public.share_booking_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.share_bookings(id) NOT NULL,
  payment_amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for share booking payments
ALTER TABLE public.share_booking_payments ENABLE ROW LEVEL SECURITY;

-- Policy for share booking payments
CREATE POLICY "Users can manage their booking payments" 
  ON public.share_booking_payments 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.share_bookings 
    WHERE id = booking_id AND user_id = auth.uid()
  ));

-- Add missing columns to user_share_holdings table
ALTER TABLE public.user_share_holdings 
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Update user_share_holdings to use purchase_price
UPDATE public.user_share_holdings 
SET purchase_price = average_buy_price 
WHERE purchase_price IS NULL;
