import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Target, Clock, CreditCard, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { useProgressiveOwnership } from '@/hooks/useProgressiveOwnership';
import { useSmartPayment, type PaymentMethod } from '@/hooks/useSmartPayment';
import { toast } from 'sonner';

interface BookingPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  userWallets: any[];
  onPaymentSuccess: () => void;
  userId: string;
}

const BookingPaymentModal: React.FC<BookingPaymentModalProps> = ({
  isOpen,
  onClose,
  booking,
  userWallets,
  onPaymentSuccess,
  userId
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const { loading, processBookingPayment } = useProgressiveOwnership();
  const { loading: smartPayLoading, findBestPaymentMethod, processExchangeAndPayment } = useSmartPayment();

  const remainingBalance = booking?.remaining_amount || 0;
  const paymentPercentage = booking?.payment_percentage || 0;
  const totalShares = booking?.quantity || 0;
  
  // Calculate shares based on payment percentage
  const paidShares = Math.floor((paymentPercentage / 100) * totalShares);
  const pendingShares = totalShares - paidShares;

  // Use smart payment to find best payment method with debouncing
  useEffect(() => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0 || !userId) {
      setPaymentMethod(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      const amount = parseFloat(paymentAmount);
      findBestPaymentMethod(userId, amount, 'UGX')
        .then(method => setPaymentMethod(method))
        .catch(error => {
          console.error('Error finding payment method:', error);
          setPaymentMethod(null);
        });
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [paymentAmount, userId]);

  const maxPayment = remainingBalance;

  const handlePayment = async () => {
    if (!paymentAmount || !booking || !paymentMethod) {
      toast.error('Please enter payment amount and ensure you have sufficient funds');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > maxPayment) {
      toast.error(`Payment amount must be between 1 and ${maxPayment.toLocaleString()}`);
      return;
    }

    try {
      console.log('Payment Method Debug:', {
        needsExchange: paymentMethod.needsExchange,
        paymentMethod: paymentMethod,
        amount: amount
      });

      // If exchange is needed, process it first
      if (paymentMethod.needsExchange) {
        console.log('Processing exchange:', {
          from: paymentMethod.sourceWallet!.currency,
          to: paymentMethod.targetWallet!.currency,
          exchangeAmount: paymentMethod.exchangeAmount!,
          rate: paymentMethod.exchangeRate!
        });
        
        const exchangeResult = await processExchangeAndPayment(
          paymentMethod.sourceWallet!,
          paymentMethod.targetWallet!,
          paymentMethod.exchangeAmount!,
          paymentMethod.exchangeRate!
        );

        if (!exchangeResult.success) {
          toast.error('Currency exchange failed');
          return;
        }
        
        console.log('Exchange completed successfully, updated wallet balance:', exchangeResult.updatedTargetWallet?.balance);
        
        // Wait a moment for database consistency
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('Processing booking payment with amount:', amount);
      // Process the booking payment
      const result = await processBookingPayment(
        booking.id,
        amount,
        userId
      );

      if (result.success) {
        onPaymentSuccess();
        onClose();
        setPaymentAmount('');
        setPaymentMethod(null);
      }
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  const calculateSharesToUnlock = () => {
    if (!paymentAmount || !booking) return 0;
    const amount = parseFloat(paymentAmount);
    const newPaymentPercentage = ((booking.cumulative_payments + amount) / booking.total_amount) * 100;
    const newSharesOwned = Math.floor((newPaymentPercentage / 100) * booking.quantity);
    return Math.max(0, newSharesOwned - paidShares);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Make Booking Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Progress */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Payment Progress</span>
                  <span className="font-medium">{paymentPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={paymentPercentage} className="h-2" />
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-green-600" />
                    <span>Paid: {paidShares.toLocaleString()} shares</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-orange-600" />
                    <span>Pending: {pendingShares.toLocaleString()} shares</span>
                  </div>
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">Remaining: </span>
                  <span className="font-medium">UGX {remainingBalance.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Payment Method Display */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Smart Payment Method</span>
                </div>
          {paymentMethod ? (
            <div className="space-y-2 text-sm">
              {paymentMethod.needsExchange ? (
                <>
                  <div className="flex items-center gap-2 text-orange-700">
                    <ArrowRightLeft className="h-3 w-3" />
                    <span>Currency exchange required</span>
                  </div>
                  <div className="pl-5 space-y-1 text-xs">
                    <div>Source: {paymentMethod.sourceWallet!.currency} Wallet (Balance: {paymentMethod.sourceWallet!.balance.toLocaleString()})</div>
                    <div>Exchange: {paymentMethod.exchangeAmount!.toLocaleString()} {paymentMethod.sourceWallet!.currency} → UGX</div>
                    <div>Target: UGX Wallet</div>
                  </div>
                </>
              ) : paymentMethod.wallet ? (
                <>
                  <div className="flex items-center gap-2 text-green-700">
                    <Wallet className="h-3 w-3" />
                    <span>Direct payment from UGX wallet</span>
                  </div>
                  <div className="pl-5 text-xs">
                    Balance: UGX {paymentMethod.wallet.balance.toLocaleString()}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-sm">{paymentMethod.error}</span>
                </div>
              )}
            </div>
          ) : paymentAmount && parseFloat(paymentAmount) > 0 ? (
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-3 w-3" />
                    <span className="text-sm">Insufficient funds in all wallets</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Enter payment amount to see available payment options
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount (UGX)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount..."
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              max={maxPayment}
              min="1"
            />
            <p className="text-xs text-muted-foreground">
              Maximum payment: UGX {maxPayment.toLocaleString()}
            </p>
          </div>

          {/* Payment Preview */}
          {paymentAmount && parseFloat(paymentAmount) > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Payment Amount:</span>
                    <span className="font-medium">UGX {parseFloat(paymentAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shares to Unlock:</span>
                    <span className="font-medium text-green-600">{calculateSharesToUnlock().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Balance:</span>
                    <span className="font-medium">UGX {(remainingBalance - parseFloat(paymentAmount)).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handlePayment} 
              disabled={loading || smartPayLoading || !paymentMethod || !paymentMethod.wallet || !paymentAmount || parseFloat(paymentAmount) <= 0}
              className="flex-1"
            >
              {(loading || smartPayLoading) ? 'Processing...' : 'Make Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingPaymentModal;