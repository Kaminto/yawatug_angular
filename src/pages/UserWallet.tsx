import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { MobileBottomPadding } from '@/components/layout/MobileBottomPadding';
import { useUser } from '@/providers/UserProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Minus, ArrowLeftRight, Wallet, DollarSign, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Import existing wallet forms for modals
import EnhancedWalletDepositForm from '@/components/wallet/EnhancedWalletDepositForm';
import EnhancedWalletWithdrawForm from '@/components/wallet/EnhancedWalletWithdrawForm';
import WalletTransferForm from '@/components/wallet/WalletTransferForm';
import WalletExchangeForm from '@/components/wallet/WalletExchangeForm';
import SmartPaymentSuggestions from '@/components/wallet/SmartPaymentSuggestions';
import PredictiveBalanceWidget from '@/components/wallet/PredictiveBalanceWidget';

const UserWallet = () => {
  const { wallets, balances, loading, getBalance, refreshWallets, userId } = useUser();
  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | 'transfer' | 'exchange' | null>(null);
  const [activeTab, setActiveTab] = useState('balance');
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  console.info('Wallet UI: tabs version active');

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Wallet' }
  ];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('open') === 'deposit') {
      setActiveModal('deposit');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadRecentTransactions();
    }
  }, [userId]);

  const loadRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleTransactionComplete = async () => {
    setActiveModal(null);
    await refreshWallets();
    await loadRecentTransactions();
  };

  const ugxBalance = getBalance('UGX');
  const usdBalance = getBalance('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(3700);
  
  // Fetch real exchange rate from database
  useEffect(() => {
    const fetchExchangeRate = async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', 'USD')
        .eq('to_currency', 'UGX')
        .eq('is_active', true)
        .single();
      
      if (data && !error) {
        setExchangeRate(data.rate);
      }
    };
    fetchExchangeRate();
  }, []);
  
  const totalEquivalentUGX = ugxBalance + (Math.max(0, usdBalance) * exchangeRate);

  if (loading) {
    return (
      <UserLayout title="My Wallet" breadcrumbs={breadcrumbs}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="My Wallet" breadcrumbs={breadcrumbs}>
      <MobileBottomPadding>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
          {/* Quick Actions Header */}
          <Card className="w-full max-w-full overflow-hidden">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/10 hover:border-primary"
                  onClick={() => setActiveModal('deposit')}
                >
                  <Plus className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Deposit</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-secondary/10 hover:border-secondary"
                  onClick={() => setActiveModal('withdraw')}
                >
                  <Minus className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-medium">Withdraw</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/10 hover:border-primary"
                  onClick={() => setActiveModal('transfer')}
                >
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Transfer</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-accent/10 hover:border-accent"
                  onClick={() => setActiveModal('exchange')}
                >
                  <ArrowLeftRight className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium">Exchange</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tab Navigation - Only Balance and History */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 mb-6">
              <TabsTrigger value="balance" className="text-sm font-medium">
                Balance
              </TabsTrigger>
              <TabsTrigger value="history" className="text-sm font-medium">
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="balance" className="space-y-4 w-full max-w-full overflow-hidden">
              {/* Predictive Balance Widget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PredictiveBalanceWidget
                  currentBalance={ugxBalance}
                  currency="UGX"
                  pendingDeposits={0}
                  pendingWithdrawals={0}
                />
                <PredictiveBalanceWidget
                  currentBalance={usdBalance}
                  currency="USD"
                  pendingDeposits={0}
                  pendingWithdrawals={0}
                />
              </div>

              {/* Smart Suggestions */}
              {userId && (
                <SmartPaymentSuggestions 
                  userId={userId}
                  wallets={wallets}
                  balances={balances}
                />
              )}

              {/* Currency Exchange Card */}
              <Card className="w-full max-w-full overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Currency Exchange
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setActiveModal('exchange')}
                    className="w-full"
                    variant="outline"
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Exchange Currency
                  </Button>
                </CardContent>
              </Card>

              {/* Balance Overview */}
              <Card className="w-full max-w-full overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Available Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 overflow-hidden">
                  {/* UGX Balance */}
                  <div className="flex items-center justify-between gap-2 p-4 bg-primary/5 rounded-lg min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0"></div>
                      <span className="text-sm font-medium truncate">UGX Wallet</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xl font-bold break-all ${ugxBalance < 0 ? 'text-destructive' : ''}`}>
                        {formatCurrency(ugxBalance, 'UGX')}
                      </p>
                      {ugxBalance < 0 && (
                        <p className="text-xs text-destructive">Negative balance detected</p>
                      )}
                    </div>
                  </div>

                  {/* USD Balance */}
                  <div className="flex items-center justify-between gap-2 p-4 bg-secondary/5 rounded-lg min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full bg-secondary flex-shrink-0"></div>
                      <span className="text-sm font-medium truncate">USD Wallet</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xl font-bold break-all ${usdBalance < 0 ? 'text-destructive' : ''}`}>
                        {formatCurrency(usdBalance, 'USD')}
                      </p>
                      {usdBalance < 0 && (
                        <p className="text-xs text-destructive">Negative balance detected</p>
                      )}
                    </div>
                  </div>

                  {/* Total Equivalent */}
                  <div className="flex items-center justify-between gap-2 p-4 bg-accent/5 rounded-lg border border-accent/20 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2 h-2 rounded-full bg-accent animate-pulse flex-shrink-0"></div>
                      <span className="text-sm font-semibold truncate">Total Equivalent</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-accent break-all">
                        {formatCurrency(totalEquivalentUGX, 'UGX')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4 w-full max-w-full overflow-hidden">
              {/* Recent Transactions */}
              <Card className="w-full max-w-full overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 overflow-hidden">
                  {recentTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No recent transactions</p>
                    </div>
                  ) : (
                    recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center gap-3 p-3 border rounded-lg min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                          <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-medium text-sm break-all">
                            {transaction.transaction_type === 'deposit' ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modals */}
        <Dialog open={activeModal === 'deposit'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg sm:text-xl">Deposit Funds</DialogTitle>
            </DialogHeader>
            <EnhancedWalletDepositForm 
              wallets={wallets}
              onDepositComplete={handleTransactionComplete}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'withdraw'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg sm:text-xl">Withdraw Funds</DialogTitle>
            </DialogHeader>
            <EnhancedWalletWithdrawForm 
              wallets={wallets}
              onWithdrawComplete={handleTransactionComplete}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'transfer'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg sm:text-xl">Transfer Funds</DialogTitle>
            </DialogHeader>
            <WalletTransferForm 
              wallets={wallets}
              onTransferComplete={handleTransactionComplete}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === 'exchange'} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg sm:text-xl">Currency Exchange</DialogTitle>
            </DialogHeader>
            <WalletExchangeForm onExchangeComplete={handleTransactionComplete} />
          </DialogContent>
        </Dialog>
      </MobileBottomPadding>
    </UserLayout>
  );
};

export default UserWallet;