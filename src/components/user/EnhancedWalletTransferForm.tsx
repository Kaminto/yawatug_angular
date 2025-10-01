
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useTransactionLimits } from '@/hooks/useTransactionLimits';
import { useTransactionFees } from '@/hooks/useTransactionFees';

interface EnhancedWalletTransferFormProps {
  wallets: any[];
  onTransferComplete: () => void;
}

const EnhancedWalletTransferForm: React.FC<EnhancedWalletTransferFormProps> = ({
  wallets,
  onTransferComplete
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientData, setRecipientData] = useState<any>(null);
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  const { checkTransactionLimit } = useTransactionLimits(userId);
  const { getFeeDetails } = useTransactionFees();

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    setUserEmail(user?.email || '');
  };

  const validateRecipientEmail = async (email: string) => {
    if (!email) {
      setEmailError('');
      setRecipientData(null);
      return;
    }

    if (email === userEmail) {
      setEmailError('You cannot transfer to your own account');
      setRecipientData(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, status')
        .eq('email', email)
        .single();

      if (error || !data) {
        setEmailError('Email not found in the system');
        setRecipientData(null);
        return;
      }

      if (data.status !== 'active') {
        setEmailError('Recipient account is not active');
        setRecipientData(null);
        return;
      }

      setEmailError('');
      setRecipientData(data);
    } catch (error) {
      console.error('Error validating email:', error);
      setEmailError('Error validating recipient email');
      setRecipientData(null);
    }
  };

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const transferAmount = parseFloat(amount) || 0;
  const feeDetails = getFeeDetails('transfer', transferAmount, selectedWallet?.currency || 'UGX');
  const totalDeduction = transferAmount + feeDetails.totalFee;

  const handleInitiateTransfer = () => {
    if (!selectedWallet || !transferAmount || !recipientData) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedWallet.balance < totalDeduction) {
      toast.error('Insufficient balance for transfer and fees');
      return;
    }

    const limitCheck = checkTransactionLimit('transfer', transferAmount);
    if (!limitCheck.allowed) {
      toast.error(limitCheck.reason || 'Transaction limit exceeded');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmTransfer = async () => {
    if (!userId || !selectedWallet || !recipientData) return;

    setLoading(true);
    try {
      // Create transfer transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          wallet_id: selectedWallet.id,
          amount: -transferAmount,
          currency: selectedWallet.currency,
          transaction_type: 'transfer',
          status: 'pending',
          approval_status: 'pending',
          reference: `TRF-${Date.now()}`,
          admin_notes: JSON.stringify({
            recipient_id: recipientData.id,
            recipient_email: recipientData.email,
            recipient_name: recipientData.full_name,
            transaction_fee: feeDetails.totalFee,
            fee_percentage: feeDetails.percentage
          })
        });

      if (transactionError) throw transactionError;

      toast.success('Transfer request submitted successfully');
      setSelectedWalletId('');
      setAmount('');
      setRecipientEmail('');
      setRecipientData(null);
      setShowConfirmation(false);
      onTransferComplete();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error(`Failed to create transfer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Transfer Funds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Wallet</Label>
            <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose wallet to transfer from" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md z-[60]">
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.currency} Wallet (Balance: {wallet.balance.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Transfer Amount</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div>
            <Label>Recipient Email</Label>
            <Input
              type="email"
              placeholder="Enter recipient email address"
              value={recipientEmail}
              onChange={(e) => {
                setRecipientEmail(e.target.value);
                validateRecipientEmail(e.target.value);
              }}
            />
            {emailError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{emailError}</AlertDescription>
              </Alert>
            )}
            {recipientData && (
              <Alert className="mt-2">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Recipient found: {recipientData.full_name} ({recipientData.email})
                </AlertDescription>
              </Alert>
            )}
          </div>

          {selectedWallet && transferAmount > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Transfer Amount:</span>
                <span>{selectedWallet.currency} {transferAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Transfer Fee ({feeDetails.percentage}%):</span>
                <span className="text-red-600">{selectedWallet.currency} {feeDetails.totalFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>Total Deduction:</span>
                <span className="text-red-600">{selectedWallet.currency} {totalDeduction.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining Balance:</span>
                <span>{selectedWallet.currency} {(selectedWallet.balance - totalDeduction).toLocaleString()}</span>
              </div>
            </div>
          )}

          {selectedWallet && totalDeduction > selectedWallet.balance && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insufficient balance. You need {selectedWallet.currency} {totalDeduction.toLocaleString()} but only have {selectedWallet.currency} {selectedWallet.balance.toLocaleString()}.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleInitiateTransfer} 
            className="w-full bg-action-transfer hover:bg-action-transfer/90 text-white"
            disabled={
              loading || 
              !selectedWalletId || 
              !transferAmount || 
              !recipientData || 
              emailError !== '' ||
              (selectedWallet && totalDeduction > selectedWallet.balance)
            }
          >
            {loading ? 'Processing...' : 'Initiate Transfer'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please verify all details before confirming your transfer.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Transfer Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">From:</span>
                <span>{selectedWallet?.currency} Wallet</span>
                
                <span className="text-muted-foreground">To:</span>
                <span>{recipientData?.full_name}</span>
                
                <span className="text-muted-foreground">Email:</span>
                <span>{recipientData?.email}</span>
                
                <span className="text-muted-foreground">Amount:</span>
                <span>{selectedWallet?.currency} {transferAmount.toLocaleString()}</span>
                
                <span className="text-muted-foreground">Fee:</span>
                <span className="text-red-600">{selectedWallet?.currency} {feeDetails.totalFee.toLocaleString()}</span>
                
                <span className="text-muted-foreground font-medium">Total:</span>
                <span className="font-medium text-red-600">{selectedWallet?.currency} {totalDeduction.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmTransfer}
                disabled={loading}
                className="flex-1 bg-action-transfer hover:bg-action-transfer/90 text-white"
              >
                {loading ? 'Processing...' : 'Confirm Transfer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedWalletTransferForm;
