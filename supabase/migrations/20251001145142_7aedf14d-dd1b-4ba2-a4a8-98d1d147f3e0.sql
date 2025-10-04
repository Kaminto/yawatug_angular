-- Add foreign key relationship between share_sell_orders and shares
ALTER TABLE share_sell_orders 
ADD CONSTRAINT fk_share_sell_orders_share_id 
FOREIGN KEY (share_id) 
REFERENCES shares(id) 
ON DELETE CASCADE;