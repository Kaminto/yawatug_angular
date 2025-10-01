import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserSharesBalance {
  directShares: number;
  progressiveShares: number;
  totalShares: number;
  holdings: any[];
  loading: boolean;
  refreshBalance: () => Promise<void>;
}

export const useUserSharesBalance = (userId: string): UserSharesBalance => {
  const [directShares, setDirectShares] = useState(0);
  const [progressiveShares, setProgressiveShares] = useState(0);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCalculated, setTotalCalculated] = useState(0);

  const loadUserSharesBalance = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);

      // Local totals used to compute final total precisely
      let newDirect = 0;
      let newProgressive = 0;

      // Load balance from materialized view for accurate total counts
      const { data: balanceDataList, error: balanceError } = await supabase
        .from('user_share_balances_calculated')
        .select('*')
        .eq('user_id', userId);

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Error loading user share balance:', balanceError);
      }

      // Calculate total from materialized view if available
      const materializedTotal = balanceDataList?.reduce((sum, b) => sum + (b.calculated_balance || 0), 0) || 0;

      // Load direct shares from user_shares table for detailed holdings
      const { data: userSharesData, error: userSharesError } = await supabase
        .from('user_shares')
        .select(`
          *,
          shares:share_id (
            id,
            name,
            price_per_share,
            currency
          )
        `)
        .eq('user_id', userId);

      if (userSharesError) {
        console.error('Error loading user shares:', userSharesError);
        setDirectShares(0);
        setHoldings([]);
      } else {
        // Calculate from user_shares - this represents direct fully owned shares
        newDirect = userSharesData?.reduce((sum, share) => sum + (share.quantity || 0), 0) || 0;
        setDirectShares(newDirect);
        setHoldings(userSharesData || []);
      }

      // Load progressive shares from bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('share_bookings')
        .select('shares_owned_progressively')
        .eq('user_id', userId)
        .in('status', ['active', 'partially_paid', 'completed']);

      if (bookingsError) {
        console.error('Error loading progressive shares:', bookingsError);
        setProgressiveShares(0);
      } else {
        // Calculate progressive shares from bookings
        newProgressive = bookingsData?.reduce((sum, booking) => sum + (booking.shares_owned_progressively || 0), 0) || 0;
        setProgressiveShares(newProgressive);
      }

      // Compute net holdings from completed share transactions as an additional source of truth
      let netFromTransactions = 0;
      const { data: txData, error: txError } = await supabase
        .from('share_transactions')
        .select('transaction_type, quantity, status')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (!txError && txData) {
        netFromTransactions = txData.reduce((sum, t: any) => {
          const tt = t.transaction_type;
          const qty = t.quantity || 0;
          if (['purchase','buy','share_purchase','company_issue','reserve_issue','transfer_in'].includes(tt)) return sum + qty;
          if (['sale','sell','share_sale','transfer_out'].includes(tt)) return sum - qty;
          return sum;
        }, 0);
      }

      const candidates = [materializedTotal, netFromTransactions, newDirect + newProgressive].filter((n) => Number.isFinite(n));
      const finalTotal = Math.max(...candidates, 0);

      setTotalCalculated(finalTotal);

      console.log('User shares balance loaded:', {
        userId,
        directShares: newDirect,
        progressiveShares: newProgressive,
        totalShares: finalTotal,
        materializedViewTotal: materializedTotal,
        source: balanceDataList && balanceDataList.length > 0 ? 'with_materialized_view' : (netFromTransactions > 0 ? 'share_transactions' : 'calculated_only')
      });

    } catch (error) {
      console.error('Error loading user shares balance:', error);
      setDirectShares(0);
      setProgressiveShares(0);
      setHoldings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserSharesBalance();
    
    // Set up real-time subscription for user_shares changes
    const channel = supabase
      .channel('user-shares-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_shares',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('User shares changed, refreshing balance...');
          loadUserSharesBalance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'share_transfer_requests',
          filter: `sender_id=eq.${userId}`
        },
        () => {
          console.log('Transfer request changed, refreshing balance...');
          loadUserSharesBalance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'share_transfer_requests',
          filter: `recipient_id=eq.${userId}`
        },
        () => {
          console.log('Transfer request changed, refreshing balance...');
          loadUserSharesBalance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'share_transactions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('Share transactions changed, refreshing balance...');
          loadUserSharesBalance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'share_stock_movements',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('Stock movements changed, refreshing balance...');
          loadUserSharesBalance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'share_buyback_orders',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('Buyback orders changed, refreshing balance...');
          loadUserSharesBalance();
        }
      )
      .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
  }, [userId]);

  const refreshBalance = async () => {
    await loadUserSharesBalance();
  };

  return {
    directShares,
    progressiveShares,
    totalShares: totalCalculated || (directShares + progressiveShares),
    holdings,
    loading,
    refreshBalance
  };
};