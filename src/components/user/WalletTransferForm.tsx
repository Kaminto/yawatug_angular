
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRightLeft } from 'lucide-react';
import { useTransactionFees } from '@/hooks/useTransactionFees';

interface WalletTransferFormProps {
  wallets: any[];
  onTransferComplete: () => void;
}

const WalletTransferForm: React.FC<WalletTransferFormProps> = ({
  wallets,
  onTransferComplete
}) => {
  const [fromWalletId, setFromWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { getFeeDetails } = useTransactionFees();

  const fromWallet = wallets.find(w => w.id === fromWalletId);
  const transferAmount = parseFloat(amount) || 0;
  const feeDetails = getFeeDetails('transfer', transferAmount, fromWallet?.currency || 'UGX');

  const handleTransfer = async () => {
    if (!fromWallet || !transferAmount || !recipientEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (fromWallet.balance < transferAmount + feeDetails.totalFee) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Verify recipient using the edge function
      const { data: verificationResult, error: verificationError } = await supabase.functions.invoke('verify-recipient', {
        body: {
          email: recipientEmail.trim(),
          currency: fromWallet.currency
        }
      });

      if (verificationError) {
        toast.error(`Verification failed: ${verificationError.message}`);
        setLoading(false);
        return;
      }

      if (!verificationResult?.success || !verificationResult?.verified) {
        toast.error(verificationResult?.message || 'Recipient cannot receive transfers');
        setLoading(false);
        return;
      }

      const recipient = verificationResult.recipient;
      console.log('Recipient verified successfully:', recipient.full_name);

      // Create transfer transaction
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: fromWallet.id,
          amount: -transferAmount,
          currency: fromWallet.currency,
          transaction_type: 'transfer',
          status: 'pending',
          approval_status: 'pending',
          reference: `TXF-${Date.now()}`,
          admin_notes: JSON.stringify({
            recipient_id: recipient.id,
            recipient_email: recipientEmail,
            transfer_fee: feeDetails.totalFee
          })
        });

      if (error) throw error;

      toast.success('Transfer request submitted successfully');
      setFromWalletId('');
      setAmount('');
      setRecipientEmail('');
      onTransferComplete();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error(`Failed to create transfer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Transfer Funds
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>From Wallet</Label>
          <Select value={fromWalletId} onValueChange={setFromWalletId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose wallet to transfer from" />
            </SelectTrigger>
            <SelectContent>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.currency} Wallet (Balance: {wallet.balance.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
          />
        </div>

        <div>
          <Label>Recipient Email</Label>
          <Input
            type="email"
            placeholder="Enter recipient's email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />
        </div>

        {fromWallet && transferAmount > 0 && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Transfer Amount:</span>
              <span>{fromWallet.currency} {transferAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Transfer Fee:</span>
              <span className="text-red-600">{fromWallet.currency} {feeDetails.totalFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span>Total Deduction:</span>
              <span className="text-red-600">{fromWallet.currency} {(transferAmount + feeDetails.totalFee).toLocaleString()}</span>
            </div>
          </div>
        )}

        <Button 
          onClick={handleTransfer} 
          className="w-full bg-action-transfer hover:bg-action-transfer/90 text-white"
          disabled={loading || !fromWalletId || !transferAmount || !recipientEmail.trim() || (fromWallet && fromWallet.balance < transferAmount + feeDetails.totalFee)}
        >
          {loading ? 'Processing...' : 'Submit Transfer Request'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WalletTransferForm;
