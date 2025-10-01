-- Create storage bucket for user documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-documents', 
  'user-documents', 
  false, 
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for user documents storage
CREATE POLICY "Admins can view all user documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-documents' AND 
  is_admin(auth.uid())
);

CREATE POLICY "Admins can upload user documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-documents' AND 
  is_admin(auth.uid())
);

CREATE POLICY "Admins can update user documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-documents' AND 
  is_admin(auth.uid())
);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);