-- Enhanced share transfer system implementation

-- Drop existing share_transfer_requests if it exists and recreate with proper structure
DROP TABLE IF EXISTS share_transfer_requests CASCADE;

-- Enhanced share_transfer_requests table
CREATE TABLE share_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  share_id UUID NOT NULL REFERENCES shares(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  share_price NUMERIC NOT NULL CHECK (share_price > 0),
  transfer_value NUMERIC NOT NULL CHECK (transfer_value > 0),
  transfer_fee NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  reason TEXT,
  auto_approved BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES profiles(id),
  
  -- Audit fields
  sender_balance_before NUMERIC,
  sender_balance_after NUMERIC,
  recipient_balance_before NUMERIC,
  recipient_balance_after NUMERIC,
  
  -- Constraints
  CONSTRAINT no_self_transfer CHECK (sender_id != recipient_id)
);

-- Transfer approval settings
CREATE TABLE IF NOT EXISTS transfer_approval_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_approve_under_value NUMERIC DEFAULT 100000,
  auto_approve_verified_users BOOLEAN DEFAULT true,
  auto_approve_family_transfers BOOLEAN DEFAULT true,
  max_daily_transfers_per_user INTEGER DEFAULT 3,
  cooling_period_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced fee settings specifically for transfers
CREATE TABLE IF NOT EXISTS share_transfer_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_percentage NUMERIC DEFAULT 1.0,
  flat_fee NUMERIC DEFAULT 5000,
  minimum_fee NUMERIC DEFAULT 5000,
  maximum_fee NUMERIC DEFAULT 50000,
  volume_discount_tiers JSONB DEFAULT '[]'::jsonb,
  vip_user_discount NUMERIC DEFAULT 0.5,
  currency TEXT DEFAULT 'UGX',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Transfer notifications
CREATE TABLE IF NOT EXISTS transfer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES share_transfer_requests(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('request_created', 'approved', 'completed', 'rejected')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default settings
INSERT INTO transfer_approval_settings (auto_approve_under_value, auto_approve_verified_users, max_daily_transfers_per_user, is_active)
VALUES (100000, true, 3, true)
ON CONFLICT DO NOTHING;

INSERT INTO share_transfer_fee_settings (base_percentage, flat_fee, minimum_fee, currency, is_active)
VALUES (1.0, 5000, 5000, 'UGX', true)
ON CONFLICT DO NOTHING;

-- Enhanced transfer processing function
CREATE OR REPLACE FUNCTION process_share_transfer(p_transfer_id UUID)
RETURNS jsonb AS $$
DECLARE
  transfer_record RECORD;
  sender_holding RECORD;
  recipient_holding RECORD;
  sender_wallet_balance NUMERIC;
  result jsonb;
BEGIN
  -- Start transaction
  BEGIN
    -- Lock and validate transfer request
    SELECT * INTO transfer_record 
    FROM share_transfer_requests 
    WHERE id = p_transfer_id AND status = 'approved'
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Transfer not found or not approved');
    END IF;
    
    -- Get sender's current wallet balance for audit
    SELECT balance INTO sender_wallet_balance
    FROM wallets 
    WHERE user_id = transfer_record.sender_id AND currency = 'UGX';
    
    -- Validate sender has enough balance for fees
    IF sender_wallet_balance < transfer_record.transfer_fee THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance for transfer fee');
    END IF;
    
    -- Lock sender's shares
    SELECT * INTO sender_holding
    FROM user_share_holdings
    WHERE user_id = transfer_record.sender_id 
      AND share_id = transfer_record.share_id
    FOR UPDATE;
    
    -- Validate sender has enough shares
    IF sender_holding.quantity < transfer_record.quantity THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient shares');
    END IF;
    
    -- Store audit information
    UPDATE share_transfer_requests 
    SET sender_balance_before = sender_holding.quantity,
        recipient_balance_before = COALESCE((SELECT quantity FROM user_share_holdings WHERE user_id = transfer_record.recipient_id AND share_id = transfer_record.share_id), 0)
    WHERE id = p_transfer_id;
    
    -- Update sender's holdings
    UPDATE user_share_holdings 
    SET quantity = quantity - transfer_record.quantity,
        updated_at = now()
    WHERE user_id = transfer_record.sender_id 
      AND share_id = transfer_record.share_id;
    
    -- Delete sender's holding if quantity becomes 0
    DELETE FROM user_share_holdings 
    WHERE user_id = transfer_record.sender_id 
      AND share_id = transfer_record.share_id 
      AND quantity = 0;
    
    -- Update or create recipient's holdings
    INSERT INTO user_share_holdings (user_id, share_id, quantity, average_buy_price, created_at, updated_at)
    VALUES (transfer_record.recipient_id, transfer_record.share_id, transfer_record.quantity, transfer_record.share_price, now(), now())
    ON CONFLICT (user_id, share_id) 
    DO UPDATE SET 
      quantity = user_share_holdings.quantity + transfer_record.quantity,
      average_buy_price = (
        (user_share_holdings.quantity * user_share_holdings.average_buy_price + 
         transfer_record.quantity * transfer_record.share_price) / 
        (user_share_holdings.quantity + transfer_record.quantity)
      ),
      updated_at = now();
    
    -- Deduct transfer fee from sender's wallet
    UPDATE wallets 
    SET balance = balance - transfer_record.transfer_fee,
        updated_at = now()
    WHERE user_id = transfer_record.sender_id AND currency = 'UGX';
    
    -- Allocate fee to admin fund
    PERFORM allocate_transaction_fee_enhanced(
      p_transfer_id,
      transfer_record.sender_id,
      'share_transfer',
      transfer_record.transfer_value,
      transfer_record.transfer_fee,
      'UGX'
    );
    
    -- Update audit trail
    UPDATE share_transfer_requests 
    SET sender_balance_after = COALESCE((SELECT quantity FROM user_share_holdings WHERE user_id = transfer_record.sender_id AND share_id = transfer_record.share_id), 0),
        recipient_balance_after = (SELECT quantity FROM user_share_holdings WHERE user_id = transfer_record.recipient_id AND share_id = transfer_record.share_id)
    WHERE id = p_transfer_id;
    
    -- Mark transfer as completed
    UPDATE share_transfer_requests 
    SET status = 'completed', 
        completed_at = now()
    WHERE id = p_transfer_id;
    
    -- Create notifications
    INSERT INTO transfer_notifications (transfer_id, user_id, notification_type, title, message)
    VALUES 
    (p_transfer_id, transfer_record.sender_id, 'completed', 'Transfer Completed', 'Your share transfer has been completed successfully'),
    (p_transfer_id, transfer_record.recipient_id, 'completed', 'Shares Received', 'You have received shares via transfer');
    
    RETURN jsonb_build_object('success', true, 'message', 'Transfer completed successfully');
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-approval function
CREATE OR REPLACE FUNCTION check_auto_approval(p_transfer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  transfer_record RECORD;
  approval_settings RECORD;
  daily_transfers INTEGER;
BEGIN
  -- Get transfer details
  SELECT t.*, p.status as sender_status 
  INTO transfer_record
  FROM share_transfer_requests t
  JOIN profiles p ON t.sender_id = p.id
  WHERE t.id = p_transfer_id;
  
  -- Get approval settings
  SELECT * INTO approval_settings
  FROM transfer_approval_settings
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF approval_settings IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check value threshold
  IF transfer_record.transfer_value >= approval_settings.auto_approve_under_value THEN
    RETURN false;
  END IF;
  
  -- Check if user is verified
  IF approval_settings.auto_approve_verified_users AND transfer_record.sender_status != 'active' THEN
    RETURN false;
  END IF;
  
  -- Check daily transfer limit
  SELECT COUNT(*) INTO daily_transfers
  FROM share_transfer_requests
  WHERE sender_id = transfer_record.sender_id
    AND created_at >= CURRENT_DATE
    AND status IN ('approved', 'completed');
    
  IF daily_transfers >= approval_settings.max_daily_transfers_per_user THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE share_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_approval_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_transfer_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own transfer requests" ON share_transfer_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create transfer requests" ON share_transfer_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can manage all transfers" ON share_transfer_requests
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view transfer notifications" ON transfer_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications" ON transfer_notifications
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage approval settings" ON transfer_approval_settings
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage fee settings" ON share_transfer_fee_settings
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view fee settings" ON share_transfer_fee_settings
  FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX idx_share_transfer_requests_sender ON share_transfer_requests(sender_id);
CREATE INDEX idx_share_transfer_requests_recipient ON share_transfer_requests(recipient_id);
CREATE INDEX idx_share_transfer_requests_status ON share_transfer_requests(status);
CREATE INDEX idx_share_transfer_requests_created ON share_transfer_requests(created_at);
CREATE INDEX idx_transfer_notifications_user ON transfer_notifications(user_id);
CREATE INDEX idx_transfer_notifications_read ON transfer_notifications(read_at);