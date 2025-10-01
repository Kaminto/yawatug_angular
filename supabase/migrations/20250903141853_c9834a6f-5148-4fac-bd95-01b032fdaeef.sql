-- Create the missing triggers for referral commissions
CREATE OR REPLACE TRIGGER trigger_referral_commission_on_transaction
    AFTER INSERT ON transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type = 'share_purchase' AND NEW.status = 'completed')
    EXECUTE FUNCTION calculate_enhanced_referral_commission();

CREATE OR REPLACE TRIGGER trigger_referral_commission_on_booking
    AFTER INSERT ON share_bookings
    FOR EACH ROW
    EXECUTE FUNCTION calculate_expected_referral_earnings();

CREATE OR REPLACE TRIGGER trigger_referral_commission_on_booking_payment
    AFTER INSERT ON share_booking_payments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION calculate_enhanced_referral_commission();