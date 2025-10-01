
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useWalletOperations = () => {
  const [loading, setLoading] = useState(false);

  const createTransaction = async (transactionData: {
    user_id: string;
    amount: number;
    currency: string;
    transaction_type: 'deposit' | 'withdraw' | 'transfer' | 'exchange';
    wallet_id: string;
    reference?: string;
    description?: string;
    recipientId?: string;
    recipientEmail?: string;
    recipientPhone?: string;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-wallet-transaction', {
        body: {
          transactionType: transactionData.transaction_type,
          amount: transactionData.amount,
          currency: transactionData.currency,
          description: transactionData.description || `${transactionData.transaction_type} transaction`,
          recipientId: transactionData.recipientId,
          recipientEmail: transactionData.recipientEmail,
          recipientPhone: transactionData.recipientPhone
        }
      });

      if (error) throw error;
      
      toast.success('Transaction created successfully');
      return data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateWalletBalance = async (walletId: string, newBalance: number) => {
    try {
      console.warn('Direct wallet balance updates are blocked. Syncing from transactions instead. Requested newBalance:', newBalance);
      const { data, error } = await supabase.rpc('sync_wallet_balance', {
        p_wallet_id: walletId
      });
      if (error) throw error;
      return Number(data) || 0;
    } catch (error) {
      console.error('Error syncing wallet balance:', error);
      throw error;
    }
  };

  const getUserWallets = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching wallets:', error);
      throw error;
    }
  };

  const getTransactionHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  };

  return {
    loading,
    createTransaction,
    updateWalletBalance,
    getUserWallets,
    getTransactionHistory
  };
};
