
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeftRight, AlertCircle, Info } from 'lucide-react';

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
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);

  // Load active exchange rates to power dropdowns
  useEffect(() => {
    const loadRates = async () => {
      try {
        const { data, error } = await supabase
          .from('exchange_rates')
          .select('*')
          .eq('is_active', true);
        if (error) throw error;
        console.log('Modal: exchange rates loaded', data);
        setExchangeRates(data || []);
      } catch (err) {
        console.error('Modal: failed to load exchange rates', err);
        toast.error('Failed to load exchange rates');
      }
    };
    loadRates();
  }, []);
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
      if (!fromWallet) throw new Error('Source wallet not found');

      const convertedAmount = amount * exchangeRate;
      const fee = amount * 0.02; // 2% exchange fee

      if (fromWallet.balance < (amount + fee)) {
        throw new Error('Insufficient balance including exchange fee');
      }

      // Check if target wallet exists, create if not
      let toWallet = wallets.find(w => w.currency === toCurrency);
      if (!toWallet) {
        const { data: newWallet, error: walletError } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            currency: toCurrency,
            balance: 0,
            status: 'active'
          })
          .select()
          .single();
        
        if (walletError) throw walletError;
        toWallet = newWallet;
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

  const fromCurrenciesList = React.useMemo(() => {
    const froms = exchangeRates.map((r: any) => r.from_currency);
    const unique = Array.from(new Set(froms));
    const userCurrencies = wallets.map((w) => w.currency);
    const sorted = unique.sort((a, b) => {
      const aHas = userCurrencies.includes(a);
      const bHas = userCurrencies.includes(b);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return a.localeCompare(b);
    });
    console.log('Modal: from currencies', sorted);
    return sorted;
  }, [exchangeRates, wallets]);

  const toCurrenciesForSelected = React.useMemo(() => {
    if (!fromCurrency) return [] as string[];
    const targets = exchangeRates
      .filter((r: any) => r.from_currency === fromCurrency)
      .map((r: any) => r.to_currency);
    const unique = Array.from(new Set(targets));
    const userCurrencies = wallets.map((w) => w.currency);
    const sorted = unique.sort((a, b) => {
      const aHas = userCurrencies.includes(a);
      const bHas = userCurrencies.includes(b);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return a.localeCompare(b);
    });
    console.log('Modal: to currencies for', fromCurrency, sorted);
    return sorted;
  }, [exchangeRates, wallets, fromCurrency]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-describedby="exchange-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Currency Exchange
          </DialogTitle>
        </DialogHeader>
        <p id="exchange-desc" className="sr-only">Exchange currencies between your wallets. Rates are set by administrators.</p>
        <Alert className="mb-2 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Exchange rates are configured by administrators and used across the app.
          </AlertDescription>
        </Alert>
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
            <Select value={fromCurrency} onValueChange={setFromCurrency} onOpenChange={(open) => console.log('Modal: From currency select open:', open)}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency to exchange from" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-background z-[1000] shadow-md border">
                {fromCurrenciesList.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No currencies available</div>
                ) : (
                  fromCurrenciesList.map((c: string) => {
                    const wallet = wallets.find(w => w.currency === c);
                    const hasWallet = !!wallet;
                    return (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className={!hasWallet ? 'text-muted-foreground' : ''}>{c}</span>
                          {hasWallet ? (
                            <Badge variant="outline">{c} {wallet.balance.toLocaleString()}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">No wallet</Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>To Currency</Label>
            <Select value={toCurrency} onValueChange={setToCurrency} disabled={!!requiredCurrency} onOpenChange={(open) => console.log('Modal: To currency select open:', open)}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency to exchange to" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {!fromCurrency ? (
                  <div className="p-2 text-sm text-muted-foreground">Select source currency first</div>
                ) : toCurrenciesForSelected.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No target currencies configured</div>
                ) : (
                  toCurrenciesForSelected.map((c: string) => {
                    const wallet = wallets.find(w => w.currency === c);
                    const hasWallet = !!wallet;
                    return (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className={!hasWallet ? 'text-muted-foreground' : ''}>{c}</span>
                          {hasWallet ? (
                            <Badge variant="outline">{c} {wallet.balance.toLocaleString()}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">No wallet</Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                )}
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
