
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Wallet {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
}

interface PaymentMethodBase {
  needsExchange: boolean;
  exchangeRequired: number;
}

interface DirectPaymentMethod extends PaymentMethodBase {
  wallet: Wallet;
  needsExchange: false;
  exchangeRequired: 0;
  error?: undefined;
  sourceWallet?: undefined;
  targetWallet?: undefined;
  exchangeAmount?: undefined;
  exchangeRate?: undefined;
}

interface ExchangePaymentMethod extends PaymentMethodBase {
  wallet: Wallet;
  needsExchange: true;
  exchangeRequired: number;
  sourceWallet: Wallet;
  targetWallet: Wallet;
  exchangeAmount: number;
  exchangeRate: number;
  error?: undefined;
}

interface FailedPaymentMethod {
  wallet: null;
  needsExchange: false;
  exchangeRequired: 0;
  error: string;
  sourceWallet?: undefined;
  targetWallet?: undefined;
  exchangeAmount?: undefined;
  exchangeRate?: undefined;
}

export type PaymentMethod = DirectPaymentMethod | ExchangePaymentMethod | FailedPaymentMethod;

export const useSmartPayment = () => {
  const [loading, setLoading] = useState(false);

  const findBestPaymentMethod = async (
    userId: string, 
    requiredAmount: number, 
    preferredCurrency: string = 'UGX'
  ): Promise<PaymentMethod> => {
    try {
      console.log('Finding payment method for:', { userId, requiredAmount, preferredCurrency });
      
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      console.log('User wallets:', wallets);

      // First try preferred currency
      const preferredWallet = wallets?.find(w => 
        w.currency === preferredCurrency && w.balance >= requiredAmount
      );

      if (preferredWallet) {
        console.log('Found sufficient balance in preferred currency:', preferredWallet);
        return {
          wallet: preferredWallet,
          needsExchange: false as const,
          exchangeRequired: 0
        } satisfies DirectPaymentMethod;
      }

      // Check if preferred currency wallet exists (even with 0 balance)
      const ugxWallet = wallets?.find(w => w.currency === preferredCurrency);
      
      if (ugxWallet) {
        const shortfall = requiredAmount - ugxWallet.balance;
        console.log('UGX wallet found with shortfall:', { balance: ugxWallet.balance, required: requiredAmount, shortfall });
        
        // Find other wallets with sufficient balance for exchange
        const otherWallets = wallets?.filter(w => 
          w.currency !== preferredCurrency && w.balance > 0
        ) || [];

        console.log('Other wallets for exchange:', otherWallets);

        for (const wallet of otherWallets) {
          // Get exchange rate (use default rate if no database rate found)
          let exchangeRate = 3800; // Default USD to UGX rate
          
          const { data: rateData } = await supabase
            .from('exchange_rates')
            .select('rate')
            .eq('from_currency', wallet.currency)
            .eq('to_currency', preferredCurrency)
            .eq('is_active', true)
            .maybeSingle();

          if (rateData?.rate) {
            exchangeRate = rateData.rate;
            console.log('Found exchange rate from DB:', exchangeRate);
          } else {
            console.log('Using default exchange rate:', exchangeRate);
          }

          const convertedAmount = wallet.balance * exchangeRate;
          console.log('Checking wallet conversion:', {
            currency: wallet.currency,
            balance: wallet.balance,
            rate: exchangeRate,
            convertedAmount,
            shortfall,
            canCover: convertedAmount >= shortfall
          });

          if (convertedAmount >= shortfall) {
            // Calculate how much USD we need to exchange to get the required UGX
            const usdNeededForShortfall = shortfall / exchangeRate;
            const result = {
              wallet: ugxWallet,
              needsExchange: true as const,
              exchangeRequired: shortfall,
              sourceWallet: wallet,
              targetWallet: ugxWallet,
              exchangeAmount: usdNeededForShortfall,
              exchangeRate: exchangeRate
            } satisfies ExchangePaymentMethod;
            console.log('Exchange solution found:', result);
            return result;
          }
        }
      }

      console.log('No payment solution found');
      return {
        wallet: null,
        needsExchange: false as const,
        exchangeRequired: 0,
        error: 'Insufficient funds across all wallets'
      } satisfies FailedPaymentMethod;

    } catch (error) {
      console.error('Error finding payment method:', error);
      return {
        wallet: null,
        needsExchange: false as const,
        exchangeRequired: 0,
        error: 'Failed to check payment options'
      } satisfies FailedPaymentMethod;
    }
  };

  const processExchangeAndPayment = async (
    sourceWallet: Wallet,
    targetWallet: Wallet,
    exchangeAmount: number,
    exchangeRate: number
  ): Promise<{ success: boolean; updatedTargetWallet?: Wallet }> => {
    try {
      setLoading(true);

      // exchangeAmount is in USD, we multiply by rate to get UGX
      const ugxAmountToAdd = exchangeAmount * exchangeRate;
      
      console.log('Exchange Details:', {
        usdToExchange: exchangeAmount,
        ugxAmountToAdd,
        exchangeRate,
        sourceBalance: sourceWallet.balance,
        targetBalance: targetWallet.balance
      });

      // Create exchange request
      const { data: exchangeRequest, error: exchangeError } = await supabase
        .from('currency_exchange_requests')
        .insert({
          user_id: targetWallet.user_id,
          from_currency: sourceWallet.currency,
          to_currency: targetWallet.currency,
          from_amount: exchangeAmount,
          to_amount: ugxAmountToAdd,
          exchange_rate: exchangeRate,
          status: 'completed'
        })
        .select()
        .single();

      if (exchangeError) throw exchangeError;

      // Record exchange transactions (no direct balance updates)
      const { data: txOut, error: txOutErr } = await supabase
        .from('transactions')
        .insert({
          user_id: sourceWallet.user_id,
          wallet_id: sourceWallet.id,
          transaction_type: 'currency_exchange_out',
          amount: -Math.abs(exchangeAmount),
          currency: sourceWallet.currency,
          status: 'completed',
          description: `Currency exchange to ${targetWallet.currency}`,
          reference: exchangeRequest?.id || null,
          metadata: { to_currency: targetWallet.currency, rate: exchangeRate, to_amount: ugxAmountToAdd }
        })
        .select()
        .single();
      if (txOutErr) throw txOutErr;

      const { data: txIn, error: txInErr } = await supabase
        .from('transactions')
        .insert({
          user_id: targetWallet.user_id,
          wallet_id: targetWallet.id,
          transaction_type: 'currency_exchange_in',
          amount: Math.abs(ugxAmountToAdd),
          currency: targetWallet.currency,
          status: 'completed',
          description: `Currency exchange from ${sourceWallet.currency}`,
          reference: exchangeRequest?.id || null,
          metadata: { from_currency: sourceWallet.currency, rate: exchangeRate, from_amount: exchangeAmount }
        })
        .select()
        .single();
      if (txInErr) throw txInErr;

      // Fetch updated target wallet balance (updated via DB triggers on transactions)
      const { data: updatedWallet, error: fetchErr } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', targetWallet.id)
        .single();
      if (fetchErr) throw fetchErr;

      console.log('Exchange completed:', {
        oldBalance: targetWallet.balance,
        newBalance: updatedWallet.balance,
        usdExchanged: exchangeAmount,
        ugxReceived: ugxAmountToAdd
      });

      toast.success(`Exchanged ${exchangeAmount.toFixed(2)} ${sourceWallet.currency} to ${ugxAmountToAdd.toLocaleString()} ${targetWallet.currency}`);
      return { success: true, updatedTargetWallet: updatedWallet };

    } catch (error) {
      console.error('Error processing exchange:', error);
      toast.error('Failed to process currency exchange');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    findBestPaymentMethod,
    processExchangeAndPayment
  };
};
