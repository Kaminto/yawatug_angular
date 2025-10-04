
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Repeat, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import WalletSecurityVerification from './WalletSecurityVerification';

interface WalletExchangeFormProps {
  onExchangeComplete?: () => void;
}

const WalletExchangeForm = ({ onExchangeComplete }: WalletExchangeFormProps) => {
  const [formData, setFormData] = useState({
    fromCurrency: '',
    toCurrency: '',
    amount: ''
  });
  const [wallets, setWallets] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const { getFeeDetails } = useTransactionFees();

  useEffect(() => {
    loadWallets();
    loadExchangeRates();
  }, []);

  const loadWallets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setWallets(data || []);
    } catch (error) {
      console.error('Error loading wallets:', error);
      toast.error('Failed to load wallets');
    }
  };

  const loadExchangeRates = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      console.log('Exchange rates loaded:', data);
      setExchangeRates(data || []);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      toast.error('Failed to load exchange rates');
    }
  };

  const sourceWallet = wallets.find(w => w.currency === formData.fromCurrency);
  const destWallet = wallets.find(w => w.currency === formData.toCurrency);
  const rate = exchangeRates.find(r => r.from_currency === formData.fromCurrency && r.to_currency === formData.toCurrency);
  
  const amountNum = parseFloat(formData.amount) || 0;
  const feeInfo = sourceWallet ? getFeeDetails('exchange', amountNum, formData.fromCurrency) : null;
  const totalDeduction = amountNum + (feeInfo?.totalFee || 0);
  
  const exchangeAmount = rate ? amountNum * rate.rate : 0;
  const spreadAmount = rate ? exchangeAmount * (rate.spread_percentage / 100) : 0;
  const finalReceiveAmount = exchangeAmount - spreadAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fromCurrency || !formData.toCurrency || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!sourceWallet) {
      toast.error(`You don't have a ${formData.fromCurrency} wallet. Please create one first.`);
      return;
    }

    if (!destWallet) {
      toast.error(`You don't have a ${formData.toCurrency} wallet. Please create one first.`);
      return;
    }

    if (!rate) {
      toast.error('Exchange rate not available for this currency pair');
      return;
    }

    if (sourceWallet.balance < totalDeduction) {
      toast.error('Insufficient balance including fees');
      return;
    }

    setShowVerification(true);
  };

  const handleVerificationSuccess = async () => {
    setShowVerification(false);
    await processExchange();
  };

  const processExchange = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('process-exchange', {
        body: {
          userId: user.id,
          fromCurrency: formData.fromCurrency,
          toCurrency: formData.toCurrency,
          fromAmount: amountNum
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Currency exchange completed successfully!');
        setFormData({
          fromCurrency: '',
          toCurrency: '',
          amount: ''
        });
        loadWallets(); // Refresh wallet balances
        onExchangeComplete?.(); // Call parent callback to refresh
      } else {
        throw new Error(data.error || 'Exchange failed');
      }
    } catch (error: any) {
      console.error('Exchange error:', error);
      toast.error(error.message || 'Failed to process exchange');
    } finally {
      setLoading(false);
    }
  };

  const availableCurrencies = React.useMemo(() => {
    // Get all unique currencies from exchange rates (both from and to)
    const fromCurrencies = exchangeRates.map(r => r.from_currency);
    const toCurrencies = exchangeRates.map(r => r.to_currency);
    const allCurrencies = [...new Set([...fromCurrencies, ...toCurrencies])];
    
    console.log('Available currencies computed:', allCurrencies);
    
    // Prioritize currencies the user has wallets for
    const userCurrencies = wallets.map(w => w.currency);
    const sorted = allCurrencies.sort((a, b) => {
      const aHasWallet = userCurrencies.includes(a);
      const bHasWallet = userCurrencies.includes(b);
      if (aHasWallet && !bHasWallet) return -1;
      if (!aHasWallet && bHasWallet) return 1;
      return a.localeCompare(b);
    });
    
    console.log('Sorted currencies:', sorted);
    return sorted;
  }, [exchangeRates, wallets]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Currency Exchange
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Admin Reference Notice */}
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Exchange rates are configured by administrators and updated regularly for fair market value.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* From Currency */}
            <div className="space-y-2">
              <Label htmlFor="fromCurrency">From Currency</Label>
              <Select value={formData.fromCurrency} onValueChange={(value) => setFormData(prev => ({ ...prev, fromCurrency: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source currency" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {availableCurrencies.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No currencies available. Please contact support.
                    </div>
                  ) : (
                    availableCurrencies.map((currency) => {
                      const wallet = wallets.find(w => w.currency === currency);
                      const hasWallet = !!wallet;
                      return (
                        <SelectItem key={currency} value={currency}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className={!hasWallet ? 'text-muted-foreground' : ''}>{currency}</span>
                            {hasWallet ? (
                              <Badge variant="outline">
                                {currency} {wallet.balance.toLocaleString()}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                No wallet
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* To Currency */}
            <div className="space-y-2">
              <Label htmlFor="toCurrency">To Currency</Label>
              <Select value={formData.toCurrency} onValueChange={(value) => setFormData(prev => ({ ...prev, toCurrency: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target currency" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {availableCurrencies
                    .filter(currency => currency !== formData.fromCurrency)
                    .length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No currencies available. Please select a different source currency.
                    </div>
                  ) : (
                    availableCurrencies
                      .filter(currency => currency !== formData.fromCurrency)
                      .map((currency) => {
                        const wallet = wallets.find(w => w.currency === currency);
                        const hasWallet = !!wallet;
                        return (
                          <SelectItem key={currency} value={currency}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className={!hasWallet ? 'text-muted-foreground' : ''}>{currency}</span>
                              {hasWallet ? (
                                <Badge variant="outline">
                                  {currency} {wallet.balance.toLocaleString()}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  No wallet
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Exchange Rate Display */}
            {rate && formData.fromCurrency && formData.toCurrency && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-800">
                    Exchange Rate: 1 {formData.fromCurrency} = {rate.rate} {formData.toCurrency}
                  </span>
                </div>
                {rate.spread_percentage > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    Spread: {rate.spread_percentage}%
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {new Date(rate.updated_at).toLocaleString()}
                </p>
              </div>
            )}

            {!rate && formData.fromCurrency && formData.toCurrency && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Exchange rate not available for {formData.fromCurrency} to {formData.toCurrency}. 
                  Please contact support or try a different currency pair.
                </AlertDescription>
              </Alert>
            )}

            {!sourceWallet && formData.fromCurrency && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You don't have a {formData.fromCurrency} wallet. Please create one first to exchange from this currency.
                </AlertDescription>
              </Alert>
            )}

            {!destWallet && formData.toCurrency && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You don't have a {formData.toCurrency} wallet. Please create one first to receive this currency.
                </AlertDescription>
              </Alert>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount to Exchange</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
                min="1"
                step="0.01"
                max={sourceWallet?.balance || 0}
              />
              {sourceWallet && (
                <div className="text-sm text-muted-foreground">
                  Available: {formData.fromCurrency} {sourceWallet.balance.toLocaleString()}
                </div>
              )}
              {feeInfo && amountNum > 0 && (
                <div className="text-sm text-muted-foreground">
                  Transaction fee: {formData.fromCurrency} {feeInfo.totalFee.toLocaleString()}
                </div>
              )}
            </div>

            {/* Exchange Summary */}
            {rate && amountNum > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>You pay:</span>
                  <span>{formData.fromCurrency} {amountNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Exchange rate:</span>
                  <span>1 {formData.fromCurrency} = {rate.rate} {formData.toCurrency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Before spread:</span>
                  <span>{formData.toCurrency} {exchangeAmount.toLocaleString()}</span>
                </div>
                {spreadAmount > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Spread ({rate.spread_percentage}%):</span>
                    <span>-{formData.toCurrency} {spreadAmount.toLocaleString()}</span>
                  </div>
                )}
                {feeInfo && feeInfo.totalFee > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Transaction fee:</span>
                    <span>-{formData.fromCurrency} {feeInfo.totalFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>You receive:</span>
                  <span>{formData.toCurrency} {finalReceiveAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium text-orange-600">
                  <span>Total deducted:</span>
                  <span>{formData.fromCurrency} {totalDeduction.toLocaleString()}</span>
                </div>
              </div>
            )}

            {sourceWallet && totalDeduction > sourceWallet.balance && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient balance. You need {formData.fromCurrency} {totalDeduction.toLocaleString()} 
                  but only have {formData.fromCurrency} {sourceWallet.balance.toLocaleString()}.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                loading || 
                !formData.fromCurrency || 
                !formData.toCurrency || 
                !formData.amount || 
                !rate || 
                !sourceWallet || 
                !destWallet || 
                (sourceWallet && totalDeduction > sourceWallet.balance)
              }
            >
              {loading ? 'Processing...' : 'Exchange Currency'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {showVerification && (
        <WalletSecurityVerification
          isOpen={showVerification}
          onClose={() => setShowVerification(false)}
          onVerified={handleVerificationSuccess}
          transactionAmount={amountNum}
          transactionType="exchange"
          requireOTP={true}
        />
      )}
    </>
  );
};

export default WalletExchangeForm;
