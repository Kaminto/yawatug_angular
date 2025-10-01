-- Update the available shares calculation to properly account for pending bookings
UPDATE shares 
SET available_shares = total_shares - (
  SELECT COALESCE(SUM(quantity), 0) 
  FROM user_share_holdings 
  WHERE share_id = shares.id
) - (
  SELECT COALESCE(SUM(quantity), 0) 
  FROM share_bookings 
  WHERE share_id = shares.id AND status = 'pending'
) - COALESCE((reserved_shares - reserved_issued), 0)
WHERE name = 'Yawatu Ordinary Shares';

-- Verify the final state
SELECT 
  'Final consolidated share system:' as status,
  id,
  name,
  price_per_share,
  total_shares,
  available_shares,
  (SELECT COUNT(*) FROM user_share_holdings WHERE share_id = shares.id) as total_holdings,
  (SELECT COUNT(*) FROM share_bookings WHERE share_id = shares.id) as total_bookings,
  (SELECT COUNT(*) FROM share_bookings WHERE share_id = shares.id AND status = 'pending') as pending_bookings
FROM shares WHERE name = 'Yawatu Ordinary Shares';