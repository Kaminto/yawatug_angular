-- Create admin_expenses table to properly track expenses
CREATE TABLE IF NOT EXISTS public.admin_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text NOT NULL,
  category_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'UGX',
  description text NOT NULL,
  reference text,
  processed_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage expenses" 
ON public.admin_expenses 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_admin_expenses_updated_at
  BEFORE UPDATE ON public.admin_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();