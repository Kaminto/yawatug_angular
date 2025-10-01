
-- Drop and recreate RLS policies for transactions table to properly handle transfers
DO $$
BEGIN
  -- Drop all existing policies
  DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
  DROP POLICY IF EXISTS "System can create transfer transactions" ON public.transactions;
  DROP POLICY IF EXISTS "System can create any transaction" ON public.transactions;
  
  -- Create policy for users to view their own transactions
  CREATE POLICY "Users can view their own transactions" 
    ON public.transactions 
    FOR SELECT 
    USING (auth.uid() = user_id);
  
  -- Create policy for users to create their own transactions
  CREATE POLICY "Users can create their own transactions" 
    ON public.transactions 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  
  -- Create policy for users to update their own transactions
  CREATE POLICY "Users can update their own transactions" 
    ON public.transactions 
    FOR UPDATE 
    USING (auth.uid() = user_id);
    
  -- Create policy to allow creating transfer transactions for ANY user (system operation)
  CREATE POLICY "Allow transfer transactions for any user" 
    ON public.transactions 
    FOR INSERT 
    WITH CHECK (
      transaction_type IN ('funds_transfer', 'fee') OR 
      auth.uid() = user_id
    );

EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists, ignore
END $$;
