
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { useCurrencyExchange } from '@/hooks/useCurrencyExchange';

interface CurrencyExchangeFormProps {
  userWallets: any[];
  onExchangeComplete: () => void;
}

const CurrencyExchangeForm: React.FC<CurrencyExchangeFormProps> = ({
  userWallets,
  onExchangeComplete
}) => {
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(0);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [feeAmount, setFeeAmount] = useState(0);
  const { loading, getExchangeRate, calculateExchange, processExchange } = useCurrencyExchange();

  const fromWallet = userWallets.find(w => w.id === fromWalletId);
  const toWallet = userWallets.find(w => w.id === toWalletId);
  const exchangeAmount = parseFloat(amount) || 0;

  // Fetch exchange rate and calculate conversion when inputs change
  useEffect(() => {
    if (fromWallet && toWallet && exchangeAmount > 0 && fromWallet.currency !== toWallet.currency) {
      fetchAndCalculateExchange();
    } else {
      setExchangeRate(0);
      setConvertedAmount(0);
      setFeeAmount(0);
    }
  }, [fromWalletId, toWalletId, amount]);

  const fetchAndCalculateExchange = async () => {
    if (!fromWallet || !toWallet) return;
    
    try {
      const calculation = await calculateExchange(
        exchangeAmount,
        fromWallet.currency,
        toWallet.currency
      );
      
      setExchangeRate(calculation.rate);
      setConvertedAmount(calculation.convertedAmount);
      setFeeAmount(calculation.fee);
    } catch (error) {
      console.error('Error calculating exchange:', error);
      setExchangeRate(0);
      setConvertedAmount(0);
      setFeeAmount(0);
    }
  };

  const handleExchange = async () => {
    if (!fromWallet || !toWallet || !exchangeAmount) {
      toast.error('Please select both wallets and enter an amount');
      return;
    }

    if (fromWallet.currency === toWallet.currency) {
      toast.error('Please select different currency wallets');
      return;
    }

    if (fromWallet.balance < exchangeAmount) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      await processExchange(
        fromWallet.id,
        toWallet.id,
        exchangeAmount,
        fromWallet.currency,
        toWallet.currency
      );

      setFromWalletId('');
      setToWalletId('');
      setAmount('');
      setExchangeRate(0);
      setConvertedAmount(0);
      setFeeAmount(0);
      onExchangeComplete();
    } catch (error: any) {
      console.error('Error processing exchange:', error);
      toast.error(`Failed to process exchange: ${error.message}`);
    }
  };

  const availableTargetWallets = userWallets.filter(w => w.id !== fromWalletId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Currency Exchange
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* From Wallet */}
        <div className="space-y-2">
          <Label>From Wallet</Label>
          <Select value={fromWalletId} onValueChange={setFromWalletId}>
            <SelectTrigger>
              <SelectValue placeholder="Select source wallet" />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-background z-[1000] shadow-md border">
              {userWallets.length > 0 ? (
                userWallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{wallet.currency} Wallet</span>
                      <Badge variant="outline">
                        {wallet.currency} {wallet.balance?.toLocaleString() || '0'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-wallets" disabled>
                  No wallets available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* To Wallet */}
        <div className="space-y-2">
          <Label>To Wallet</Label>
          <Select 
            value={toWalletId} 
            onValueChange={setToWalletId}
            disabled={!fromWalletId}
          >
            <SelectTrigger>
              <SelectValue placeholder={fromWalletId ? "Select target wallet" : "Select source wallet first"} />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-background z-[1000] shadow-md border">
              {availableTargetWallets.length > 0 ? (
                availableTargetWallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{wallet.currency} Wallet</span>
                      <Badge variant="outline">
                        {wallet.currency} {wallet.balance?.toLocaleString() || '0'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-wallets" disabled>
                  {fromWalletId ? 'No other wallets available' : 'Select source wallet first'}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label>Amount to Exchange</Label>
          <Input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
            disabled={!fromWalletId || !toWalletId}
          />
        </div>

        {/* Exchange Rate Display */}
        {fromWallet && toWallet && exchangeRate > 0 && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Exchange Rate:</span>
              <span>1 {fromWallet.currency} = {exchangeRate.toLocaleString()} {toWallet.currency}</span>
            </div>
            {exchangeAmount > 0 && (
              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>You will receive:</span>
                <span>{convertedAmount.toLocaleString()} {toWallet.currency}</span>
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={handleExchange} 
          className="w-full"
          disabled={
            loading || 
            !fromWallet || 
            !toWallet || 
            !exchangeAmount || 
            fromWallet.balance < exchangeAmount ||
            fromWallet.currency === toWallet.currency
          }
        >
          {loading ? 'Processing...' : 'Exchange Currency'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CurrencyExchangeForm;
