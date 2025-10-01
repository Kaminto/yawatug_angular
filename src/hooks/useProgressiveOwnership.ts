import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProgressiveOwnershipResult {
  success: boolean;
  sharesUnlocked: number;
  totalSharesOwned: number;
  paymentPercentage: number;
  remainingBalance: number;
  bookingCompleted: boolean;
  newStatus: string;
  error?: string;
}

export const useProgressiveOwnership = () => {
  const [loading, setLoading] = useState(false);

  const processBookingPayment = async (
    bookingId: string,
    paymentAmount: number,
    userId: string,
    transactionId?: string
  ): Promise<ProgressiveOwnershipResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('process_booking_payment', {
        p_booking_id: bookingId,
        p_payment_amount: paymentAmount,
        p_user_id: userId,
        p_transaction_id: transactionId || null
      });

      if (error) {
        console.error('Error processing booking payment:', error);
        throw error;
      }

      const result = data as any;

      if (!result.success) {
        throw new Error(result.error || 'Failed to process payment');
      }

      const ownershipResult: ProgressiveOwnershipResult = {
        success: true,
        sharesUnlocked: result.shares_unlocked,
        totalSharesOwned: result.total_shares_owned,
        paymentPercentage: result.payment_percentage,
        remainingBalance: result.remaining_balance,
        bookingCompleted: result.booking_completed,
        newStatus: result.new_status
      };

      // Show success message with shares unlocked info
      if (ownershipResult.sharesUnlocked > 0) {
        toast.success(
          `Payment processed! ${ownershipResult.sharesUnlocked} shares unlocked. You now own ${ownershipResult.totalSharesOwned} shares from this booking.`
        );
      } else {
        toast.success(
          `Payment processed! ${ownershipResult.paymentPercentage.toFixed(1)}% paid. Remaining balance: UGX ${ownershipResult.remainingBalance.toLocaleString()}`
        );
      }

      if (ownershipResult.bookingCompleted) {
        toast.success('🎉 Booking completed! All shares are now fully owned.');
      }

      return ownershipResult;
    } catch (error: any) {
      console.error('Error in processBookingPayment:', error);
      toast.error(error.message || 'Failed to process booking payment');
      return {
        success: false,
        sharesUnlocked: 0,
        totalSharesOwned: 0,
        paymentPercentage: 0,
        remainingBalance: 0,
        bookingCompleted: false,
        newStatus: 'error',
        error: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  const calculateProgressiveOwnership = async (
    bookingId: string,
    paymentAmount: number
  ) => {
    try {
      const { data, error } = await supabase.rpc('calculate_progressive_ownership', {
        p_booking_id: bookingId,
        p_payment_amount: paymentAmount
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calculating progressive ownership:', error);
      return null;
    }
  };

  return {
    loading,
    processBookingPayment,
    calculateProgressiveOwnership
  };
};