import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Smartphone, CreditCard, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useRelWorxPayment } from '@/hooks/useRelWorxPayment';
import PaymentStatusTracker from './PaymentStatusTracker';
import { toast } from 'sonner';

interface EnhancedMobileMoneyFlowProps {
  amount: number;
  currency: 'UGX' | 'KES' | 'TZS';
  transactionType: 'deposit' | 'withdraw';
  onSuccess: () => void;
  onCancel: () => void;
}

type FlowStep = 'input' | 'processing' | 'status';

const EnhancedMobileMoneyFlow: React.FC<EnhancedMobileMoneyFlowProps> = ({
  amount,
  currency,
  transactionType,
  onSuccess,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState<'mtn' | 'airtel' | 'mpesa' | 'tigo' | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  
  const { loading, processMobileMoneyPayment } = useRelWorxPayment();

  // Auto-detect network from phone number based on currency
  const detectNetwork = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    
    // Uganda (UGX)
    if (currency === 'UGX') {
      if (cleaned.match(/^(256)?(77|78|76|39)/)) return 'mtn';
      if (cleaned.match(/^(256)?(70|75|74|20)/)) return 'airtel';
    }
    
    // Kenya (KES)
    if (currency === 'KES') {
      if (cleaned.match(/^(254)?(7[0-9]|1[0-9])/)) return 'mpesa';
      if (cleaned.match(/^(254)?(7[3-5])/)) return 'airtel';
    }
    
    // Tanzania (TZS)
    if (currency === 'TZS') {
      if (cleaned.match(/^(255)?(7[1-9]|6[1-9])/)) return 'mpesa';
      if (cleaned.match(/^(255)?(7[5-8]|6[8-9])/)) return 'airtel';
    }
    
    return null;
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    const detectedNetwork = detectNetwork(value);
    setNetwork(detectedNetwork);
  };

  const handlePayment = async () => {
    if (!phoneNumber || !network) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setCurrentStep('processing');

    try {
      const result = await processMobileMoneyPayment({
        amount,
        currency,
        phone: phoneNumber,
        network,
        transactionType,
        description: `${transactionType} ${amount} ${currency} via ${network.toUpperCase()} Mobile Money`
      });

      if (result.success && result.data?.transaction_id) {
        setTransactionId(result.data.transaction_id);
        setCurrentStep('status');
      } else {
        setCurrentStep('input');
        toast.error(result.error || 'Payment failed');
      }
    } catch (error) {
      setCurrentStep('input');
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    }
  };

  const getNetworkColor = (networkType: string) => {
    switch (networkType) {
      case 'mtn':
        return 'bg-yellow-500 text-white';
      case 'airtel':
        return 'bg-red-500 text-white';
      case 'mpesa':
        return 'bg-green-600 text-white';
      case 'tigo':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTransactionFee = () => {
    // Simplified fee calculation based on currency
    const basePercentage = transactionType === 'deposit' ? 0.01 : 0.015;
    const minimumFees = {
      'UGX': transactionType === 'deposit' ? 500 : 1000,
      'KES': transactionType === 'deposit' ? 5 : 10,
      'TZS': transactionType === 'deposit' ? 500 : 1000
    };
    
    return Math.max(amount * basePercentage, minimumFees[currency]);
  };

  const renderInputStep = () => (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mobile Money {transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {transactionType === 'deposit' ? 'Add funds to' : 'Withdraw funds from'} your wallet using mobile money
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-bold text-lg">{amount.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Transaction Fee</span>
            <span className="text-sm">{getTransactionFee().toLocaleString()} {currency}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center">
            <span className="font-medium">Total</span>
            <span className="font-bold">
              {transactionType === 'deposit' 
                ? (amount + getTransactionFee()).toLocaleString() 
                : amount.toLocaleString()
              } {currency}
            </span>
          </div>
        </div>

        {/* Phone Number Input */}
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile Money Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder={currency === 'UGX' ? '+256 77X XXX XXX' : currency === 'KES' ? '+254 7XX XXX XXX' : '+255 7XX XXX XXX'}
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
          />
          {network && (
            <div className="flex items-center gap-2">
              <Badge className={`${getNetworkColor(network)} text-xs`}>
                {network.toUpperCase()} Mobile Money
              </Badge>
              <span className="text-xs text-muted-foreground">
                Network detected automatically
              </span>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">How it works:</p>
              <ol className="text-xs text-blue-700 space-y-1">
                <li>1. Enter your mobile money number</li>
                <li>2. You'll receive an STK push or USSD prompt</li>
                <li>3. Enter your mobile money PIN to approve</li>
                <li>4. Your wallet will be updated automatically</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Warning for withdrawals */}
        {transactionType === 'withdraw' && (
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Withdrawal Notice</p>
                <p className="text-xs text-yellow-700 mt-1">
                  The amount will be deducted from your wallet immediately. 
                  If the mobile money transfer fails, the amount will be refunded.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={!phoneNumber || !network || loading}
            className="flex-1"
          >
            {loading ? 'Processing...' : `Proceed with ${transactionType}`}
          </Button>
        </div>
      </CardContent>
    </>
  );

  const renderStatusStep = () => (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Payment Initiated
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tracking your mobile money transaction
        </p>
      </CardHeader>
      <CardContent>
        {transactionId && (
          <PaymentStatusTracker
            transactionId={transactionId}
            onComplete={onSuccess}
            onFailed={() => setCurrentStep('input')}
          />
        )}
      </CardContent>
    </>
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      {currentStep === 'input' && renderInputStep()}
      {currentStep === 'status' && renderStatusStep()}
    </Card>
  );
};

export default EnhancedMobileMoneyFlow;