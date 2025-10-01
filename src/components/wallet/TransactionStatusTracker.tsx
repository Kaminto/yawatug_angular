
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionStatusTrackerProps {
  transaction: {
    id: string;
    type: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    method: string;
    reference: string;
    created_at: string;
    estimated_completion?: string;
    fee?: number;
  };
  onClose: () => void;
}

const TransactionStatusTracker: React.FC<TransactionStatusTrackerProps> = ({
  transaction,
  onClose
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: 'bg-green-500',
      processing: 'bg-blue-500',
      pending: 'bg-yellow-500',
      failed: 'bg-red-500'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusMessage = () => {
    switch (transaction.status) {
      case 'pending':
        if (transaction.method === 'mobile_money') {
          return 'Please check your phone for the payment prompt and approve the transaction.';
        } else if (transaction.method === 'bank_transfer' && transaction.type === 'deposit') {
          return 'Please transfer the funds to the provided bank account and upload proof if required.';
        } else if (transaction.method === 'crypto') {
          return 'Waiting for blockchain confirmations. This usually takes 5-10 minutes.';
        }
        return 'Your transaction is being processed.';
      
      case 'processing':
        return 'Your transaction is being processed by our system.';
      
      case 'completed':
        return 'Your transaction has been completed successfully!';
      
      case 'failed':
        return 'Your transaction failed. Please try again or contact support.';
      
      default:
        return 'Transaction status unknown.';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(transaction.status)}
          Transaction Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} {' '}
              {transaction.amount.toLocaleString()} {transaction.currency}
            </p>
            <p className="text-sm text-muted-foreground">
              via {transaction.method.replace('_', ' ')}
            </p>
          </div>
          {getStatusBadge(transaction.status)}
        </div>

        {/* Transaction Details */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Reference ID</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{transaction.reference}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(transaction.reference)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm">
              {new Date(transaction.created_at).toLocaleString()}
            </span>
          </div>

          {transaction.fee && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Transaction Fee</span>
              <span className="text-sm">
                {transaction.fee.toLocaleString()} {transaction.currency}
              </span>
            </div>
          )}

          {transaction.estimated_completion && transaction.status !== 'completed' && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Estimated Completion</span>
              <span className="text-sm">
                {new Date(transaction.estimated_completion).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm">{getStatusMessage()}</p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Progress</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Transaction initiated</span>
            </div>
            
            <div className="flex items-center gap-2">
              {['processing', 'completed'].includes(transaction.status) ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : transaction.status === 'failed' ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm">Payment verification</span>
            </div>
            
            <div className="flex items-center gap-2">
              {transaction.status === 'completed' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm">Wallet update</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          {transaction.status === 'failed' && (
            <Button variant="outline">
              Try Again
            </Button>
          )}
          <Button onClick={onClose}>
            {transaction.status === 'completed' ? 'Done' : 'Close'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionStatusTracker;
