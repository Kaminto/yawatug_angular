import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowUpRight } from 'lucide-react';
import { useTransactionFees } from '@/hooks/useTransactionFees';

interface WalletWithdrawFormProps {
  wallets: any[];
  onWithdrawComplete: () => void;
}

const WalletWithdrawForm: React.FC<WalletWithdrawFormProps> = ({
  wallets,
  onWithdrawComplete
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { getFeeDetails } = useTransactionFees();

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const withdrawAmount = parseFloat(amount) || 0;
  const feeDetails = getFeeDetails('withdrawal', withdrawAmount, selectedWallet?.currency || 'UGX');

  const handleWithdraw = async () => {
    if (!selectedWallet || !withdrawAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedWallet.balance < withdrawAmount + feeDetails.totalFee) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: selectedWallet.id,
          amount: -withdrawAmount,
          currency: selectedWallet.currency,
          transaction_type: 'withdrawal',
          status: 'pending',
          admin_notes: JSON.stringify({
            transaction_fee: feeDetails.totalFee
          })
        });

      if (error) throw error;

      toast.success('Withdrawal request submitted successfully');
      setSelectedWalletId('');
      setAmount('');
      onWithdrawComplete();
    } catch (error: any) {
      console.error('Error creating withdrawal:', error);
      toast.error(`Failed to create withdrawal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
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

        {selectedWallet && withdrawAmount > 0 && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Withdrawal Amount:</span>
              <span>{selectedWallet.currency} {withdrawAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Transaction Fee:</span>
              <span className="text-red-600">{selectedWallet.currency} {feeDetails.totalFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span>Total Deduction:</span>
              <span className="text-red-600">{selectedWallet.currency} {(withdrawAmount + feeDetails.totalFee).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Remaining Balance:</span>
              <span>{selectedWallet.currency} {(selectedWallet.balance - withdrawAmount - feeDetails.totalFee).toLocaleString()}</span>
            </div>
          </div>
        )}

        <Button 
          onClick={handleWithdraw} 
          className="w-full"
          disabled={loading || !selectedWalletId || !withdrawAmount || (selectedWallet && selectedWallet.balance < withdrawAmount + feeDetails.totalFee)}
        >
          {loading ? 'Processing...' : 'Submit Withdrawal Request'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WalletWithdrawForm;
