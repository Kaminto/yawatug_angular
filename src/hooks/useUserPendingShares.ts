import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserPendingShares = (userId: string) => {
  const [pendingShares, setPendingShares] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadPendingShares();
    }
  }, [userId]);

  const loadPendingShares = async () => {
    try {
      setLoading(true);
      
      const [bookingResult, transactionResult] = await Promise.all([
        // Get progressive ownership data from bookings
        supabase
          .from('share_bookings')
          .select('quantity, shares_owned_progressively, status')
          .eq('user_id', userId)
          .in('status', ['pending', 'active', 'partially_paid']),
        
        // Get pending transactions
        supabase
          .from('share_transactions')
          .select('quantity')
          .eq('user_id', userId)
          .eq('transaction_type', 'buy')
          .in('status', ['pending', 'processing'])
      ]);

      // Calculate actual pending shares from bookings
      const bookingPendingShares = bookingResult.data?.reduce((sum, booking) => {
        const ownedShares = booking.shares_owned_progressively || 0;
        const totalShares = booking.quantity || 0;
        const pendingShares = Math.max(0, totalShares - ownedShares);
        return sum + pendingShares;
      }, 0) || 0;

      // Add pending transaction shares
      const transactionPendingShares = transactionResult.data?.reduce((sum, transaction) => 
        sum + (transaction.quantity || 0), 0
      ) || 0;

      const totalPending = bookingPendingShares + transactionPendingShares;
      setPendingShares(totalPending);

      console.log('User pending shares calculated:', {
        userId,
        bookingPendingShares,
        transactionPendingShares,
        totalPending,
        bookingDetails: bookingResult.data
      });

    } catch (error) {
      console.error('Error loading pending shares:', error);
      setPendingShares(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshPendingShares = () => {
    loadPendingShares();
  };

  return {
    pendingShares,
    loading,
    refreshPendingShares
  };
};