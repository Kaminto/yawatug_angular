
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
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
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

  const handleBalanceAdjustment = async (type: 'add' | 'subtract') => {
    if (!wallet || !adjustmentAmount || !adjustmentReason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const amount = parseFloat(adjustmentAmount);
      const adjustedAmount = type === 'subtract' ? -amount : amount;

      // Check if subtraction would result in negative balance
      if (type === 'subtract' && wallet.balance < amount) {
        throw new Error('Insufficient balance for this adjustment');
      }

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance: wallet.balance + adjustedAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: wallet.user_id,
          wallet_id: wallet.id,
          transaction_type: 'admin_adjustment',
          amount: adjustedAmount,
          currency: wallet.currency,
          status: 'completed',
          approval_status: 'approved',
          admin_notes: `Admin balance adjustment: ${adjustmentReason}`,
          reference: `ADJ-${Date.now()}`,
        });

      if (transactionError) throw transactionError;

      toast.success(`Balance ${type === 'add' ? 'increased' : 'decreased'} successfully`);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      onUpdate();
    } catch (error: any) {
      console.error('Error adjusting balance:', error);
      toast.error(error.message || 'Failed to adjust balance');
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
        .limit(10);

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="adjust">Adjust</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="user">User Info</TabsTrigger>
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

          <TabsContent value="adjust" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Balance Adjustment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Balance</Label>
                  <p className="text-xl font-bold">
                    {wallet.currency} {wallet.balance.toLocaleString()}
                  </p>
                </div>

                <div>
                  <Label>Adjustment Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Reason for Adjustment</Label>
                  <Textarea
                    placeholder="Explain the reason for this balance adjustment..."
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleBalanceAdjustment('add')}
                    disabled={processing || !adjustmentAmount || !adjustmentReason}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Add Amount
                  </Button>
                  <Button
                    onClick={() => handleBalanceAdjustment('subtract')}
                    disabled={processing || !adjustmentAmount || !adjustmentReason}
                    variant="destructive"
                  >
                    Subtract Amount
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="animate-pulse">Loading transactions...</div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-2">
                    {transactions.map((transaction: any) => (
                      <div key={transaction.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{transaction.transaction_type}</p>
                             <p className="text-sm text-muted-foreground">
                               {transaction.admin_notes || transaction.reference}
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

          <TabsContent value="user" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Full Name</Label>
                    <p className="text-lg">{wallet.user.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p>{wallet.user.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p>{wallet.user.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Account Status</Label>
                    <div>
                      <Badge variant={wallet.user.status === 'active' ? 'default' : 'destructive'}>
                        {wallet.user.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default WalletActionsModal;
