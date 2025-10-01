-- Create share_pool_adjustments table for tracking share pool changes
CREATE TABLE public.share_pool_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES public.shares(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
  quantity_changed INTEGER NOT NULL CHECK (quantity_changed > 0),
  previous_total INTEGER NOT NULL,
  new_total INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.share_pool_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies for share pool adjustments
CREATE POLICY "Admins can manage share pool adjustments" 
ON public.share_pool_adjustments 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create index for better performance
CREATE INDEX idx_share_pool_adjustments_share_id ON public.share_pool_adjustments(share_id);
CREATE INDEX idx_share_pool_adjustments_created_at ON public.share_pool_adjustments(created_at DESC);