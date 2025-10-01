import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StripeCardPaymentFlowProps {
  amount: number;
  currency: 'USD';
  transactionType: 'deposit';
  onSuccess: () => void;
  onCancel: () => void;
}

interface PaymentStatus {
  status: 'idle' | 'creating' | 'confirming' | 'completed' | 'failed';
  message: string;
  paymentIntentId?: string;
  clientSecret?: string;
}

const StripeCardPaymentFlow: React.FC<StripeCardPaymentFlowProps> = ({
  amount,
  currency,
  transactionType,
  onSuccess,
  onCancel
}) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'idle',
    message: ''
  });

  const initiateStripePayment = async () => {
    setPaymentStatus({ status: 'creating', message: 'Creating payment session...' });

    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-payment', {
        body: {
          amount,
          currency,
          transaction_type: transactionType,
          description: `Deposit ${amount} ${currency} to wallet`
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Payment creation failed');
      }

      setPaymentStatus({
        status: 'confirming',
        message: 'Redirecting to secure payment...',
        paymentIntentId: data.payment_intent_id,
        clientSecret: data.client_secret
      });

      // Create Stripe Checkout session for better UX
      const checkoutData = await createStripeCheckoutSession(data.payment_intent_id);
      
      if (checkoutData.url) {
        // Open Stripe checkout in new tab
        window.open(checkoutData.url, '_blank');
        
        // Start polling for payment completion
        startPaymentPolling(data.payment_intent_id);
      }

    } catch (error) {
      console.error('Stripe payment creation error:', error);
      setPaymentStatus({
        status: 'failed',
        message: error.message || 'Failed to create payment session'
      });
      toast.error('Payment creation failed');
    }
  };

  const createStripeCheckoutSession = async (paymentIntentId: string) => {
    // This would typically create a Stripe Checkout session
    // For now, we'll simulate the flow
    return {
      url: `https://checkout.stripe.com/pay/${paymentIntentId}#fidkdWxOYHwnPyd1blpxYHZxWjA0TDI2XVdnZUNrUzJHV1dnbX05bz1SNUI2XVRrXTRHNj1xN2xHSkQzSH1xa0s8PVBdQ29Dd2BGfD1OdGhxYGt8aUlWZWZUfEZOZWYneCUl`
    };
  };

  const startPaymentPolling = (paymentIntentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('payment_gateway_transactions')
          .select('status, internal_transaction_id')
          .eq('gateway_transaction_id', paymentIntentId)
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
        console.error('Payment polling error:', error);
      }
    }, 3000);

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus.status === 'confirming') {
        setPaymentStatus({
          status: 'failed',
          message: 'Payment timeout. Please try again.'
        });
      }
    }, 600000);
  };

  const getStatusIcon = () => {
    switch (paymentStatus.status) {
      case 'creating':
      case 'confirming':
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <CreditCard className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Card Payment
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Deposit ${amount} {currency}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentStatus.status === 'idle' && (
          <>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">Secure Card Payment</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Processed securely by Stripe</li>
                <li>• Supports Visa, Mastercard, Amex</li>
                <li>• PCI DSS compliant</li>
                <li>• Instant wallet credit</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-600">🔒</div>
              <p className="text-sm text-green-800">
                Your payment is secured with 256-bit SSL encryption
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Accepted Cards:</p>
              <div className="flex gap-2">
                <Badge variant="outline">Visa</Badge>
                <Badge variant="outline">Mastercard</Badge>
                <Badge variant="outline">American Express</Badge>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button onClick={initiateStripePayment} className="flex-1">
                Pay ${amount}
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
                  {paymentStatus.status === 'creating' && 'Creating Payment...'}
                  {paymentStatus.status === 'confirming' && 'Complete Payment'}
                  {paymentStatus.status === 'completed' && 'Payment Successful'}
                  {paymentStatus.status === 'failed' && 'Payment Failed'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {paymentStatus.message}
                </p>
              </div>
            </div>

            {paymentStatus.status === 'confirming' && (
              <div className="p-4 bg-blue-50 border-l-4 border-blue-400">
                <p className="text-sm text-blue-800">
                  Complete your payment in the new tab that opened.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  This window will automatically update when payment is complete.
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

export default StripeCardPaymentFlow;