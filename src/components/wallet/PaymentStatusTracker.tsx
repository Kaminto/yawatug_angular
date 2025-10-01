import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, XCircle, RefreshCw, Smartphone, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentStatusTrackerProps {
  transactionId: string;
  onComplete?: () => void;
  onFailed?: () => void;
}

interface TransactionDetails {
  id: string;
  status: string; // Allow any status string from database
  amount: number;
  currency: string;
  transaction_type: string;
  payment_gateway: string;
  gateway_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

interface GatewayTransaction {
  id: string;
  status: string;
  payment_method: string;
  gateway_response: any;
  webhook_data?: any;
  created_at: string;
  updated_at: string;
}

const PaymentStatusTracker: React.FC<PaymentStatusTrackerProps> = ({
  transactionId,
  onComplete,
  onFailed
}) => {
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [gatewayTransaction, setGatewayTransaction] = useState<GatewayTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadTransactionDetails();
    const interval = setInterval(loadTransactionDetails, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [transactionId]);

  useEffect(() => {
    if (transaction) {
      // Update progress based on status
      switch (transaction.status) {
        case 'pending':
          setProgress(25);
          break;
        case 'processing':
          setProgress(50);
          break;
        case 'completed':
          setProgress(100);
          onComplete?.();
          break;
        case 'failed':
          setProgress(0);
          onFailed?.();
          break;
      }
    }
  }, [transaction?.status]);

  const loadTransactionDetails = async () => {
    try {
      setRefreshing(true);
      
      // Load main transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (transactionError) throw transactionError;
      setTransaction(transactionData);

      // Load gateway transaction if available
      if (transactionData.gateway_transaction_id) {
        const { data: gatewayData, error: gatewayError } = await supabase
          .from('payment_gateway_transactions')
          .select('*')
          .eq('internal_transaction_id', transactionId)
          .maybeSingle();

        if (!gatewayError && gatewayData) {
          setGatewayTransaction(gatewayData);
        }
      }
    } catch (error) {
      console.error('Error loading transaction details:', error);
      toast.error('Failed to load payment status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusMessage = () => {
    if (!transaction) return 'Loading...';

    switch (transaction.status) {
      case 'pending':
        return transaction.transaction_type === 'deposit' 
          ? 'Waiting for payment approval on your mobile device'
          : 'Payment request is being prepared';
      case 'processing':
        return 'Processing your payment with the mobile money provider';
      case 'completed':
        return transaction.transaction_type === 'deposit'
          ? 'Payment received and wallet updated successfully'
          : 'Payment sent to your mobile money account';
      case 'failed':
        return 'Payment was declined or failed to process';
      default:
        return 'Unknown status';
    }
  };

  const getPaymentMethodIcon = () => {
    if (!gatewayTransaction) return <CreditCard className="h-4 w-4" />;
    
    if (gatewayTransaction.payment_method?.includes('mobile_money')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <CreditCard className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading payment status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transaction) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-medium mb-2">Transaction Not Found</h3>
            <p className="text-sm text-muted-foreground">
              Unable to load transaction details. Please try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getPaymentMethodIcon()}
          Payment Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transaction Summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-medium">
              {transaction.amount.toLocaleString()} {transaction.currency}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Type</span>
            <span className="font-medium capitalize">{transaction.transaction_type}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Gateway</span>
            <span className="font-medium capitalize">{transaction.payment_gateway || 'RelWorx'}</span>
          </div>
        </div>

        {/* Status Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            {getStatusBadge(transaction.status)}
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {getStatusIcon(transaction.status)}
            <span>{getStatusMessage()}</span>
          </div>
        </div>

        {/* Mobile Money Instructions */}
        {transaction.status === 'pending' && transaction.transaction_type === 'deposit' && (
          <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
            <div className="flex items-start gap-2">
              <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Check Your Phone</p>
                <p className="text-xs text-blue-700 mt-1">
                  You should receive an STK push or USSD prompt on your mobile device. 
                  Enter your PIN to complete the payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gateway Details */}
        {gatewayTransaction && (
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono">
                {transaction.gateway_transaction_id?.slice(0, 12)}...
              </span>
            </div>
            {gatewayTransaction.payment_method && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Method</span>
                <Badge variant="outline" className="text-xs">
                  {gatewayTransaction.payment_method}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactionDetails}
            disabled={refreshing}
            className="flex-1"
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          
          {transaction.status === 'failed' && (
            <Button size="sm" className="flex-1">
              Try Again
            </Button>
          )}
          
          {transaction.status === 'completed' && (
            <Button size="sm" className="flex-1" onClick={onComplete}>
              Done
            </Button>
          )}
        </div>

        {/* Transaction Times */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
          <div className="flex justify-between">
            <span>Started</span>
            <span>{new Date(transaction.created_at).toLocaleTimeString()}</span>
          </div>
          {transaction.updated_at !== transaction.created_at && (
            <div className="flex justify-between">
              <span>Last Updated</span>
              <span>{new Date(transaction.updated_at).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentStatusTracker;