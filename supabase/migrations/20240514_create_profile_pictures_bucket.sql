
-- Create a bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'profile_pictures', 'Profile Pictures Storage', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'profile_pictures'
);

-- Set up RLS policies for the profile_pictures bucket
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile_pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own profile pictures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile_pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile_pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile_pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Profile pictures are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile_pictures');

-- Create a bucket for documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'documents', 'User Documents Storage', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
);

-- Set up RLS policies for the documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable admins to access all documents
CREATE POLICY "Admins can access all documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'documents' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Documents are publicly viewable (but protected by specific URLs)
CREATE POLICY "Documents are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');
