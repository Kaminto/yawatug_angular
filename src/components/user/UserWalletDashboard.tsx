
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, CreditCard, History } from 'lucide-react';

interface Wallet {
  id: string;
  currency: string;
  balance: number;
  status: string;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  created_at: string;
  reference?: string;
}

const UserWalletDashboard = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('UGX');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user wallets
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id);

      if (walletsError) throw walletsError;
      setWallets(walletsData || []);

      // Load recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

      // Load payment methods
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true);

      if (paymentError) throw paymentError;
      setPaymentMethods(paymentData || []);

    } catch (error) {
      console.error('Error loading wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create deposit transaction (pending approval)
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: wallets.find(w => w.currency === selectedCurrency)?.id,
          amount: parseFloat(depositAmount),
          currency: selectedCurrency,
          transaction_type: 'deposit',
          status: 'pending',
          reference: `DEP-${Date.now()}`
        });

      if (error) throw error;

      toast.success('Deposit request submitted for approval');
      setDepositAmount('');
      loadWalletData();
    } catch (error) {
      console.error('Error creating deposit:', error);
      toast.error('Failed to create deposit request');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid withdrawal amount');
      return;
    }

    const wallet = wallets.find(w => w.currency === selectedCurrency);
    if (!wallet || wallet.balance < parseFloat(withdrawAmount)) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create withdrawal transaction (pending approval)
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: wallet.id,
          amount: -parseFloat(withdrawAmount),
          currency: selectedCurrency,
          transaction_type: 'withdrawal',
          status: 'pending',
          reference: `WTH-${Date.now()}`
        });

      if (error) throw error;

      toast.success('Withdrawal request submitted for approval');
      setWithdrawAmount('');
      loadWalletData();
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      toast.error('Failed to create withdrawal request');
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="animate-pulse">Loading wallet...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {wallets.map((wallet) => (
          <Card key={wallet.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{wallet.currency} Wallet</CardTitle>
              <Wallet className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {wallet.currency} {wallet.balance.toLocaleString()}
              </div>
              <Badge variant={wallet.status === 'active' ? 'default' : 'secondary'} className="mt-2">
                {wallet.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Wallet Actions */}
      <Tabs defaultValue="deposit" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deposit" className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Deposit
          </TabsTrigger>
          <TabsTrigger value="withdraw" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Withdraw
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposit">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Funds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Currency</Label>
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.currency} value={wallet.currency}>
                          {wallet.currency}
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
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods
                      .filter(method => method.currency === selectedCurrency)
                      .map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name} - {method.type}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleDeposit} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Request Deposit
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw">
          <Card>
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Currency</Label>
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.currency} value={wallet.currency}>
                          {wallet.currency} (Balance: {wallet.balance.toLocaleString()})
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
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods
                      .filter(method => method.currency === selectedCurrency)
                      .map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name} - {method.type}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleWithdraw} className="w-full" variant="outline">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Request Withdrawal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions yet</p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.transaction_type)}
                        <div>
                          <p className="font-medium capitalize">
                            {transaction.transaction_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                          {transaction.reference && (
                            <p className="text-xs text-muted-foreground">
                              Ref: {transaction.reference}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {transaction.amount > 0 ? '+' : ''}{transaction.currency} {Math.abs(transaction.amount).toLocaleString()}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserWalletDashboard;
