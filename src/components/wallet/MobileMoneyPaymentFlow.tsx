import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, Clock, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminPaymentConfigurations } from '@/hooks/useAdminPaymentConfigurations';
import { toast } from 'sonner';

interface MobileMoneyPaymentFlowProps {
  amount: number;
  currency: 'UGX';
  transactionType: 'deposit' | 'withdraw';
  onSuccess: () => void;
  onCancel: () => void;
}

interface PaymentStatus {
  status: 'idle' | 'validating' | 'processing' | 'completed' | 'failed';
  message: string;
  transactionId?: string;
  gatewayReference?: string;
}

const MobileMoneyPaymentFlow: React.FC<MobileMoneyPaymentFlowProps> = ({
  amount,
  currency,
  transactionType,
  onSuccess,
  onCancel
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [merchantCode, setMerchantCode] = useState('');
  const [network, setNetwork] = useState<'mtn' | 'airtel' | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'idle',
    message: ''
  });

  const { configurations } = useAdminPaymentConfigurations();

  // Get available merchant codes based on current filters
  const getAvailableMerchantCodes = () => {
    if (!configurations?.merchantCodes) return [];
    
    return configurations.merchantCodes
      .filter(mc => mc.currency === currency && mc.is_active)
      .filter(mc => {
        if (!network) return true; // Show all if no network detected yet
        return (network === 'mtn' && mc.provider_name.toLowerCase().includes('mtn')) ||
               (network === 'airtel' && mc.provider_name.toLowerCase().includes('airtel'));
      });
  };

  // Auto-detect network from phone number
  const detectNetwork = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.match(/^(256)?(77|78|76)/)) return 'mtn';
    if (cleaned.match(/^(256)?(70|75|74)/)) return 'airtel';
    return null;
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    const detectedNetwork = detectNetwork(value);
    setNetwork(detectedNetwork);
  };

  const validatePhoneNumber = async () => {
    if (!phoneNumber) {
      toast.error('Please enter your phone number');
      return false;
    }

    setPaymentStatus({ status: 'validating', message: 'Validating phone number...' });

    try {
      const { data, error } = await supabase.rpc('validate_ugandan_phone', {
        phone_text: phoneNumber
      });

      if (error) throw error;

      const validationResult = data as { is_valid: boolean; network: string; formatted_phone: string };

      if (!validationResult?.is_valid) {
        setPaymentStatus({ status: 'failed', message: 'Invalid phone number format' });
        toast.error('Please enter a valid Ugandan phone number');
        return false;
      }

      if (validationResult.network === 'unknown') {
        setPaymentStatus({ status: 'failed', message: 'Unsupported mobile network' });
        toast.error('Phone number must be MTN or Airtel');
        return false;
      }

      setNetwork(validationResult.network as 'mtn' | 'airtel');
      return true;
    } catch (error) {
      console.error('Phone validation error:', error);
      setPaymentStatus({ status: 'failed', message: 'Phone validation failed' });
      toast.error('Failed to validate phone number');
      return false;
    }
  };

  const initiatePayment = async () => {
    const isValid = await validatePhoneNumber();
    if (!isValid) return;

    setPaymentStatus({ status: 'processing', message: 'Initiating payment...' });

    try {
      const { data, error } = await supabase.functions.invoke('process-mobile-money-payment', {
        body: {
          amount,
          currency,
          phone: phoneNumber,
          network,
          transaction_type: transactionType,
          merchant_code: merchantCode,
          merchant_transaction_id: transactionId,
          description: `${transactionType} ${amount} ${currency} via ${network?.toUpperCase()} Mobile Money`
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      setPaymentStatus({
        status: 'processing',
        message: `Payment request sent to ${phoneNumber}. Please check your phone for the approval prompt.`,
        transactionId: data.transaction_id,
        gatewayReference: data.gateway_transaction_id
      });

      toast.success('Payment request sent! Check your phone.');

      // Start polling for payment status
      startStatusPolling(data.transaction_id);

    } catch (error) {
      console.error('Payment initiation error:', error);
      setPaymentStatus({
        status: 'failed',
        message: error.message || 'Failed to initiate payment'
      });
      toast.error('Payment initiation failed');
    }
  };

  const startStatusPolling = (transactionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('status')
          .eq('id', transactionId)
          .single();

        if (error) throw error;

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          setPaymentStatus({
            status: 'completed',
            message: 'Payment completed successfully!'
          });
          toast.success('Payment completed!');
          setTimeout(() => onSuccess(), 2000);
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setPaymentStatus({
            status: 'failed',
            message: 'Payment was declined or failed'
          });
          toast.error('Payment failed');
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus.status === 'processing') {
        setPaymentStatus({
          status: 'failed',
          message: 'Payment timeout. Please try again.'
        });
      }
    }, 300000);
  };

  const getStatusIcon = () => {
    switch (paymentStatus.status) {
      case 'validating':
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Smartphone className="h-6 w-6 text-gray-500" />;
    }
  };

  const getNetworkColor = (networkType: string) => {
    switch (networkType) {
      case 'mtn':
        return 'bg-yellow-500 text-white';
      case 'airtel':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mobile Money Payment
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {transactionType === 'deposit' ? 'Add' : 'Withdraw'} {amount.toLocaleString()} {currency}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentStatus.status === 'idle' && (
          <>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+256 77X XXX XXX"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="mt-1"
              />
              {network && (
                <div className="mt-2">
                  <Badge className={`${getNetworkColor(network)} text-xs`}>
                    {network.toUpperCase()} Mobile Money
                  </Badge>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="merchantCode">Merchant Code</Label>
              <Select value={merchantCode} onValueChange={setMerchantCode}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    !configurations?.merchantCodes?.length 
                      ? "Loading merchant codes..." 
                      : getAvailableMerchantCodes().length === 0
                        ? `No merchant codes available for ${network?.toUpperCase() || 'detected network'}`
                        : "Select merchant code"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableMerchantCodes().map(mc => (
                    <SelectItem key={mc.id} value={mc.merchant_code}>
                      {mc.merchant_code} - {mc.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getAvailableMerchantCodes().length === 0 && configurations?.merchantCodes?.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {!network 
                    ? "Enter a phone number to see available merchant codes"
                    : `No merchant codes configured for ${network.toUpperCase()} network. Contact support.`
                  }
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="transactionId">Transaction ID</Label>
              <Input
                id="transactionId"
                type="text"
                placeholder="Enter merchant transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">How it works:</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Enter your mobile money number</li>
                <li>2. We'll send a payment request to your phone</li>
                <li>3. Approve the transaction using your PIN</li>
                <li>4. Your wallet will be updated automatically</li>
              </ol>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={initiatePayment} 
                disabled={!phoneNumber || !network || !merchantCode || !transactionId}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {paymentStatus.status !== 'idle' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              {getStatusIcon()}
              <div className="flex-1">
                <p className="font-medium">
                  {paymentStatus.status === 'validating' && 'Validating...'}
                  {paymentStatus.status === 'processing' && 'Processing Payment'}
                  {paymentStatus.status === 'completed' && 'Payment Successful'}
                  {paymentStatus.status === 'failed' && 'Payment Failed'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {paymentStatus.message}
                </p>
              </div>
            </div>

            {paymentStatus.status === 'processing' && (
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400">
                <p className="text-sm text-blue-800">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Waiting for approval on {phoneNumber}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Check your phone for the payment prompt and enter your PIN to complete the transaction.
                </p>
              </div>
            )}

            {(paymentStatus.status === 'completed' || paymentStatus.status === 'failed') && (
              <div className="flex space-x-2">
                {paymentStatus.status === 'failed' && (
                  <Button 
                    variant="outline" 
                    onClick={() => setPaymentStatus({ status: 'idle', message: '' })}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                )}
                <Button onClick={onCancel} className="flex-1">
                  {paymentStatus.status === 'completed' ? 'Done' : 'Close'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MobileMoneyPaymentFlow;