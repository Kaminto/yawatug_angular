
// This file contains the corrected SQL migrations that can be run manually
export const correctDatabaseMigrations = `
-- Add current_price column to shares table without column reference
ALTER TABLE shares ADD COLUMN IF NOT EXISTS current_price numeric;

-- Update current_price to match price_per_share for existing records (separate step)
UPDATE shares SET current_price = price_per_share WHERE current_price IS NULL;

-- Create booking extension requests table
CREATE TABLE IF NOT EXISTS booking_extension_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid REFERENCES share_bookings(id) NOT NULL,
    user_id uuid REFERENCES profiles(id) NOT NULL,
    requested_days integer NOT NULL,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes text,
    reviewed_by uuid REFERENCES profiles(id),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create comprehensive transaction history table
CREATE TABLE IF NOT EXISTS user_transaction_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('share_purchase', 'share_sale', 'share_transfer_in', 'share_transfer_out', 'dividend_payment', 'wallet_deposit', 'wallet_withdrawal', 'currency_exchange')),
    reference_id uuid,
    amount numeric NOT NULL,
    currency text NOT NULL DEFAULT 'UGX',
    description text NOT NULL,
    status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES profiles(id) NOT NULL,
    action_type text NOT NULL,
    target_table text NOT NULL,
    target_id uuid,
    old_values jsonb,
    new_values jsonb,
    description text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE booking_extension_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Add policies (these would need to be run after the function exists)
-- Note: Assumes get_current_user_role() function exists
`;
