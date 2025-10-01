
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';

interface CurrencyExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: any[];
  onExchangeComplete: () => void;
  requiredAmount?: number;
  requiredCurrency?: string;
  purpose?: string;
}

const CurrencyExchangeModal: React.FC<CurrencyExchangeModalProps> = ({
  isOpen,
  onClose,
  wallets,
  onExchangeComplete,
  requiredAmount,
  requiredCurrency,
  purpose
}) => {
  const [fromCurrency, setFromCurrency] = useState('');
  const [toCurrency, setToCurrency] = useState(requiredCurrency || '');
  const [amount, setAmount] = useState(requiredAmount || 0);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (requiredCurrency) {
      setToCurrency(requiredCurrency);
      const otherWallet = wallets.find(w => w.currency !== requiredCurrency);
      if (otherWallet) {
        setFromCurrency(otherWallet.currency);
      }
    }
  }, [requiredCurrency, wallets]);

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

      if (error) throw error;
      setExchangeRate(data.rate);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Default rates for demo
      if (fromCurrency === 'USD' && toCurrency === 'UGX') {
        setExchangeRate(3700);
      } else if (fromCurrency === 'UGX' && toCurrency === 'USD') {
        setExchangeRate(0.00027);
      }
    }
  };

  const handleExchange = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fromWallet = wallets.find(w => w.currency === fromCurrency);
      const toWallet = wallets.find(w => w.currency === toCurrency);

      if (!fromWallet || !toWallet) throw new Error('Wallets not found');

      const convertedAmount = amount * exchangeRate;
      const fee = amount * 0.02; // 2% exchange fee

      if (fromWallet.balance < (amount + fee)) {
        throw new Error('Insufficient balance including exchange fee');
      }

      // Create exchange request
      const { error } = await supabase
        .from('currency_exchange_requests')
        .insert({
          user_id: user.id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          from_amount: amount,
          to_amount: convertedAmount,
          exchange_rate: exchangeRate,
          fee_amount: fee,
          status: 'completed'
        });

      if (error) throw error;

      // Update wallet balances
      await supabase
        .from('wallets')
        .update({ balance: fromWallet.balance - amount - fee })
        .eq('id', fromWallet.id);

      await supabase
        .from('wallets')
        .update({ balance: toWallet.balance + convertedAmount })
        .eq('id', toWallet.id);

      toast.success('Currency exchange completed successfully');
      onExchangeComplete();
      onClose();
    } catch (error: any) {
      console.error('Error exchanging currency:', error);
      toast.error(error.message || 'Failed to exchange currency');
    } finally {
      setLoading(false);
    }
  };

  const fromWallet = wallets.find(w => w.currency === fromCurrency);
  const convertedAmount = amount * exchangeRate;
  const fee = amount * 0.02;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Currency Exchange
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {purpose && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-sm text-amber-700">{purpose}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label>From Currency</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency to exchange from" />
              </SelectTrigger>
              <SelectContent>
                {wallets.filter(w => w.currency !== toCurrency).map(wallet => (
                  <SelectItem key={wallet.currency} value={wallet.currency}>
                    {wallet.currency} - {wallet.balance.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>To Currency</Label>
            <Select value={toCurrency} onValueChange={setToCurrency} disabled={!!requiredCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency to exchange to" />
              </SelectTrigger>
              <SelectContent>
                {wallets.filter(w => w.currency !== fromCurrency).map(wallet => (
                  <SelectItem key={wallet.currency} value={wallet.currency}>
                    {wallet.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Amount to Exchange</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              max={fromWallet?.balance || 0}
            />
            {fromWallet && (
              <p className="text-xs text-muted-foreground mt-1">
                Available: {fromWallet.currency} {fromWallet.balance.toLocaleString()}
              </p>
            )}
          </div>

          {exchangeRate > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Exchange Rate:</span>
                  <span>1 {fromCurrency} = {exchangeRate.toLocaleString()} {toCurrency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>You'll receive:</span>
                  <span className="font-medium">{toCurrency} {convertedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-red-600">
                  <span>Exchange fee (2%):</span>
                  <span>{fromCurrency} {fee.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total deducted:</span>
                  <span>{fromCurrency} {(amount + fee).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleExchange} 
              disabled={loading || !fromCurrency || !toCurrency || amount <= 0}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Exchange'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CurrencyExchangeModal;
