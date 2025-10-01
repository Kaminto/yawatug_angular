-- Create proper storage policies for profile-pictures bucket
-- Only create policies that don't already exist

DO $$
BEGIN
  -- Check and create upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own profile pictures'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can upload their own profile pictures" 
    ON storage.objects 
    FOR INSERT 
    WITH CHECK (
      bucket_id = ''profile-pictures'' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    )';
  END IF;

  -- Check and create update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own profile pictures'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own profile pictures" 
    ON storage.objects 
    FOR UPDATE 
    USING (
      bucket_id = ''profile-pictures'' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    )';
  END IF;

  -- Check and create view policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view profile pictures'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view profile pictures" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = ''profile-pictures'')';
  END IF;
END $$;