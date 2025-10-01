-- Delete existing partial data if any
DELETE FROM club_share_allocations;
DELETE FROM investment_club_members;

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
) VALUES
((SELECT id FROM investment_club_members WHERE member_name = 'John Doe'), 1000, 50000, 500000, 'CLUB-20240810-SAMPLE-BATCH', 'accepted', CURRENT_DATE + INTERVAL '60 days'),
((SELECT id FROM investment_club_members WHERE member_name = 'Jane Smith'), 750, 37500, 375000, 'CLUB-20240810-SAMPLE-BATCH', 'pending', CURRENT_DATE + INTERVAL '60 days'),
((SELECT id FROM investment_club_members WHERE member_name = 'Robert Johnson'), 1200, 60000, 600000, 'CLUB-20240810-SAMPLE-BATCH', 'accepted', CURRENT_DATE + INTERVAL '60 days'),
((SELECT id FROM investment_club_members WHERE member_name = 'Mary Williams'), 500, 25000, 250000, 'CLUB-20240810-SAMPLE-BATCH', 'rejected', CURRENT_DATE + INTERVAL '60 days'),
((SELECT id FROM investment_club_members WHERE member_name = 'David Brown'), 800, 40000, 400000, 'CLUB-20240810-SAMPLE-BATCH', 'pending', CURRENT_DATE + INTERVAL '60 days');

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
  club_allocation_id,
  club_holding_account_id,
  shares_released,
  release_percentage,
  release_trigger,
  release_reason
)
SELECT 
  csha.club_allocation_id,
  csha.id,
  100,
  ROUND((100.0 / csha.shares_quantity) * 100, 2),
  'sales_ratio',
  'Initial partial release based on sales criteria - 100 shares of ' || csha.shares_quantity
FROM club_share_holding_account csha
WHERE csha.status = 'holding'
LIMIT 2;