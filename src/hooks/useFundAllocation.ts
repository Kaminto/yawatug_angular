
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useFundAllocation = () => {
  const [loading, setLoading] = useState(false);

  const allocateSharePurchaseFunds = async (
    amount: number, 
    currency: string = 'UGX',
    userId: string,
    description: string = 'Share purchase fund allocation'
  ) => {
    setLoading(true);
    try {
      // Update user wallet balance using SQL function or direct update
      const { error: walletError } = await supabase.rpc('update_recipient_wallet_balance', {
        p_user_id: userId,
        p_currency: currency,
        p_amount: amount
      });

      if (walletError) throw walletError;

      // Allocate transaction fee to admin fund
      const { error: feeError } = await supabase.rpc('allocate_transaction_fee', {
        fee_amount: amount * 0.025, // 2.5% fee
        fee_currency: currency
      });

      if (feeError) throw feeError;

      return { success: true };
    } catch (error) {
      console.error('Error allocating share purchase funds:', error);
      toast.error('Failed to allocate funds');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const allocateReferralBonus = async (
    referrerId: string,
    amount: number,
    currency: string = 'UGX',
    description: string = 'Referral bonus allocation'
  ) => {
    setLoading(true);
    try {
      // Update referrer wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance: amount, // Direct update since supabase.raw doesn't exist
          updated_at: new Date().toISOString()
        })
        .eq('user_id', referrerId)
        .eq('currency', currency);

      if (walletError) throw walletError;

      return { success: true };
    } catch (error) {
      console.error('Error allocating referral bonus:', error);
      toast.error('Failed to allocate referral bonus');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const allocateAgentCommission = async (
    agentId: string,
    amount: number,
    currency: string = 'UGX',
    description: string = 'Agent commission allocation'
  ) => {
    setLoading(true);
    try {
      // Update agent wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance: amount, // Direct update since supabase.raw doesn't exist
          updated_at: new Date().toISOString()
        })
        .eq('user_id', agentId)
        .eq('currency', currency);

      if (walletError) throw walletError;

      return { success: true };
    } catch (error) {
      console.error('Error allocating agent commission:', error);
      toast.error('Failed to allocate agent commission');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const processTransactionFees = async (
    amount: number,
    currency: string = 'UGX',
    transactionType: string = 'general'
  ) => {
    setLoading(true);
    try {
      // For share purchases, the fee allocation is handled by allocate_share_purchase_proceeds_enhanced
      // This function is now mainly for other transaction types
      
      // Calculate fee based on transaction type
      let feePercentage = 0.025; // Default 2.5%
      if (transactionType === 'exchange') feePercentage = 0.01; // 1% for exchanges
      if (transactionType === 'share_purchase') feePercentage = 0; // Share purchases handled separately

      const feeAmount = amount * feePercentage;

      if (feeAmount > 0) {
        // Allocate fee to admin fund using the enhanced function
        const { error } = await supabase.rpc('allocate_transaction_fee', {
          fee_amount: feeAmount,
          fee_currency: currency
        });

        if (error) throw error;
      }

      return { success: true, feeAmount };
    } catch (error) {
      console.error('Error processing transaction fees:', error);
      toast.error('Failed to process transaction fees');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const allocateSharePurchaseProceeds = async (
    amount: number,
    currency: string = 'UGX',
    transactionId: string,
    userId: string
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('allocate_share_purchase_proceeds_enhanced', {
        p_amount: amount,
        p_currency: currency,
        p_transaction_id: transactionId,
        p_user_id: userId
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error allocating share purchase proceeds:', error);
      toast.error('Failed to allocate share purchase proceeds');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    allocateSharePurchaseFunds,
    allocateReferralBonus,
    allocateAgentCommission,
    processTransactionFees,
    allocateSharePurchaseProceeds
  };
};
