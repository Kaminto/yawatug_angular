-- Simple database cleanup handling foreign key dependencies
DELETE FROM user_shares;
DELETE FROM share_buyback_orders;
DELETE FROM transactions;
DELETE FROM wallets;
DELETE FROM user_documents;
DELETE FROM contact_persons;
DELETE FROM agent_applications;
DELETE FROM agents;
DELETE FROM profiles;
DELETE FROM shares;

-- Reset admin sub-wallets to zero balance
UPDATE admin_sub_wallets SET balance = 0;