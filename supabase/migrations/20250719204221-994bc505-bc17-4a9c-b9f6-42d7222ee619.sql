-- Add DELETE policy for users to delete their own documents
CREATE POLICY "Users can delete their own documents" 
ON public.user_documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add DELETE policy for admins to delete any documents  
CREATE POLICY "Admins can delete all documents" 
ON public.user_documents 
FOR DELETE 
USING (is_admin(auth.uid()));