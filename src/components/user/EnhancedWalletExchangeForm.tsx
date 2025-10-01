
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Repeat, AlertCircle, ArrowRight } from 'lucide-react';
import { useTransactionFees } from '@/hooks/useTransactionFees';

interface EnhancedWalletExchangeFormProps {
  wallets: any[];
  onExchangeComplete: () => void;
}

const EnhancedWalletExchangeForm: React.FC<EnhancedWalletExchangeFormProps> = ({
  wallets,
  onExchangeComplete
}) => {
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);

  const { getFeeDetails } = useTransactionFees();

  useEffect(() => {
    getCurrentUser();
    loadExchangeRates();
  }, []);

  useEffect(() => {
    if (fromWalletId && toWalletId && fromAmount) {
      calculateExchange();
    }
  }, [fromWalletId, toWalletId, fromAmount, exchangeRates]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const loadExchangeRates = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setExchangeRates(data || []);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  const calculateExchange = () => {
    const fromWallet = wallets.find(w => w.id === fromWalletId);
    const toWallet = wallets.find(w => w.id === toWalletId);
    
    if (!fromWallet || !toWallet || !fromAmount) return;

    // Find exchange rate
    const rateData = exchangeRates.find(rate => 
      rate.from_currency === fromWallet.currency && 
      rate.to_currency === toWallet.currency
    );

    if (!rateData) {
      toast.error('Exchange rate not available for this currency pair');
      return;
    }

    const rate = rateData.rate;
    const amount = parseFloat(fromAmount);
    const feeDetails = getFeeDetails('exchange', amount, fromWallet.currency);
    const amountAfterFee = amount - feeDetails.totalFee;
    const convertedAmount = amountAfterFee * rate;

    setExchangeRate(rate);
    setToAmount(convertedAmount.toFixed(2));
  };

  const fromWallet = wallets.find(w => w.id === fromWalletId);
  const toWallet = wallets.find(w => w.id === toWalletId);
  const exchangeAmount = parseFloat(fromAmount) || 0;
  const feeDetails = getFeeDetails('exchange', exchangeAmount, fromWallet?.currency || 'UGX');
  const totalDeduction = exchangeAmount;

  const handleInitiateExchange = () => {
    if (!fromWallet || !toWallet || !exchangeAmount || !toAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (fromWallet.currency === toWallet.currency) {
      toast.error('Cannot exchange between same currencies');
      return;
    }

    if (fromWallet.balance < totalDeduction) {
      toast.error('Insufficient balance for exchange');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmExchange = async () => {
    if (!userId || !fromWallet || !toWallet) return;

    setLoading(true);
    try {
      // Create exchange request
      const { error: exchangeError } = await supabase
        .from('currency_exchange_requests')
        .insert({
          user_id: userId,
          from_currency: fromWallet.currency,
          to_currency: toWallet.currency,
          from_amount: exchangeAmount,
          to_amount: parseFloat(toAmount),
          exchange_rate: exchangeRate,
          fee_amount: feeDetails.totalFee,
          status: 'completed'
        });

      if (exchangeError) throw exchangeError;

      // Create debit transaction
      const { error: debitError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          wallet_id: fromWallet.id,
          amount: -exchangeAmount,
          currency: fromWallet.currency,
          transaction_type: 'exchange',
          status: 'completed',
          approval_status: 'approved',
          reference: `EXC-OUT-${Date.now()}`,
          admin_notes: JSON.stringify({
            exchange_type: 'outgoing',
            to_currency: toWallet.currency,
            exchange_rate: exchangeRate,
            fee_amount: feeDetails.totalFee
          })
        });

      if (debitError) throw debitError;

      // Create credit transaction
      const { error: creditError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          wallet_id: toWallet.id,
          amount: parseFloat(toAmount),
          currency: toWallet.currency,
          transaction_type: 'exchange',
          status: 'completed',
          approval_status: 'approved',
          reference: `EXC-IN-${Date.now()}`,
          admin_notes: JSON.stringify({
            exchange_type: 'incoming',
            from_currency: fromWallet.currency,
            exchange_rate: exchangeRate,
            original_amount: exchangeAmount
          })
        });

      if (creditError) throw creditError;

      // Update wallet balances
      await supabase
        .from('wallets')
        .update({ balance: fromWallet.balance - exchangeAmount })
        .eq('id', fromWallet.id);

      await supabase
        .from('wallets')
        .update({ balance: toWallet.balance + parseFloat(toAmount) })
        .eq('id', toWallet.id);

      toast.success('Currency exchange completed successfully');
      setFromWalletId('');
      setToWalletId('');
      setFromAmount('');
      setToAmount('');
      setShowConfirmation(false);
      onExchangeComplete();
    } catch (error: any) {
      console.error('Error processing exchange:', error);
      toast.error(`Failed to process exchange: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Currency Exchange
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>From Wallet</Label>
              <Select value={fromWalletId} onValueChange={setFromWalletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.currency} (Balance: {wallet.balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>To Wallet</Label>
              <Select value={toWalletId} onValueChange={setToWalletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets
                    .filter(w => w.id !== fromWalletId)
                    .map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.currency} (Balance: {wallet.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Amount to Exchange</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                step="0.01"
                min="0"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>

            <div>
              <Label>Amount to Receive</Label>
              <Input
                type="number"
                value={toAmount}
                readOnly
                placeholder="Calculated amount"
                className="bg-muted"
              />
            </div>
          </div>

          {fromWallet && toWallet && exchangeRate > 0 && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="font-medium">{fromWallet.currency}</span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium">{toWallet.currency}</span>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Exchange Rate: 1 {fromWallet.currency} = {exchangeRate} {toWallet.currency}
              </div>
            </div>
          )}

          {fromWallet && exchangeAmount > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Exchange Amount:</span>
                <span>{fromWallet.currency} {exchangeAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Exchange Fee ({feeDetails.percentage}%):</span>
                <span className="text-red-600">{fromWallet.currency} {feeDetails.totalFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Amount After Fee:</span>
                <span>{fromWallet.currency} {(exchangeAmount - feeDetails.totalFee).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>You Will Receive:</span>
                <span className="text-green-600">{toWallet?.currency} {toAmount}</span>
              </div>
            </div>
          )}

          {fromWallet && totalDeduction > fromWallet.balance && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insufficient balance. You need {fromWallet.currency} {totalDeduction.toLocaleString()} but only have {fromWallet.currency} {fromWallet.balance.toLocaleString()}.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleInitiateExchange} 
            className="w-full"
            disabled={
              loading || 
              !fromWalletId || 
              !toWalletId || 
              !exchangeAmount || 
              !toAmount ||
              (fromWallet && totalDeduction > fromWallet.balance)
            }
          >
            {loading ? 'Processing...' : 'Exchange Currency'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Currency Exchange</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please verify all details before confirming the exchange.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Exchange Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">From:</span>
                <span>{fromWallet?.currency} {exchangeAmount.toLocaleString()}</span>
                
                <span className="text-muted-foreground">To:</span>
                <span>{toWallet?.currency} {toAmount}</span>
                
                <span className="text-muted-foreground">Exchange Rate:</span>
                <span>1 {fromWallet?.currency} = {exchangeRate} {toWallet?.currency}</span>
                
                <span className="text-muted-foreground">Fee:</span>
                <span className="text-red-600">{fromWallet?.currency} {feeDetails.totalFee.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmExchange}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Confirm Exchange'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedWalletExchangeForm;
