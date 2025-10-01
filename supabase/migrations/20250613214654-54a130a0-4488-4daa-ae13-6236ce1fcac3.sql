
-- Add address field to profiles table
ALTER TABLE public.profiles ADD COLUMN address TEXT;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_address_length CHECK (char_length(address) <= 100);

-- Create user_edit_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_edit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  request_type TEXT NOT NULL,
  requested_changes JSONB,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for user_edit_requests
ALTER TABLE public.user_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own edit requests" 
  ON public.user_edit_requests 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own edit requests" 
  ON public.user_edit_requests 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all edit requests" 
  ON public.user_edit_requests 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  );
