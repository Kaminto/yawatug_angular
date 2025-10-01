-- Fix RLS policies for user_documents to allow admin operations

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.user_documents;

-- Create comprehensive policies for user_documents
-- Users can view their own documents
CREATE POLICY "Users can view their own documents" 
ON public.user_documents 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);

-- Users can insert their own documents OR admins can insert for any user
CREATE POLICY "Users can insert documents" 
ON public.user_documents 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);

-- Users can update their own documents OR admins can update any document
CREATE POLICY "Users can update documents" 
ON public.user_documents 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  )
) 
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);

-- Users can delete their own documents OR admins can delete any document
CREATE POLICY "Users can delete documents" 
ON public.user_documents 
FOR DELETE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_role = 'admin'
  )
);