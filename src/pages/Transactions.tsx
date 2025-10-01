
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserNavbar from '@/components/user/UserNavbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CircleDollarSign, ArrowUpRight, ArrowDownLeft, RefreshCw, Calendar, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDate } from '@/lib/dateFormatter';

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [shareTransactions, setShareTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          
          // Fetch wallet transactions
          const { data: txData, error: txError } = await supabase
            .from('transactions')
            .select(`
              *,
              wallet:wallet_id(currency)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (txError) throw txError;
          setTransactions(txData || []);
          
          // Fetch share transactions
          const { data: shareTxData, error: shareTxError } = await supabase
            .from('share_transactions')
            .select(`
              *,
              share:share_id(name, currency)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (shareTxError) throw shareTxError;
          setShareTransactions(shareTxData || []);
        }
      } catch (error: any) {
        console.error('Error loading transactions:', error);
        toast.error('Failed to load transaction history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Import formatDate from shared utility
  // const formatDate = (dateString: string) => { ... } - removed, using shared utility

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeIcon = (type: string, amount: number) => {
    if (type === 'deposit' || amount > 0) {
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    } else if (type === 'withdrawal' || type === 'share_purchase' || amount < 0) {
      return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    } else {
      return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getShareTransactionTypeIcon = (type: string) => {
    if (type === 'purchase') {
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    } else if (type === 'sale') {
      return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    } else if (type === 'transfer_in') {
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    } else if (type === 'transfer_out') {
      return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    } else {
      return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getShareTransactionLabel = (type: string) => {
    switch(type) {
      case 'purchase':
        return 'Share Purchase';
      case 'sale':
        return 'Share Sale';
      case 'transfer_in':
        return 'Share Received';
      case 'transfer_out':
        return 'Share Transfer';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch(type) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'share_purchase':
        return 'Share Purchase';
      case 'transfer':
        return 'Transfer';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <UserNavbar />
      
      <main className="flex-grow container mx-auto px-4 pt-24 pb-16">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
            <p className="text-muted-foreground">View and track all your YAWATU financial activities.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-9 space-y-6">
              <Tabs defaultValue="all">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <TabsList>
                    <TabsTrigger value="all">All Transactions</TabsTrigger>
                    <TabsTrigger value="wallet">Wallet</TabsTrigger>
                    <TabsTrigger value="shares">Shares</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      Date Range
                    </Button>
                    <Button variant="outline" size="sm" className="h-8">
                      <Filter className="h-3.5 w-3.5 mr-1" />
                      Filter
                    </Button>
                  </div>
                </div>
                
                <TabsContent value="all" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Recent Transactions</CardTitle>
                      <CardDescription>
                        Your complete transaction history across all accounts.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex justify-between p-4 border-b animate-pulse">
                              <div className="w-2/3 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              <div className="w-1/4 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {transactions.length === 0 && shareTransactions.length === 0 ? (
                            <div className="text-center py-8">
                              <CircleDollarSign className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-lg font-medium">No transactions yet</h3>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Your transactions will appear here once you start using YAWATU services.
                              </p>
                              <Button onClick={() => navigate('/shares')} className="mt-4">
                                Go to Shares
                              </Button>
                            </div>
                          ) : (
                            [...transactions, ...shareTransactions]
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .map((tx, index) => {
                                const isWalletTx = 'wallet_id' in tx;
                                
                                return (
                                  <div 
                                    key={tx.id} 
                                    className={`flex justify-between items-center p-3 rounded-lg hover:bg-accent/50 ${
                                      index !== transactions.length - 1 ? 'border-b dark:border-gray-800' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-full bg-accent">
                                        {isWalletTx 
                                          ? getTransactionTypeIcon(tx.transaction_type, tx.amount)
                                          : getShareTransactionTypeIcon(tx.transaction_type)
                                        }
                                      </div>
                                      <div>
                                        <p className="font-medium">
                                          {isWalletTx 
                                            ? getTransactionTypeLabel(tx.transaction_type) 
                                            : getShareTransactionLabel(tx.transaction_type)
                                          }
                                        </p>
                                        <div className="flex items-center text-xs text-muted-foreground">
                                          <span>{formatDate(tx.created_at)}</span>
                                          <span className="mx-1">•</span>
                                          <span>{formatTime(tx.created_at)}</span>
                                        </div>
                                        {tx.reference && (
                                          <p className="text-xs text-muted-foreground mt-1 max-w-[300px] truncate">
                                            {tx.reference}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className={`font-medium ${
                                        isWalletTx 
                                          ? (tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400') 
                                          : (tx.transaction_type === 'purchase' || tx.transaction_type === 'transfer_out' 
                                              ? 'text-red-600 dark:text-red-400' 
                                              : 'text-green-600 dark:text-green-400')
                                      }`}>
                                        {isWalletTx 
                                          ? `${tx.amount > 0 ? '+' : ''}${formatCurrency(tx.amount, tx.wallet.currency)}`
                                          : (tx.transaction_type === 'purchase' || tx.transaction_type === 'transfer_out'
                                              ? '-' 
                                              : '+') + 
                                            `${formatCurrency(tx.quantity * tx.price_per_share, tx.currency)}`
                                        }
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {isWalletTx 
                                          ? `Wallet Transaction`
                                          : `${tx.quantity.toLocaleString()} shares @ ${formatCurrency(tx.price_per_share, tx.currency || 'UGX')}`
                                        }
                                      </p>
                                      <Badge 
                                        variant="outline" 
                                        className="mt-1 text-xs font-normal"
                                      >
                                        {isWalletTx ? tx.wallet.currency : tx.share?.name || 'Share Transaction'}
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="wallet" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Wallet Transactions</CardTitle>
                      <CardDescription>
                        Deposits, withdrawals, and transfers in your wallets.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex justify-between p-4 border-b animate-pulse">
                              <div className="w-2/3 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              <div className="w-1/4 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {transactions.length === 0 ? (
                            <div className="text-center py-8">
                              <CircleDollarSign className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-lg font-medium">No wallet transactions yet</h3>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Your wallet transactions will appear here once you make deposits or transfers.
                              </p>
                              <Button onClick={() => navigate('/shares')} className="mt-4">
                                Top Up Wallet
                              </Button>
                            </div>
                          ) : (
                            transactions.map((tx, index) => (
                              <div 
                                key={tx.id} 
                                className={`flex justify-between items-center p-3 rounded-lg hover:bg-accent/50 ${
                                  index !== transactions.length - 1 ? 'border-b dark:border-gray-800' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-full bg-accent">
                                    {getTransactionTypeIcon(tx.transaction_type, tx.amount)}
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      {getTransactionTypeLabel(tx.transaction_type)}
                                    </p>
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <span>{formatDate(tx.created_at)}</span>
                                      <span className="mx-1">•</span>
                                      <span>{formatTime(tx.created_at)}</span>
                                    </div>
                                    {tx.reference && (
                                      <p className="text-xs text-muted-foreground mt-1 max-w-[300px] truncate">
                                        {tx.reference}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`font-medium ${
                                    tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {`${tx.amount > 0 ? '+' : ''}${formatCurrency(tx.amount, tx.wallet.currency)}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Wallet Transaction
                                  </p>
                                  <Badge 
                                    variant="outline" 
                                    className="mt-1 text-xs font-normal"
                                  >
                                    {tx.wallet.currency}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="shares" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Share Transactions</CardTitle>
                      <CardDescription>
                        Purchases, sales, and transfers of your shares.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex justify-between p-4 border-b animate-pulse">
                              <div className="w-2/3 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              <div className="w-1/4 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {shareTransactions.length === 0 ? (
                            <div className="text-center py-8">
                              <CircleDollarSign className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-lg font-medium">No share transactions yet</h3>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Your share transactions will appear here once you buy or transfer shares.
                              </p>
                              <Button onClick={() => navigate('/shares')} className="mt-4">
                                Buy Shares
                              </Button>
                            </div>
                          ) : (
                            shareTransactions.map((tx, index) => (
                              <div 
                                key={tx.id} 
                                className={`flex justify-between items-center p-3 rounded-lg hover:bg-accent/50 ${
                                  index !== shareTransactions.length - 1 ? 'border-b dark:border-gray-800' : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-full bg-accent">
                                    {getShareTransactionTypeIcon(tx.transaction_type)}
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      {getShareTransactionLabel(tx.transaction_type)}
                                    </p>
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <span>{formatDate(tx.created_at)}</span>
                                      <span className="mx-1">•</span>
                                      <span>{formatTime(tx.created_at)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`font-medium ${
                                    tx.transaction_type === 'purchase' || tx.transaction_type === 'transfer_out'
                                      ? 'text-red-600 dark:text-red-400' 
                                      : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    {(tx.transaction_type === 'purchase' || tx.transaction_type === 'transfer_out' ? '-' : '+') +
                                     `${formatCurrency(tx.quantity * tx.price_per_share, tx.currency)}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {`${tx.quantity.toLocaleString()} shares @ ${formatCurrency(tx.price_per_share, tx.currency)}`}
                                  </p>
                                  <Badge 
                                    variant="outline" 
                                    className="mt-1 text-xs font-normal"
                                  >
                                    {tx.share?.name || 'Share Transaction'}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="md:col-span-3 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Transactions</h3>
                    <p className="text-2xl font-bold">{transactions.length + shareTransactions.length}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Wallet Transactions</h3>
                    <p className="text-lg font-semibold">{transactions.length}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Share Transactions</h3>
                    <p className="text-lg font-semibold">{shareTransactions.length}</p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Need Help?</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Contact our support team for assistance with your transactions.
                    </p>
                    <Button variant="outline" className="w-full">Contact Support</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Export Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Last 30 Days
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Last 90 Days
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Custom Date Range
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Transactions;
