
-- Create the profile_pictures bucket if it doesn't exist
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

-- Allow public access to view profile pictures
CREATE POLICY "Profile pictures are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile_pictures');
