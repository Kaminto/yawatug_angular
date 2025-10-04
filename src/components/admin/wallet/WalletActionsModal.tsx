
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, Edit, Lock, Unlock, DollarSign, History, User } from 'lucide-react';

interface UserWallet {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  status: string;
  created_at: string;
  updated_at: string;
  user: {
    full_name: string;
    email: string;
    phone: string;
    status: string;
  };
}

interface WalletActionsModalProps {
  wallet: UserWallet | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const WalletActionsModal: React.FC<WalletActionsModalProps> = ({
  wallet,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const handleWalletStatusToggle = async () => {
    if (!wallet) return;

    setProcessing(true);
    try {
      const newStatus = wallet.status === 'active' ? 'suspended' : 'active';
      
      const { error } = await supabase
        .from('wallets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (error) throw error;

      toast.success(`Wallet ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating wallet status:', error);
      toast.error(error.message || 'Failed to update wallet status');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeposit = async () => {
    if (!wallet || !depositAmount || !depositNotes) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const amount = parseFloat(depositAmount);
      if (amount <= 0) throw new Error('Amount must be greater than 0');

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: wallet.user_id,
          wallet_id: wallet.id,
          transaction_type: 'deposit',
          amount: amount,
          currency: wallet.currency,
          status: 'completed',
          approval_status: 'approved',
          admin_notes: `Admin deposit: ${depositNotes}`,
          reference: `DEP-${Date.now()}`,
          description: `Admin deposit to wallet`,
        });

      if (transactionError) throw transactionError;

      toast.success('Deposit completed successfully');
      setDepositAmount('');
      setDepositNotes('');
      onUpdate();
      loadTransactionHistory();
    } catch (error: any) {
      console.error('Error processing deposit:', error);
      toast.error(error.message || 'Failed to process deposit');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!wallet || !withdrawAmount || !withdrawNotes) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const amount = parseFloat(withdrawAmount);
      if (amount <= 0) throw new Error('Amount must be greater than 0');
      if (wallet.balance < amount) throw new Error('Insufficient balance for withdrawal');

      // Create transaction record (negative amount for withdrawal)
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: wallet.user_id,
          wallet_id: wallet.id,
          transaction_type: 'withdraw',
          amount: -amount,
          currency: wallet.currency,
          status: 'completed',
          approval_status: 'approved',
          admin_notes: `Admin withdrawal: ${withdrawNotes}`,
          reference: `WTH-${Date.now()}`,
          description: `Admin withdrawal from wallet`,
        });

      if (transactionError) throw transactionError;

      toast.success('Withdrawal completed successfully');
      setWithdrawAmount('');
      setWithdrawNotes('');
      onUpdate();
      loadTransactionHistory();
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      toast.error(error.message || 'Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const handleTransfer = async () => {
    if (!wallet || !transferAmount || !transferNotes || !recipientEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const amount = parseFloat(transferAmount);
      if (amount <= 0) throw new Error('Amount must be greater than 0');
      if (wallet.balance < amount) throw new Error('Insufficient balance for transfer');

      // Find recipient by email
      const { data: recipientProfile, error: recipientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipientEmail)
        .single();

      if (recipientError || !recipientProfile) {
        throw new Error('Recipient user not found');
      }

      // Find recipient wallet
      const { data: recipientWallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', recipientProfile.id)
        .eq('currency', wallet.currency)
        .single();

      if (walletError || !recipientWallet) {
        throw new Error(`Recipient does not have a ${wallet.currency} wallet`);
      }

      // Create sender transaction (negative amount)
      const { error: senderTransactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: wallet.user_id,
          wallet_id: wallet.id,
          transaction_type: 'transfer',
          amount: -amount,
          currency: wallet.currency,
          status: 'completed',
          approval_status: 'approved',
          admin_notes: `Admin transfer to ${recipientEmail}: ${transferNotes}`,
          reference: `TRF-${Date.now()}`,
          description: `Admin transfer to ${recipientEmail}`,
        });

      if (senderTransactionError) throw senderTransactionError;

      // Create recipient transaction (positive amount)
      const { error: recipientTransactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: recipientProfile.id,
          wallet_id: recipientWallet.id,
          transaction_type: 'transfer',
          amount: amount,
          currency: wallet.currency,
          status: 'completed',
          approval_status: 'approved',
          admin_notes: `Admin transfer from ${wallet.user.email}: ${transferNotes}`,
          reference: `TRF-${Date.now()}`,
          description: `Admin transfer from ${wallet.user.email}`,
        });

      if (recipientTransactionError) throw recipientTransactionError;

      toast.success('Transfer completed successfully');
      setTransferAmount('');
      setTransferNotes('');
      setRecipientEmail('');
      onUpdate();
      loadTransactionHistory();
    } catch (error: any) {
      console.error('Error processing transfer:', error);
      toast.error(error.message || 'Failed to process transfer');
    } finally {
      setProcessing(false);
    }
  };

  const loadTransactionHistory = async () => {
    if (!wallet) return;

    setTransactionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', wallet.user_id)
        .eq('currency', wallet.currency)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setTransactionsLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && wallet) {
      loadTransactionHistory();
    }
  }, [isOpen, wallet]);

  if (!wallet) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Wallet Management - {wallet.user.full_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Wallet Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Currency</Label>
                    <p className="text-lg font-mono">{wallet.currency}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Current Balance</Label>
                    <p className="text-2xl font-bold text-green-600">
                      {wallet.currency} {wallet.balance.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div>
                      <Badge variant={wallet.status === 'active' ? 'default' : 'destructive'}>
                        {wallet.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p>{new Date(wallet.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button
                    onClick={handleWalletStatusToggle}
                    variant={wallet.status === 'active' ? 'destructive' : 'default'}
                    disabled={processing}
                    className="w-full"
                  >
                    {wallet.status === 'active' ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Suspend Wallet
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Activate Wallet
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deposit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deposit to Wallet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Balance</Label>
                  <p className="text-xl font-bold text-green-600">
                    {wallet.currency} {wallet.balance.toLocaleString()}
                  </p>
                </div>

                <div>
                  <Label>Deposit Amount *</Label>
                  <Input
                    type="number"
                    placeholder="Enter deposit amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label>Notes *</Label>
                  <Textarea
                    placeholder="Reason for deposit (e.g., Refund, Bonus, Correction)..."
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleDeposit}
                  disabled={processing || !depositAmount || !depositNotes}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Process Deposit
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Withdraw from Wallet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Balance</Label>
                  <p className="text-xl font-bold text-green-600">
                    {wallet.currency} {wallet.balance.toLocaleString()}
                  </p>
                </div>

                <div>
                  <Label>Withdrawal Amount *</Label>
                  <Input
                    type="number"
                    placeholder="Enter withdrawal amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label>Notes *</Label>
                  <Textarea
                    placeholder="Reason for withdrawal (e.g., Correction, Penalty)..."
                    value={withdrawNotes}
                    onChange={(e) => setWithdrawNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={processing || !withdrawAmount || !withdrawNotes}
                  variant="destructive"
                  className="w-full"
                >
                  Process Withdrawal
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transfer to Another User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Balance</Label>
                  <p className="text-xl font-bold text-green-600">
                    {wallet.currency} {wallet.balance.toLocaleString()}
                  </p>
                </div>

                <div>
                  <Label>Recipient Email *</Label>
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recipient must have a {wallet.currency} wallet
                  </p>
                </div>

                <div>
                  <Label>Transfer Amount *</Label>
                  <Input
                    type="number"
                    placeholder="Enter transfer amount"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label>Notes *</Label>
                  <Textarea
                    placeholder="Reason for transfer..."
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleTransfer}
                  disabled={processing || !transferAmount || !transferNotes || !recipientEmail}
                  className="w-full"
                >
                  Process Transfer
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Transactions (Last 20)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="animate-pulse">Loading transactions...</div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {transactions.map((transaction: any) => (
                      <div key={transaction.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium capitalize">{transaction.transaction_type.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.admin_notes || transaction.description || transaction.reference}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono font-bold ${
                              transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.currency} {Math.abs(transaction.amount).toLocaleString()}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No transactions found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default WalletActionsModal;
