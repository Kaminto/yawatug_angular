-- Insert sample investment club members
INSERT INTO investment_club_members (member_name, email, phone, member_code) VALUES
('John Doe', 'john.doe@example.com', '+256701234567', 'CLUB-20240810-abc123'),
('Jane Smith', 'jane.smith@example.com', '+256702345678', 'CLUB-20240810-def456'),
('Robert Johnson', 'robert.johnson@example.com', '+256703456789', 'CLUB-20240810-ghi789'),
('Mary Williams', 'mary.williams@example.com', '+256704567890', 'CLUB-20240810-jkl012'),
('David Brown', 'david.brown@example.com', '+256705678901', 'CLUB-20240810-mno345');

-- Insert sample club share allocations with different statuses
INSERT INTO club_share_allocations (
  club_member_id, 
  allocated_shares, 
  transfer_fee_paid, 
  debt_amount_settled, 
  import_batch_reference, 
  allocation_status,
  consent_deadline
)
SELECT 
  icm.id,
  CASE 
    WHEN icm.member_name = 'John Doe' THEN 1000
    WHEN icm.member_name = 'Jane Smith' THEN 750
    WHEN icm.member_name = 'Robert Johnson' THEN 1200
    WHEN icm.member_name = 'Mary Williams' THEN 500
    WHEN icm.member_name = 'David Brown' THEN 800
  END as allocated_shares,
  CASE 
    WHEN icm.member_name = 'John Doe' THEN 50000
    WHEN icm.member_name = 'Jane Smith' THEN 37500
    WHEN icm.member_name = 'Robert Johnson' THEN 60000
    WHEN icm.member_name = 'Mary Williams' THEN 25000
    WHEN icm.member_name = 'David Brown' THEN 40000
  END as transfer_fee_paid,
  CASE 
    WHEN icm.member_name = 'John Doe' THEN 500000
    WHEN icm.member_name = 'Jane Smith' THEN 375000
    WHEN icm.member_name = 'Robert Johnson' THEN 600000
    WHEN icm.member_name = 'Mary Williams' THEN 250000
    WHEN icm.member_name = 'David Brown' THEN 400000
  END as debt_amount_settled,
  'CLUB-20240810-SAMPLE-BATCH',
  CASE 
    WHEN icm.member_name = 'John Doe' THEN 'accepted'
    WHEN icm.member_name = 'Jane Smith' THEN 'pending'
    WHEN icm.member_name = 'Robert Johnson' THEN 'accepted'
    WHEN icm.member_name = 'Mary Williams' THEN 'rejected'
    WHEN icm.member_name = 'David Brown' THEN 'pending'
  END as allocation_status,
  CURRENT_DATE + INTERVAL '60 days'
FROM investment_club_members icm;

-- Update rejected allocation with reason
UPDATE club_share_allocations 
SET rejection_reason = 'Member declined debt-to-share conversion after review'
WHERE allocation_status = 'rejected';

-- Create holding accounts for accepted allocations
INSERT INTO club_share_holding_account (
  club_member_id, 
  club_allocation_id, 
  shares_quantity, 
  status
)
SELECT 
  csa.club_member_id,
  csa.id,
  csa.allocated_shares,
  'holding'
FROM club_share_allocations csa
WHERE csa.allocation_status = 'accepted';

-- Create some release log entries to show release history
INSERT INTO club_share_release_log (
  club_holding_account_id,
  shares_released,
  release_type,
  released_by_admin,
  release_notes
)
SELECT 
  csha.id,
  100, -- Released 100 shares as sample
  'partial_release',
  NULL, -- We'll update this if we have admin users
  'Initial partial release based on sales criteria'
FROM club_share_holding_account csha
WHERE csha.status = 'holding'
LIMIT 2;