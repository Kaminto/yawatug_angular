
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface CurrencyExchangeFormProps {
  userWallets: any[];
  onExchangeComplete: () => void;
}

const CurrencyExchangeForm: React.FC<CurrencyExchangeFormProps> = ({
  userWallets,
  onExchangeComplete
}) => {
  const [fromCurrency, setFromCurrency] = useState('');
  const [toCurrency, setToCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(0);
  const [loading, setLoading] = useState(false);

  const fromWallet = userWallets.find(w => w.currency === fromCurrency);
  const exchangeAmount = parseFloat(amount) || 0;
  const convertedAmount = exchangeAmount * exchangeRate;

  useEffect(() => {
    if (fromCurrency && toCurrency && fromCurrency !== toCurrency) {
      fetchExchangeRate();
    }
  }, [fromCurrency, toCurrency]);

  const fetchExchangeRate = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // Default rates if not found
        if (fromCurrency === 'USD' && toCurrency === 'UGX') {
          setExchangeRate(3800);
        } else if (fromCurrency === 'UGX' && toCurrency === 'USD') {
          setExchangeRate(1/3800);
        } else {
          setExchangeRate(1);
        }
      } else {
        setExchangeRate(data.rate);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      setExchangeRate(1);
    }
  };

  const handleExchange = async () => {
    if (!fromWallet || !exchangeAmount || !toCurrency) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (fromWallet.balance < exchangeAmount) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('currency_exchange_requests')
        .insert({
          user_id: user.id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          from_amount: exchangeAmount,
          to_amount: convertedAmount,
          exchange_rate: exchangeRate,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Currency exchange request submitted successfully');
      setFromCurrency('');
      setToCurrency('');
      setAmount('');
      onExchangeComplete();
    } catch (error: any) {
      console.error('Error creating exchange request:', error);
      toast.error(`Failed to create exchange request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const availableCurrencies = [...new Set(userWallets.map(w => w.currency))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Currency Exchange
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>From Currency</Label>
          <Select value={fromCurrency} onValueChange={setFromCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="Choose currency to exchange from" />
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.map((currency) => {
                const wallet = userWallets.find(w => w.currency === currency);
                return (
                  <SelectItem key={currency} value={currency}>
                    {currency} (Balance: {wallet?.balance.toLocaleString()})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>To Currency</Label>
          <Select value={toCurrency} onValueChange={setToCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="Choose currency to exchange to" />
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.filter(c => c !== fromCurrency).map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Amount to Exchange</Label>
          <Input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
          />
        </div>

        {fromCurrency && toCurrency && exchangeRate > 0 && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Exchange Rate:</span>
              <span>1 {fromCurrency} = {exchangeRate.toLocaleString()} {toCurrency}</span>
            </div>
            {exchangeAmount > 0 && (
              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>You will receive:</span>
                <span>{convertedAmount.toLocaleString()} {toCurrency}</span>
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={handleExchange} 
          className="w-full"
          disabled={loading || !fromCurrency || !toCurrency || !exchangeAmount || (fromWallet && fromWallet.balance < exchangeAmount)}
        >
          {loading ? 'Processing...' : 'Submit Exchange Request'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CurrencyExchangeForm;
