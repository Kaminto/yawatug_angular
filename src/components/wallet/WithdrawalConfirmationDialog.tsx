import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface WithdrawalConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  withdrawalDetails: {
    amount: number;
    currency: string;
    fee: number;
    netAmount: number;
    phoneNumber?: string;
    accountName?: string;
    method: string;
  };
  loading?: boolean;
}

const WithdrawalConfirmationDialog: React.FC<WithdrawalConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  withdrawalDetails,
  loading = false
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Confirm Withdrawal
          </DialogTitle>
          <DialogDescription>
            Please review your withdrawal details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Withdrawal Breakdown */}
          <div className="space-y-3 bg-muted p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Withdrawal:</span>
              <span className="font-medium">{withdrawalDetails.currency} {withdrawalDetails.amount.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transaction Fee:</span>
              <span className="font-medium text-red-600">- {withdrawalDetails.currency} {withdrawalDetails.fee.toLocaleString()}</span>
            </div>

            <div className="flex justify-between font-semibold border-t pt-2 text-base">
              <span>Net Received:</span>
              <span className="text-green-600">{withdrawalDetails.currency} {withdrawalDetails.netAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Recipient Details */}
          <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            {withdrawalDetails.phoneNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone Number:</span>
                <span className="font-medium">{withdrawalDetails.phoneNumber}</span>
              </div>
            )}

            {withdrawalDetails.accountName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account Name:</span>
                <span className="font-medium">{withdrawalDetails.accountName}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Method:</span>
              <span className="capitalize">{withdrawalDetails.method.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-800 dark:text-orange-200">
              Once confirmed, this withdrawal cannot be cancelled. Please ensure all details are correct.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Withdrawal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalConfirmationDialog;
