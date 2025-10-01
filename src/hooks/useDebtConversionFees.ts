import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConversionFeePayment {
  id: string;
  club_member_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversionEligibility {
  eligible: boolean;
  fee_paid: boolean;
  net_balance: number;
  current_share_price: number;
  balance_sufficient: boolean;
  error?: string;
}

export const useDebtConversionFees = () => {
  const [loading, setLoading] = useState(false);
  const [feeSettings, setFeeSettings] = useState<any>(null);

  useEffect(() => {
    loadFeeSettings();
  }, []);

  const loadFeeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('debt_conversion_fee_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setFeeSettings(data);
    } catch (error) {
      console.error('Error loading fee settings:', error);
    }
  };

  const calculateConversionFee = async (debtAmount: number): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('calculate_debt_conversion_fee', {
        p_debt_amount: debtAmount
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error calculating conversion fee:', error);
      // Fallback calculation
      return 50000 + (debtAmount * 2.5 / 100);
    }
  };

  const checkEligibility = async (clubMemberId: string): Promise<ConversionEligibility> => {
    try {
      const { data, error } = await supabase.rpc('check_debt_conversion_eligibility', {
        p_club_member_id: clubMemberId
      });

      if (error) throw error;
      return data as unknown as ConversionEligibility;
    } catch (error) {
      console.error('Error checking eligibility:', error);
      return {
        eligible: false,
        fee_paid: false,
        net_balance: 0,
        current_share_price: 0,
        balance_sufficient: false,
        error: 'Failed to check eligibility'
      };
    }
  };

  const createFeePayment = async (paymentData: {
    club_member_id: string;
    amount: number;
    currency?: string;
    payment_method: string;
    transaction_id?: string;
  }): Promise<ConversionFeePayment | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('debt_conversion_fee_payments')
        .insert({
          ...paymentData,
          currency: paymentData.currency || 'UGX',
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Fee payment created successfully');
      return data as ConversionFeePayment;
    } catch (error) {
      console.error('Error creating fee payment:', error);
      toast.error('Failed to create fee payment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const processWalletPayment = async (
    clubMemberId: string,
    feeAmount: number,
    walletId: string
  ): Promise<{ success: boolean; payment?: ConversionFeePayment }> => {
    setLoading(true);
    try {
      // First create the fee payment record
      const feePayment = await createFeePayment({
        club_member_id: clubMemberId,
        amount: feeAmount,
        payment_method: 'wallet'
      });

      if (!feePayment) {
        throw new Error('Failed to create fee payment record');
      }

      // Get user info for transaction
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create transaction record to deduct from user wallet
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: walletId,
          amount: -feeAmount, // Negative for deduction
          currency: 'UGX',
          transaction_type: 'withdraw',
          reference: `Debt conversion fee - ${feePayment.id}`,
          status: 'pending'
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update fee payment with transaction ID
      const { error: updateError } = await supabase
        .from('debt_conversion_fee_payments')
        .update({
          transaction_id: transaction.id,
          status: 'processing'
        })
        .eq('id', feePayment.id);

      if (updateError) throw updateError;

      // Get current wallet balance first
      const { data: wallet, error: walletFetchError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

      if (walletFetchError) throw walletFetchError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance - feeAmount
        })
        .eq('id', walletId);

      if (walletError) throw walletError;

      // Mark fee payment as completed
      const { data: completedPayment, error: completeError } = await supabase
        .from('debt_conversion_fee_payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString()
        })
        .eq('id', feePayment.id)
        .select()
        .single();

      if (completeError) throw completeError;

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transaction.id);

      toast.success('Conversion fee paid successfully');
      return { success: true, payment: completedPayment as ConversionFeePayment };

    } catch (error) {
      console.error('Error processing wallet payment:', error);
      toast.error('Failed to process fee payment');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const getFeePayments = async (clubMemberId: string): Promise<ConversionFeePayment[]> => {
    try {
      const { data, error } = await supabase
        .from('debt_conversion_fee_payments')
        .select('*')
        .eq('club_member_id', clubMemberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ConversionFeePayment[];
    } catch (error) {
      console.error('Error fetching fee payments:', error);
      return [];
    }
  };

  return {
    loading,
    feeSettings,
    calculateConversionFee,
    checkEligibility,
    createFeePayment,
    processWalletPayment,
    getFeePayments,
    refreshFeeSettings: loadFeeSettings
  };
};