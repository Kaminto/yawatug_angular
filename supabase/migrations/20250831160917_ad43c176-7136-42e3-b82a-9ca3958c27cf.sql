-- Temporarily disable triggers to avoid infinite recursion
SET session_replication_role = replica;

-- Simple data cleanup
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

-- Reset admin wallets to zero
UPDATE admin_sub_wallets SET balance = 0;

-- Re-enable triggers
SET session_replication_role = DEFAULT;