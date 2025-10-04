import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const useWalletValidation = () => {
  const [validating, setValidating] = useState(false);

  const validateBalance = async (
    walletId: string,
    requiredAmount: number,
    currency: string
  ): Promise<ValidationResult> => {
    try {
      const { data: wallet, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

      if (error) throw error;

      if (!wallet) {
        return { isValid: false, error: 'Wallet not found' };
      }

      if (wallet.balance < requiredAmount) {
        return {
          isValid: false,
          error: `Insufficient balance. Available: ${currency} ${wallet.balance.toLocaleString()}, Required: ${currency} ${requiredAmount.toLocaleString()}`
        };
      }

      // Check for negative balance
      if (wallet.balance < 0) {
        return {
          isValid: false,
          error: 'Wallet has negative balance. Please contact support.'
        };
      }

      return { isValid: true };
    } catch (error: any) {
      console.error('Balance validation error:', error);
      return { isValid: false, error: error.message };
    }
  };

  const validateTransactionLimit = async (
    userId: string,
    amount: number,
    transactionType: string,
    currency: string
  ): Promise<ValidationResult> => {
    try {
      // Get transaction limits from settings
      const { data: settings, error } = await supabase
        .from('transaction_fee_settings')
        .select('*')
        .eq('transaction_type', transactionType)
        .eq('currency', currency)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Default limits if no settings found
      const maxLimit = settings?.maximum_fee || 10000000; // 10M default
      const minLimit = settings?.minimum_fee || 1000; // 1K default

      if (amount > maxLimit) {
        return {
          isValid: false,
          error: `Transaction amount exceeds maximum limit of ${currency} ${maxLimit.toLocaleString()}`
        };
      }

      if (amount < minLimit) {
        return {
          isValid: false,
          error: `Transaction amount below minimum limit of ${currency} ${minLimit.toLocaleString()}`
        };
      }

      // Check daily transaction limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayTransactions, error: txError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_type', transactionType)
        .eq('currency', currency)
        .gte('created_at', today.toISOString())
        .eq('status', 'completed');

      if (txError) throw txError;

      const totalToday = (todayTransactions || []).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      const dailyLimit = 50000000; // 50M default daily limit

      if (totalToday + amount > dailyLimit) {
        return {
          isValid: false,
          error: `Daily transaction limit exceeded. Limit: ${currency} ${dailyLimit.toLocaleString()}, Used: ${currency} ${totalToday.toLocaleString()}`
        };
      }

      return { isValid: true };
    } catch (error: any) {
      console.error('Transaction limit validation error:', error);
      return { isValid: false, error: error.message };
    }
  };

  const validateWalletStatus = async (walletId: string): Promise<ValidationResult> => {
    try {
      const { data: wallet, error } = await supabase
        .from('wallets')
        .select('status')
        .eq('id', walletId)
        .single();

      if (error) throw error;

      if (!wallet) {
        return { isValid: false, error: 'Wallet not found' };
      }

      if (wallet.status !== 'active') {
        return {
          isValid: false,
          error: `Wallet is ${wallet.status}. Please contact support.`
        };
      }

      return { isValid: true };
    } catch (error: any) {
      console.error('Wallet status validation error:', error);
      return { isValid: false, error: error.message };
    }
  };

  const validateUserStatus = async (userId: string): Promise<ValidationResult> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (!profile) {
        return { isValid: false, error: 'User profile not found' };
      }

      // Check if user is unverified (pending_verification or unverified)
      if (profile.status !== 'active') {
        return {
          isValid: false,
          error: 'Your account requires verification. Please complete your profile.'
        };
      }

      return { isValid: true };
    } catch (error: any) {
      console.error('User status validation error:', error);
      return { isValid: false, error: error.message };
    }
  };

  const validateTransaction = async (data: {
    userId: string;
    walletId: string;
    amount: number;
    currency: string;
    transactionType: string;
  }): Promise<ValidationResult> => {
    setValidating(true);
    try {
      // Validate user status
      const userValidation = await validateUserStatus(data.userId);
      if (!userValidation.isValid) return userValidation;

      // Validate wallet status
      const walletValidation = await validateWalletStatus(data.walletId);
      if (!walletValidation.isValid) return walletValidation;

      // Validate transaction limits
      const limitValidation = await validateTransactionLimit(
        data.userId,
        data.amount,
        data.transactionType,
        data.currency
      );
      if (!limitValidation.isValid) return limitValidation;

      // Validate balance for withdrawals and transfers
      if (['withdraw', 'transfer', 'exchange'].includes(data.transactionType)) {
        const balanceValidation = await validateBalance(
          data.walletId,
          data.amount,
          data.currency
        );
        if (!balanceValidation.isValid) return balanceValidation;
      }

      return { isValid: true };
    } catch (error: any) {
      console.error('Transaction validation error:', error);
      return { isValid: false, error: error.message };
    } finally {
      setValidating(false);
    }
  };

  return {
    validating,
    validateBalance,
    validateTransactionLimit,
    validateWalletStatus,
    validateUserStatus,
    validateTransaction
  };
};
