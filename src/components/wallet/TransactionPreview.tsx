
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';

interface TransactionPreviewProps {
  transactionType: 'deposit' | 'withdrawal' | 'funds_transfer' | 'share_transfer' | 'exchange';
  amount: number;
  currency: string;
  feeDetails: {
    totalFee: number;
    percentageFee: number;
    flatFee: number;
    percentage: number;
  };
  recipientInfo?: {
    name: string;
    email: string;
  };
  paymentMethod?: string;
  paymentDetails?: any;
}

const TransactionPreview: React.FC<TransactionPreviewProps> = ({
  transactionType,
  amount,
  currency,
  feeDetails,
  recipientInfo,
  paymentMethod,
  paymentDetails
}) => {
  const getTransactionIcon = () => {
    switch (transactionType) {
      case 'deposit':
        return <ArrowDownLeft className="h-5 w-5 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-5 w-5 text-red-600" />;
      case 'funds_transfer':
        return <ArrowRightLeft className="h-5 w-5 text-blue-600" />;
      case 'share_transfer':
        return <ArrowRightLeft className="h-5 w-5 text-purple-600" />;
      case 'exchange':
        return <RefreshCw className="h-5 w-5 text-orange-600" />;
      default:
        return <ArrowRightLeft className="h-5 w-5" />;
    }
  };

  const getTransactionTitle = () => {
    switch (transactionType) {
      case 'deposit':
        return 'Deposit Preview';
      case 'withdrawal':
        return 'Withdrawal Preview';
      case 'funds_transfer':
        return 'Transfer Preview';
      case 'share_transfer':
        return 'Share Transfer Preview';
      case 'exchange':
        return 'Exchange Preview';
      default:
        return 'Transaction Preview';
    }
  };

  const totalAmount = amount + feeDetails.totalFee;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          {getTransactionIcon()}
          <h3 className="font-semibold">{getTransactionTitle()}</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Amount:</span>
            <span className="font-medium">{currency} {amount.toLocaleString()}</span>
          </div>

          {recipientInfo && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Recipient:</span>
                <span className="font-medium">{recipientInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm">{recipientInfo.email}</span>
              </div>
            </>
          )}

          {paymentMethod && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Method:</span>
              <span className="font-medium capitalize">{paymentMethod.replace('_', ' ')}</span>
            </div>
          )}

          {feeDetails.totalFee > 0 && (
            <div className="space-y-2 border-t pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction Fee:</span>
                <span className="text-red-600">{currency} {feeDetails.totalFee.toLocaleString()}</span>
              </div>
              
              {feeDetails.flatFee > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">• Flat Fee:</span>
                  <span>{currency} {feeDetails.flatFee.toLocaleString()}</span>
                </div>
              )}
              
              {feeDetails.percentage > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">• Percentage Fee ({feeDetails.percentage}%):</span>
                  <span>{currency} {feeDetails.percentageFee.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {(transactionType === 'withdrawal' || transactionType === 'funds_transfer') && (
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Deduction:</span>
              <span>{currency} {totalAmount.toLocaleString()}</span>
            </div>
          )}

          {transactionType === 'deposit' && (
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Deposit:</span>
              <span className="text-green-600">{currency} {amount.toLocaleString()}</span>
            </div>
          )}
        </div>

        <Badge variant="outline" className="w-full justify-center">
          {transactionType === 'funds_transfer' ? 'Instant Transfer' : 
           transactionType === 'withdrawal' ? 'Pending Approval' :
           transactionType === 'deposit' ? 'Pending Processing' :
           'Processing'}
        </Badge>
      </CardContent>
    </Card>
  );
};

export default TransactionPreview;
