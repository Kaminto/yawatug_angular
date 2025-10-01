
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useWalletBalanceSync = (userId: string | null) => {
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const calculateBalanceFromTransactions = async (walletId: string) => {
    try {
      // Use standardized database function for balance calculation
      const { data, error } = await supabase.rpc('calculate_simple_wallet_balance', {
        p_wallet_id: walletId
      });

      if (error) throw error;

      console.log(`Calculated balance for wallet ${walletId}: ${data}`);
      return Number(data) || 0;
    } catch (error) {
      console.error('Error calculating balance from transactions:', error);
      return 0;
    }
  };

  const syncWalletBalance = async (walletId: string) => {
    try {
      // Use standardized database function for syncing
      const { data, error } = await supabase.rpc('sync_wallet_balance', {
        p_wallet_id: walletId
      });

      if (error) throw error;

      console.log(`Synced wallet ${walletId} balance: ${data}`);
      return Number(data) || 0;
    } catch (error) {
      console.error('Error syncing wallet balance:', error);
      throw error;
    }
  };

  const loadAndSyncBalances = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Get all user wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id, currency, balance')
        .eq('user_id', userId);

      if (walletsError) throw walletsError;

      const syncedBalances: Record<string, number> = {};

      // Sync each wallet balance
      for (const wallet of wallets || []) {
        const syncedBalance = await syncWalletBalance(wallet.id);
        syncedBalances[wallet.currency] = syncedBalance;
      }

      setBalances(syncedBalances);
    } catch (error) {
      console.error('Error loading and syncing balances:', error);
      toast.error('Failed to sync wallet balances');
    } finally {
      setLoading(false);
    }
  };

  const updateBalanceAfterTransaction = async (walletId: string, currency: string) => {
    try {
      const newBalance = await syncWalletBalance(walletId);
      setBalances(prev => ({ ...prev, [currency]: newBalance }));
      return newBalance;
    } catch (error) {
      console.error('Error updating balance after transaction:', error);
      throw error;
    }
  };

  // Set up real-time subscriptions for wallet and transaction updates
  useEffect(() => {
    if (!userId) return;

    // Subscribe to wallet changes
    const walletChannel = supabase
      .channel('wallet-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Wallet update received:', payload);
          // Only sync if the balance actually changed, not just timestamp updates
          if (payload.old && payload.new && 
              typeof payload.old === 'object' && typeof payload.new === 'object' &&
              'balance' in payload.old && 'balance' in payload.new &&
              payload.old.balance !== payload.new.balance) {
            loadAndSyncBalances();
          }
        }
      )
      .subscribe();

    // Subscribe to transaction changes
    const transactionChannel = supabase
      .channel('transaction-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Transaction update received:', payload);
          // Only sync on transaction status changes that affect balance
          if (payload.new && typeof payload.new === 'object' &&
              (('status' in payload.new && ['completed', 'approved'].includes(payload.new.status as string)) || 
               ('approval_status' in payload.new && ['completed', 'approved'].includes(payload.new.approval_status as string)))) {
            loadAndSyncBalances();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [userId]);

  useEffect(() => {
    loadAndSyncBalances();
  }, [userId]);

  return {
    balances,
    loading,
    syncWalletBalance,
    updateBalanceAfterTransaction,
    refreshBalances: loadAndSyncBalances
  };
};
