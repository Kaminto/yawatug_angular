import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useWalletTransactions = () => {
  const [loading, setLoading] = useState(false);

  const processDeposit = async (
    walletId: string,
    netAmount: number,
    feeAmount: number,
    currency: string,
    reference?: string
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const grossAmount = netAmount + feeAmount;

      // Call the new database function that handles fee separation
      const { data, error } = await supabase.rpc('process_deposit_with_fee_separation', {
        p_user_id: user.id,
        p_wallet_id: walletId,
        p_gross_amount: grossAmount,
        p_fee_amount: feeAmount,
        p_currency: currency,
        p_description: 'Deposit',
        p_reference: reference
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error('Error processing deposit:', error);
      toast.error(`Deposit failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawal = async (
    walletId: string,
    netWithdrawalAmount: number,
    feeAmount: number,
    currency: string,
    recipientPhone: string,
    recipientName: string,
    withdrawalMethod: string = 'mobile_money',
    reference?: string
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call the new database function that handles fee split
      const { data, error } = await supabase.rpc('process_withdrawal_with_fee_split', {
        p_user_id: user.id,
        p_wallet_id: walletId,
        p_withdrawal_amount: netWithdrawalAmount,
        p_fee_amount: feeAmount,
        p_currency: currency,
        p_description: 'Withdrawal',
        p_reference: reference,
        p_recipient_phone: recipientPhone,
        p_recipient_name: recipientName,
        p_withdrawal_method: withdrawalMethod
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Withdrawal failed');
      }

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      toast.error(`Withdrawal failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    processDeposit,
    processWithdrawal
  };
};
