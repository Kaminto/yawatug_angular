import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Clock, 
  DollarSign, 
  ArrowRight, 
  AlertCircle,
  CheckCircle,
  Fingerprint,
  Smartphone
} from 'lucide-react';

interface TransactionData {
  type: 'deposit' | 'withdraw' | 'transfer' | 'exchange';
  amount: number;
  currency: string;
  recipient?: string;
  description?: string;
  fee?: number;
  exchangeRate?: number;
  fromCurrency?: string;
  toCurrency?: string;
}

interface TransactionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin?: string) => Promise<void>;
  transaction: TransactionData | null;
  loading?: boolean;
}

const TransactionConfirmationModal: React.FC<TransactionConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  loading = false
}) => {
  const [step, setStep] = useState<'review' | 'pin' | 'biometric' | 'processing'>('review');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [authMethod, setAuthMethod] = useState<'pin' | 'biometric'>('pin');

  const getTransactionIcon = () => {
    if (!transaction) return <DollarSign className="h-6 w-6" />;
    switch (transaction.type) {
      case 'deposit': return <DollarSign className="h-6 w-6 text-green-500" />;
      case 'withdraw': return <ArrowRight className="h-6 w-6 text-orange-500" />;
      case 'transfer': return <ArrowRight className="h-6 w-6 text-blue-500" />;
      case 'exchange': return <ArrowRight className="h-6 w-6 text-purple-500" />;
      default: return <DollarSign className="h-6 w-6" />;
    }
  };

  const getTransactionTitle = () => {
    if (!transaction) return 'Confirm Transaction';
    switch (transaction.type) {
      case 'deposit': return 'Confirm Deposit';
      case 'withdraw': return 'Confirm Withdrawal';
      case 'transfer': return 'Confirm Transfer';
      case 'exchange': return 'Confirm Exchange';
      default: return 'Confirm Transaction';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      setPinError('PIN must be 4 digits');
      return;
    }
    
    setStep('processing');
    try {
      await onConfirm(pin);
    } catch (error) {
      setPinError('Invalid PIN. Please try again.');
      setStep('pin');
      setPin('');
    }
  };

  const handleBiometricAuth = async () => {
    setStep('processing');
    try {
      // Simulate biometric authentication
      await new Promise(resolve => setTimeout(resolve, 2000));
      await onConfirm();
    } catch (error) {
      setStep('biometric');
    }
  };

  const proceedToAuth = () => {
    setStep(authMethod);
  };

  // Don't render if no transaction
  if (!transaction) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTransactionIcon()}
            {getTransactionTitle()}
          </DialogTitle>
        </DialogHeader>

        {step === 'review' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-lg">
                    {formatAmount(transaction.amount, transaction.currency)}
                  </span>
                </div>
                
                {transaction.fee && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Fee</span>
                    <span>{formatAmount(transaction.fee, transaction.currency)}</span>
                  </div>
                )}
                
                {transaction.exchangeRate && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Exchange Rate</span>
                    <span>1 {transaction.fromCurrency} = {transaction.exchangeRate} {transaction.toCurrency}</span>
                  </div>
                )}
                
                {transaction.recipient && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Recipient</span>
                    <span className="truncate max-w-[150px]">{transaction.recipient}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-sm border-t pt-3">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">
                    {formatAmount(
                      transaction.amount + (transaction.fee || 0), 
                      transaction.currency
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please review the transaction details carefully. This action cannot be undone.
              </AlertDescription>
            </Alert>

            {/* Authentication Method Selection */}
            <div className="space-y-3">
              <Label>Choose authentication method:</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={authMethod === 'pin' ? 'default' : 'outline'}
                  onClick={() => setAuthMethod('pin')}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  PIN
                </Button>
                <Button
                  variant={authMethod === 'biometric' ? 'default' : 'outline'}
                  onClick={() => setAuthMethod('biometric')}
                  className="flex items-center gap-2"
                >
                  <Fingerprint className="h-4 w-4" />
                  Biometric
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={proceedToAuth} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'pin' && (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold">Enter Transaction PIN</h3>
              <p className="text-sm text-muted-foreground">
                Enter your 4-digit PIN to confirm this transaction
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">Transaction PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(value);
                  setPinError('');
                }}
                maxLength={4}
                className="text-center text-lg tracking-widest"
              />
              {pinError && (
                <p className="text-sm text-destructive">{pinError}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handlePinSubmit} 
                disabled={pin.length !== 4}
                className="flex-1"
              >
                Confirm
              </Button>
            </div>
          </div>
        )}

        {step === 'biometric' && (
          <div className="space-y-4">
            <div className="text-center">
              <Fingerprint className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
              <h3 className="font-semibold">Biometric Authentication</h3>
              <p className="text-sm text-muted-foreground">
                Place your finger on the sensor or look at the camera
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('review')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleBiometricAuth} className="flex-1">
                Authenticate
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="space-y-4 text-center py-8">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <h3 className="font-semibold">Processing Transaction</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we process your transaction...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionConfirmationModal;