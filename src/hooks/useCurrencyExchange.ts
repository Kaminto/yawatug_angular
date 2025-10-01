
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCurrencyExchange = () => {
  const [loading, setLoading] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  const getExchangeRate = async (fromCurrency: string, toCurrency: string) => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate, spread_percentage')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      const rateWithSpread = data.rate * (1 + (data.spread_percentage || 0) / 100);
      return rateWithSpread;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Fallback rates for common pairs
      const fallbackRates: Record<string, number> = {
        'USD-UGX': 3700,
        'UGX-USD': 1/3700,
      };
      return fallbackRates[`${fromCurrency}-${toCurrency}`] || 1;
    }
  };

  const calculateExchange = async (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, rate: 1, fee: 0 };
    }

    const rate = await getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate;
    const fee = Math.max(convertedAmount * 0.02, 1000); // 2% fee, minimum 1000 UGX

    return { convertedAmount, rate, fee };
  };

  const processExchange = async (
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { convertedAmount, rate, fee } = await calculateExchange(amount, fromCurrency, toCurrency);

      // Use database function that validates balance atomically
      const { data: result, error: exchangeError } = await supabase.rpc('create_exchange_transaction', {
        p_user_id: user.id,
        p_from_wallet_id: fromWalletId,
        p_to_wallet_id: toWalletId,
        p_from_amount: amount,
        p_to_amount: convertedAmount,
        p_from_currency: fromCurrency,
        p_to_currency: toCurrency,
        p_exchange_rate: rate,
        p_fee_amount: fee,
        p_description: `Currency exchange ${fromCurrency} to ${toCurrency}`
      });

      if (exchangeError) throw exchangeError;

      // Create exchange request for record keeping
      await supabase
        .from('currency_exchange_requests')
        .insert({
          user_id: user.id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          from_amount: amount,
          to_amount: convertedAmount,
          exchange_rate: rate,
          fee_amount: fee,
          status: 'completed',
          completed_at: new Date().toISOString()
        });

      toast.success(`Successfully exchanged ${amount} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency}`);
      
      return result;
    } catch (error: any) {
      console.error('Error processing currency exchange:', error);
      toast.error(`Failed to process exchange: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    exchangeRates,
    getExchangeRate,
    calculateExchange,
    processExchange
  };
};
