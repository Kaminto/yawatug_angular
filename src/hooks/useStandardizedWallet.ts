import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StandardizedWallet {
  id: string;
  currency: string;
  balance: number;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface WalletBalances {
  UGX: number;
  USD: number;
}

export const useStandardizedWallet = (userId: string | null) => {
  const [wallets, setWallets] = useState<StandardizedWallet[]>([]);
  const [balances, setBalances] = useState<WalletBalances>({ UGX: 0, USD: 0 });
  const [loading, setLoading] = useState(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const lastSyncRef = useRef<number>(0);
  const hasLoadedRef = useRef<boolean>(false);

  // Ensure user has both UGX and USD wallets
  const ensureStandardWallets = async (userId: string) => {
    try {
      const currencies = ['UGX', 'USD'];
      
      for (const currency of currencies) {
        // Check if wallet exists
        const { data: existingWallet } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', userId)
          .eq('currency', currency)
          .single();

        if (!existingWallet) {
          // Create missing wallet
          const { error: createError } = await supabase
            .from('wallets')
            .insert({
              user_id: userId,
              currency,
              balance: 0,
              status: 'active'
            });

          if (createError) {
            console.error(`Failed to create ${currency} wallet:`, createError);
            toast.error(`Failed to create ${currency} wallet`);
          } else {
            console.log(`Created ${currency} wallet for user ${userId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error ensuring standard wallets:', error);
    }
  };

  // Removed server-side balance sync to prevent UPDATE loops

  // Sync all wallets and balances with debounce
  const syncWalletsAndBalances = async (forceSync = false) => {
    if (!userId) return;

    // Debounce: prevent syncing more than once per second
    const now = Date.now();
    if (!forceSync && now - lastSyncRef.current < 1000) {
      console.log('⏸️ Sync debounced (too soon)');
      return;
    }
    lastSyncRef.current = now;

    try {
      if (!hasLoadedRef.current || forceSync) setLoading(true);
      console.log('🔄 Syncing wallets and balances for user:', userId);

      // Ensure standard wallets exist
      await ensureStandardWallets(userId);

      // Get all user wallets
      const { data: userWallets, error: walletsError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .order('currency');

      if (walletsError) throw walletsError;

      // Calculate and sync balances for each wallet
      const updatedWallets: StandardizedWallet[] = [];
      const updatedBalances: WalletBalances = { UGX: 0, USD: 0 };

      for (const wallet of userWallets || []) {
        // Recalculate balance from completed transactions for accuracy
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount, status, approval_status')
          .eq('wallet_id', wallet.id)
          .or('status.in.(completed,success),approval_status.in.(approved,completed)');

        // Calculate actual balance from transactions
        const calculatedBalance = transactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
        
        // Use calculated balance for display
        const syncedBalance = calculatedBalance;
        
        console.log(`📥 ${wallet.currency} wallet balance synced:`, {
          walletId: wallet.id,
          storedBalance: wallet.balance,
          calculatedBalance: syncedBalance
        });
        
        const standardizedWallet: StandardizedWallet = {
          ...wallet,
          balance: syncedBalance
        };

        updatedWallets.push(standardizedWallet);
        
        if (wallet.currency === 'UGX' || wallet.currency === 'USD') {
          updatedBalances[wallet.currency as keyof WalletBalances] = syncedBalance;
        }
      }

      console.log('📊 Final balances:', updatedBalances);
      // Avoid unnecessary state updates to prevent re-renders/flicker
      const nextWalletMini = updatedWallets.map(w => ({ id: w.id, balance: w.balance, currency: w.currency }));
      const prevWalletMini = wallets.map(w => ({ id: w.id, balance: w.balance, currency: w.currency }));
      const walletsChanged = JSON.stringify(nextWalletMini) !== JSON.stringify(prevWalletMini);
      const balancesChanged = (updatedBalances.UGX !== balances.UGX) || (updatedBalances.USD !== balances.USD);

      if (walletsChanged) setWallets(updatedWallets);
      if (balancesChanged) setBalances(updatedBalances);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('Error syncing wallets and balances:', error);
      toast.error('Failed to sync wallet data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription for wallet updates with debounce
  useEffect(() => {
    if (!userId) return;

    const debouncedSync = () => {
      // Clear existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      // Set new timeout to sync after 500ms of no updates
      syncTimeoutRef.current = setTimeout(() => {
        syncWalletsAndBalances();
      }, 500);
    };

    const walletChannel = supabase
      .channel(`user-wallet-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Only react to real balance changes to prevent loops
          const oldBal = (payload as any)?.old?.balance;
          const newBal = (payload as any)?.new?.balance;
          if (typeof oldBal === 'number' && typeof newBal === 'number' && oldBal === newBal) {
            return;
          }
          debouncedSync();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Transaction created');
          debouncedSync();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Refresh when transaction status changes to completed/approved
          const newStatus = (payload as any)?.new?.status;
          const newApprovalStatus = (payload as any)?.new?.approval_status;
          if (newStatus === 'completed' || newApprovalStatus === 'approved' || newStatus === 'success') {
            console.log('Transaction completed/approved - refreshing balance');
            debouncedSync();
          }
        }
      )
      .subscribe();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      supabase.removeChannel(walletChannel);
    };
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (userId) {
      syncWalletsAndBalances(true); // Force initial sync
    }
  }, [userId]);

  return {
    wallets,
    balances,
    loading,
    refreshWallets: () => syncWalletsAndBalances(true),
    getBalance: (currency: 'UGX' | 'USD') => balances[currency] || 0
  };
};