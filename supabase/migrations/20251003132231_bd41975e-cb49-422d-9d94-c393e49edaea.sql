
-- Allow users to view profiles of people they have referred
CREATE POLICY "Users can view profiles they have referred"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = referred_by);
