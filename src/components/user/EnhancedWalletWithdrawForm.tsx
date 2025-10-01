
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
import { ArrowUpRight, AlertCircle, Building2, Smartphone } from 'lucide-react';
import { useTransactionLimits } from '@/hooks/useTransactionLimits';
import { useTransactionFees } from '@/hooks/useTransactionFees';

interface EnhancedWalletWithdrawFormProps {
  wallets: any[];
  onWithdrawComplete: () => void;
}

const EnhancedWalletWithdrawForm: React.FC<EnhancedWalletWithdrawFormProps> = ({
  wallets,
  onWithdrawComplete
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethodType, setPaymentMethodType] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [swiftCode, setSwiftCode] = useState('');

  // Mobile money details
  const [mobileNetwork, setMobileNetwork] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  const { checkTransactionLimit } = useTransactionLimits(userId);
  const { getFeeDetails } = useTransactionFees();

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const withdrawAmount = parseFloat(amount) || 0;
  const feeDetails = getFeeDetails('withdrawal', withdrawAmount, selectedWallet?.currency || 'UGX');
  const totalDeduction = withdrawAmount + feeDetails.totalFee;

  const resetPaymentDetails = () => {
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setSwiftCode('');
    setMobileNetwork('');
    setPhoneNumber('');
    setAccountHolderName('');
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethodType(method);
    resetPaymentDetails();
  };

  const validatePaymentDetails = () => {
    if (paymentMethodType === 'bank') {
      return bankName && accountNumber && accountName;
    } else if (paymentMethodType === 'mobile_money') {
      return mobileNetwork && phoneNumber && accountHolderName;
    }
    return false;
  };

  const handleInitiateWithdraw = () => {
    if (!selectedWallet || !withdrawAmount || !paymentMethodType) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validatePaymentDetails()) {
      toast.error('Please fill in all payment method details');
      return;
    }

    if (selectedWallet.balance < totalDeduction) {
      toast.error('Insufficient balance for withdrawal and fees');
      return;
    }

    const limitCheck = checkTransactionLimit('withdrawal', withdrawAmount);
    if (!limitCheck.allowed) {
      toast.error(limitCheck.reason || 'Transaction limit exceeded');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!userId || !selectedWallet) return;

    setLoading(true);
    try {
      const paymentDetails = paymentMethodType === 'bank' 
        ? { bankName, accountNumber, accountName, swiftCode }
        : { mobileNetwork, phoneNumber, accountHolderName };

      // Create withdrawal transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          wallet_id: selectedWallet.id,
          amount: -withdrawAmount,
          currency: selectedWallet.currency,
          transaction_type: 'withdrawal',
          status: 'pending',
          approval_status: 'pending',
          reference: `WTH-${Date.now()}`,
          admin_notes: JSON.stringify({
            payment_method_type: paymentMethodType,
            payment_details: paymentDetails,
            transaction_fee: feeDetails.totalFee,
            fee_percentage: feeDetails.percentage,
            otp_required: true
          })
        });

      if (transactionError) throw transactionError;

      toast.success('Withdrawal request submitted successfully');
      setSelectedWalletId('');
      setAmount('');
      setPaymentMethodType('');
      resetPaymentDetails();
      setShowConfirmation(false);
      onWithdrawComplete();
    } catch (error: any) {
      console.error('Error creating withdrawal:', error);
      toast.error(`Failed to create withdrawal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethodForm = () => {
    if (paymentMethodType === 'bank') {
      return (
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bank Withdrawal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Bank Name</Label>
                <Input
                  placeholder="e.g., DFCU Bank, Equity Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  placeholder="Bank account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
              <div>
                <Label>Account Holder Name</Label>
                <Input
                  placeholder="Full name as on bank account"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              <div>
                <Label>SWIFT Code (Optional)</Label>
                <Input
                  placeholder="Bank SWIFT code"
                  value={swiftCode}
                  onChange={(e) => setSwiftCode(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (paymentMethodType === 'mobile_money') {
      return (
        <div className="space-y-4">
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile Money Withdrawal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Network</Label>
                <Select value={mobileNetwork} onValueChange={setMobileNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                   <SelectContent className="bg-background border shadow-md z-[60]">
                     <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                     <SelectItem value="airtel">Airtel Money</SelectItem>
                   </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="0701234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div>
                <Label>Account Holder Name</Label>
                <Input
                  placeholder="Name on mobile money account"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Withdraw Funds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Wallet</Label>
            <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose wallet to withdraw from" />
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
            <Label>Withdrawal Amount</Label>
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
            <Label>Payment Method</Label>
            <Select value={paymentMethodType} onValueChange={handlePaymentMethodChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
               <SelectContent className="bg-background border shadow-md z-[60]">
                 <SelectItem value="mobile_money">Mobile Money</SelectItem>
                 <SelectItem value="bank">Bank Transfer</SelectItem>
               </SelectContent>
            </Select>
          </div>

          {paymentMethodType && renderPaymentMethodForm()}

          {selectedWallet && withdrawAmount > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Withdrawal Amount:</span>
                <span>{selectedWallet.currency} {withdrawAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Transaction Fee ({feeDetails.percentage}%):</span>
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
            onClick={handleInitiateWithdraw} 
            className="w-full"
            disabled={
              loading || 
              !selectedWalletId || 
              !withdrawAmount || 
              !paymentMethodType ||
              !validatePaymentDetails() ||
              (selectedWallet && totalDeduction > selectedWallet.balance)
            }
          >
            {loading ? 'Processing...' : 'Submit Withdrawal Request'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please verify all details before confirming your withdrawal request.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Withdrawal Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">From:</span>
                <span>{selectedWallet?.currency} Wallet</span>
                
                <span className="text-muted-foreground">Amount:</span>
                <span>{selectedWallet?.currency} {withdrawAmount.toLocaleString()}</span>
                
                <span className="text-muted-foreground">Fee:</span>
                <span className="text-red-600">{selectedWallet?.currency} {feeDetails.totalFee.toLocaleString()}</span>
                
                <span className="text-muted-foreground font-medium">Total Deduction:</span>
                <span className="font-medium text-red-600">{selectedWallet?.currency} {totalDeduction.toLocaleString()}</span>
                
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="capitalize">{paymentMethodType.replace('_', ' ')}</span>
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
                onClick={handleConfirmWithdraw}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Confirm Withdrawal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedWalletWithdrawForm;
