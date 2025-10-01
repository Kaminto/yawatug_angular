-- Fix transaction_fee_settings table by adding missing is_active column
ALTER TABLE transaction_fee_settings 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add foreign key relationship between transactions and profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES profiles(id);
    END IF;
END $$;