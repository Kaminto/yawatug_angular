import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';

interface DepositConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  depositDetails: {
    amount: number;
    currency: string;
    fee: number;
    total: number;
    phoneNumber?: string;
    method: string;
    reference: string;
    status: 'pending' | 'processing';
  };
}

const DepositConfirmationDialog: React.FC<DepositConfirmationDialogProps> = ({
  isOpen,
  onClose,
  depositDetails
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Deposit Confirmation
          </DialogTitle>
          <DialogDescription>
            Your deposit request has been submitted successfully
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Details */}
          <div className="space-y-3 bg-muted p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deposit Amount:</span>
              <span className="font-medium">{depositDetails.currency} {depositDetails.amount.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transaction Fee:</span>
              <span className="font-medium text-orange-600">{depositDetails.currency} {depositDetails.fee.toLocaleString()}</span>
            </div>

            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Amount:</span>
              <span className="text-primary">{depositDetails.currency} {depositDetails.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reference:</span>
              <span className="font-mono text-xs">{depositDetails.reference}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="capitalize">{depositDetails.method.replace('_', ' ')}</span>
            </div>

            {depositDetails.phoneNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone Number:</span>
                <span className="font-medium">{depositDetails.phoneNumber}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 animate-pulse" />
                {depositDetails.status === 'processing' ? 'Processing' : 'Pending Approval'}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-sm text-center text-muted-foreground">
            {depositDetails.method === 'mobile_money_relworx' ? (
              <p>Please complete the payment on your phone. You'll receive a notification once the payment is confirmed.</p>
            ) : (
              <p>Your deposit request is pending admin approval. You'll be notified once it's processed.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepositConfirmationDialog;
