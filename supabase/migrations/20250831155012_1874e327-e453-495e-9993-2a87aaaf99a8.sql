-- Complete database cleanup - handles foreign key constraints properly
SET session_replication_role = replica; -- Temporarily disable triggers and constraints

-- Reset admin sub wallets to zero balances (don't delete the wallets themselves)
UPDATE admin_sub_wallets SET balance = 0, updated_at = now();

-- Clear shares table 
DELETE FROM shares;

-- Clear any remaining data from other key tables
DELETE FROM profiles;
DELETE FROM transactions;
DELETE FROM wallets;
DELETE FROM user_share_holdings;
DELETE FROM share_bookings;
DELETE FROM share_transactions;
DELETE FROM admin_wallet_fund_transfers;
DELETE FROM transaction_fee_collections;
DELETE FROM otp_codes;
DELETE FROM user_documents;
DELETE FROM contact_persons;
DELETE FROM user_verification_requests;

-- Reset sequences if any
SELECT setval('shares_id_seq', 1, false) WHERE EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'shares_id_seq');

SET session_replication_role = DEFAULT; -- Re-enable triggers and constraints