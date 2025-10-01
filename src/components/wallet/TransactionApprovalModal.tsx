
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  approval_status: string;
  created_at: string;
  reference?: string;
  admin_notes?: string;
  user_profile?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

interface TransactionApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onApprovalComplete: () => void;
}

const TransactionApprovalModal: React.FC<TransactionApprovalModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onApprovalComplete
}) => {
  const [processing, setProcessing] = useState(false);

  const getPaymentDetails = () => {
    if (!transaction?.admin_notes) return null;
    
    try {
      const notes = JSON.parse(transaction.admin_notes);
      return {
        method: notes.payment_method || 'Unknown',
        details: notes.payment_details || {}
      };
    } catch {
      return null;
    }
  };

  const renderPaymentDetails = () => {
    const paymentInfo = getPaymentDetails();
    if (!paymentInfo) return null;

    const { method, details } = paymentInfo;

    switch (method) {
      case 'mobile_money':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Mobile Money Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Network:</strong> {details.network === 'mtn' ? 'MTN Mobile Money' : 'Airtel Money'}</div>
              {details.merchantCode && (
                <div><strong>Merchant Code:</strong> {details.merchantCode}</div>
              )}
              <div><strong>Phone:</strong> {details.phone}</div>
              {details.transactionId && (
                <div><strong>Transaction ID:</strong> {details.transactionId}</div>
              )}
              {details.depositorName && (
                <div><strong>Depositor Name:</strong> {details.depositorName}</div>
              )}
            </CardContent>
          </Card>
        );

      case 'bank_transfer':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Bank Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {details.selectedBank && (
                <div><strong>Bank:</strong> {details.selectedBank === 'dfcu' ? 'DFCU Bank' : 'Equity Bank'}</div>
              )}
              {details.bankName && (
                <div><strong>Bank:</strong> {details.bankName}</div>
              )}
              {details.accountNumber && (
                <div><strong>Account Number:</strong> {details.accountNumber}</div>
              )}
              {details.accountName && (
                <div><strong>Account Holder:</strong> {details.accountName}</div>
              )}
              {details.depositorName && (
                <div><strong>Depositor Name:</strong> {details.depositorName}</div>
              )}
            </CardContent>
          </Card>
        );

      case 'credit_card':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Credit Card Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Cardholder:</strong> {details.cardholderName}</div>
              <div><strong>Card Number:</strong> ****{details.cardNumber?.slice(-4)}</div>
              <div><strong>Expiry:</strong> {details.expiryDate}</div>
              {details.billingAddress && (
                <div><strong>Billing Address:</strong> {details.billingAddress}</div>
              )}
              {details.city && details.postalCode && (
                <div><strong>City, Postal:</strong> {details.city}, {details.postalCode}</div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div><strong>Method:</strong> {method.replace('_', ' ')}</div>
              <pre className="text-xs bg-gray-50 p-2 rounded mt-2">
                {JSON.stringify(details, null, 2)}
              </pre>
            </CardContent>
          </Card>
        );
    }
  };

  const handleApprove = async () => {
    if (!transaction) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Approving transaction:', transaction.id);

      // Update transaction status
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({
          approval_status: 'approved',
          status: 'completed',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (transactionError) {
        console.error('Error updating transaction:', transactionError);
        throw transactionError;
      }

      console.log('Transaction updated successfully');

      // Update wallet balance for deposits and withdrawals
      if (transaction.transaction_type === 'deposit' || transaction.transaction_type === 'withdraw') {
        console.log('Updating wallet balance for approved transaction');
        
        // Use standardized database function to sync wallet balance
        const { data: syncedBalance, error: balanceError } = await supabase.rpc('sync_wallet_balance', {
          p_wallet_id: transaction.wallet_id
        });

        console.log('Synced wallet balance:', syncedBalance);

        if (balanceError) {
          console.error('Error syncing wallet balance:', balanceError);
          throw balanceError;
        }

        console.log('Wallet balance updated successfully to:', syncedBalance);
      }

      toast.success('Transaction approved successfully');
      onClose();
      onApprovalComplete();
    } catch (error: any) {
      console.error('Error approving transaction:', error);
      toast.error('Failed to approve transaction');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!transaction) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Rejecting transaction:', transaction.id);

      const { error: transactionError } = await supabase
        .from('transactions')
        .update({
          approval_status: 'rejected',
          status: 'failed',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (transactionError) {
        console.error('Error updating transaction:', transactionError);
        throw transactionError;
      }

      console.log('Transaction rejected successfully');

      toast.success('Transaction rejected');
      onClose();
      onApprovalComplete();
    } catch (error: any) {
      console.error('Error rejecting transaction:', error);
      toast.error('Failed to reject transaction');
    } finally {
      setProcessing(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Transaction Approval Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">User</p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.user_profile?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.user_profile?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <Badge variant="outline">{transaction.transaction_type}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <p className="text-lg font-semibold">{transaction.currency} {transaction.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant="secondary">{transaction.approval_status}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Transaction ID</p>
                  <p className="text-xs text-muted-foreground font-mono">{transaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone Number</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {(() => {
                      try {
                        const notes = JSON.parse(transaction.admin_notes || '{}');
                        return notes.payment_details?.phone || transaction.user_profile?.phone || 'N/A';
                      } catch {
                        return transaction.user_profile?.phone || 'N/A';
                      }
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Reference</p>
                  <p className="text-sm text-muted-foreground">{transaction.reference || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {renderPaymentDetails()}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processing}
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={processing}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionApprovalModal;
