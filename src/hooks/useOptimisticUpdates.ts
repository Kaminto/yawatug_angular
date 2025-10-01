
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OptimisticUpdate {
  id: string;
  type: 'purchase' | 'sale' | 'transfer';
  data: any;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export const useOptimisticUpdates = () => {
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([]);

  const addOptimisticUpdate = useCallback((type: OptimisticUpdate['type'], data: any) => {
    const update: OptimisticUpdate = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
      status: 'pending'
    };

    setPendingUpdates(prev => [...prev, update]);
    return update.id;
  }, []);

  const confirmUpdate = useCallback((id: string) => {
    setPendingUpdates(prev => 
      prev.map(update => 
        update.id === id 
          ? { ...update, status: 'confirmed' as const }
          : update
      )
    );

    // Remove confirmed updates after a delay
    setTimeout(() => {
      setPendingUpdates(prev => prev.filter(update => update.id !== id));
    }, 2000);
  }, []);

  const failUpdate = useCallback((id: string, error?: string) => {
    setPendingUpdates(prev => 
      prev.map(update => 
        update.id === id 
          ? { ...update, status: 'failed' as const }
          : update
      )
    );

    if (error) {
      toast.error(`Operation failed: ${error}`);
    }

    // Remove failed updates after a delay
    setTimeout(() => {
      setPendingUpdates(prev => prev.filter(update => update.id !== id));
    }, 5000);
  }, []);

  const optimisticSharePurchase = useCallback(async (
    shareId: string,
    quantity: number,
    pricePerShare: number,
    userId: string
  ) => {
    const updateId = addOptimisticUpdate('purchase', {
      shareId,
      quantity,
      pricePerShare,
      userId
    });

    try {
      // Perform the actual purchase
      const { error } = await supabase
        .from('share_transactions')
        .insert({
          user_id: userId,
          share_id: shareId,
          quantity,
          price_per_share: pricePerShare,
          transaction_type: 'purchase',
          currency: 'UGX',
          total_amount: quantity * pricePerShare,
          status: 'completed'
        });

      if (error) throw error;

      confirmUpdate(updateId);
      toast.success('Share purchase completed successfully');
    } catch (error: any) {
      failUpdate(updateId, error.message);
      throw error;
    }
  }, [addOptimisticUpdate, confirmUpdate, failUpdate]);

  const optimisticWalletUpdate = useCallback(async (
    walletId: string,
    amount: number,
    operation: 'add' | 'subtract'
  ) => {
    const updateId = addOptimisticUpdate('purchase', {
      walletId,
      amount,
      operation
    });

    try {
      const { data: wallet, error: fetchError } = await supabase
        .from('wallets')
        .select('balance, currency, user_id')
        .eq('id', walletId)
        .single();

      if (fetchError) throw fetchError;

      const signedAmount = operation === 'add' ? Math.abs(amount) : -Math.abs(amount);

      // Record a proper transaction instead of direct balance update
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: wallet.user_id,
          wallet_id: walletId,
          amount: signedAmount,
          currency: wallet.currency,
          transaction_type: operation === 'add' ? 'deposit' : 'withdraw',
          status: 'completed',
          approval_status: 'approved',
          description: 'Optimistic wallet adjustment'
        });

      if (txError) throw txError;

      // Sync balance via RPC (respects triggers)
      const { error: syncError } = await supabase.rpc('sync_wallet_balance', {
        p_wallet_id: walletId
      });
      if (syncError) throw syncError;

      confirmUpdate(updateId);
    } catch (error: any) {
      failUpdate(updateId, error.message);
      throw error;
    }
  }, [addOptimisticUpdate, confirmUpdate, failUpdate]);

  return {
    pendingUpdates,
    optimisticSharePurchase,
    optimisticWalletUpdate,
    addOptimisticUpdate,
    confirmUpdate,
    failUpdate
  };
};
