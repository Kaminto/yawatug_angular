-- Fix the admin policy for transactions table to use user_role instead of user_type
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update all transactions" ON transactions;

-- Create corrected admin policies that check user_role = 'admin'
CREATE POLICY "Admins can view all transactions" 
ON transactions 
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

CREATE POLICY "Admins can update all transactions" 
ON transactions 
FOR UPDATE 
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);