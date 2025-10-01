
-- Create verification_submissions table
CREATE TABLE public.verification_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.verification_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification submissions" 
  ON public.verification_submissions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification submissions" 
  ON public.verification_submissions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification submissions" 
  ON public.verification_submissions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  );

-- Add business to user_type enum
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'business';
