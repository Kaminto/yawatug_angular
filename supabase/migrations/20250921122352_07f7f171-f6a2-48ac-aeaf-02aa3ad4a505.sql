-- Remove legacy fee collection trigger and function to stop writing to transaction_fee_collections
-- and rely solely on transactions.fee_amount/fee_percentage/flat_fee

-- 1) Drop trigger on share_booking_payments (if exists)
DROP TRIGGER IF EXISTS allocate_fee_on_booking_payment ON public.share_booking_payments;

-- 2) Drop the trigger function (if exists)
DROP FUNCTION IF EXISTS public.allocate_transaction_fee_enhanced();

-- Note: Fees for booking payments are already handled via
-- allocate_transaction_fee_with_snapshot() called inside process_booking_payment()
-- which updates the transactions table and allocates to admin fund.