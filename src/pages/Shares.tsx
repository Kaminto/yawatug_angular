
import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, DollarSign, Share2, Calendar, AlertCircle } from 'lucide-react';
import SharePurchaseModal from '@/components/shares/SharePurchaseModal';
import ShareSellModal from '@/components/shares/ShareSellModal';

const Shares = () => {
  const [shares, setShares] = useState<any[]>([]);
  const [userShares, setUserShares] = useState<any[]>([]);
  const [shareTransactions, setShareTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShare, setSelectedShare] = useState<any>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Shares' }
  ];

  useEffect(() => {
    loadSharesData();
  }, []);

  const loadSharesData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load available shares
      const { data: sharesData, error: sharesError } = await supabase
        .from('shares')
        .select('*')
        .order('created_at', { ascending: false });

      if (sharesError) throw sharesError;
      setShares(sharesData || []);

      // Load user's share transactions - including all new types
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('share_transactions')
        .select(`
          *,
          shares (*)
        `)
        .eq('user_id', user.id)
        .in('transaction_type', [
          'buy', 'purchase', 'sell', 'sale', 
          'company_issue', 'reserve_issue', 'dividend_issue',
          'transfer_in', 'transfer_out', 
          'booking', 'booking_payment', 'booking_completion'
        ])
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;
      setShareTransactions(transactionsData || []);

      // Calculate user's shares portfolio
      const userPortfolio = calculateUserPortfolio(transactionsData || []);
      setUserShares(userPortfolio);

    } catch (error) {
      console.error('Error loading shares data:', error);
      toast.error('Failed to load shares data');
    } finally {
      setLoading(false);
    }
  };

  const calculateUserPortfolio = (transactions: any[]) => {
    const portfolio: { [key: string]: any } = {};

    transactions.forEach(transaction => {
      const shareId = transaction.share_id;
      
      if (!portfolio[shareId]) {
        portfolio[shareId] = {
          share_id: shareId,
          share_name: transaction.shares?.name || 'Unknown Share',
          total_quantity: 0,
          total_invested: 0,
          average_price: 0,
          current_value: 0,
          profit_loss: 0,
          profit_loss_percentage: 0
        };
      }

      if (transaction.transaction_type === 'buy') {
        portfolio[shareId].total_quantity += transaction.quantity;
        portfolio[shareId].total_invested += (transaction.quantity * transaction.price_per_share);
      } else if (transaction.transaction_type === 'sell') {
        portfolio[shareId].total_quantity -= transaction.quantity;
        // Don't subtract from total_invested to maintain cost basis
      }
    });

    // Calculate averages and current values
    Object.keys(portfolio).forEach(shareId => {
      const item = portfolio[shareId];
      if (item.total_quantity > 0) {
        item.average_price = item.total_invested / item.total_quantity;
        
        // Find current price from shares data
        const currentShare = shares.find(s => s.id === shareId);
        const currentPrice = currentShare?.price_per_share || item.average_price;
        
        item.current_value = item.total_quantity * currentPrice;
        item.profit_loss = item.current_value - item.total_invested;
        item.profit_loss_percentage = ((item.profit_loss / item.total_invested) * 100);
      }
    });

    return Object.values(portfolio).filter((item: any) => item.total_quantity > 0);
  };

  const handleBuyShare = (share: any) => {
    setSelectedShare(share);
    setShowPurchaseModal(true);
  };

  const handleSellShare = (userShare: any) => {
    const originalShare = shares.find(s => s.id === userShare.share_id);
    setSelectedShare({ ...originalShare, userQuantity: userShare.total_quantity });
    setShowSellModal(true);
  };

  const formatCurrency = (amount: number, currency: string = 'UGX') => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <UserLayout title="Shares" breadcrumbs={breadcrumbs}>
        <div className="animate-pulse">Loading shares...</div>
      </UserLayout>
    );
  }

  const totalPortfolioValue = userShares.reduce((sum, share) => sum + share.current_value, 0);
  const totalInvested = userShares.reduce((sum, share) => sum + share.total_invested, 0);
  const totalProfitLoss = totalPortfolioValue - totalInvested;
  const totalProfitLossPercentage = totalInvested > 0 ? ((totalProfitLoss / totalInvested) * 100) : 0;

  return (
    <UserLayout title="Shares" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPortfolioValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit/Loss</CardTitle>
              {totalProfitLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(totalProfitLoss))}
              </div>
              <p className={`text-xs ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfitLoss >= 0 ? '+' : '-'}{Math.abs(totalProfitLossPercentage).toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userShares.reduce((sum, share) => sum + share.total_quantity, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="portfolio" className="space-y-4">
          <TabsList>
            <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
            <TabsTrigger value="market">Available Shares</TabsTrigger>
            <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Share Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                {userShares.length === 0 ? (
                  <div className="text-center py-8">
                    <Share2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">You don't own any shares yet</p>
                    <p className="text-sm text-gray-400 mb-4">Start investing in available shares</p>
                    <Button onClick={() => {/* switch to market tab logic would go here */}}>
                      Browse Available Shares
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userShares.map((userShare) => (
                      <div key={userShare.share_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{userShare.share_name}</h3>
                            <p className="text-sm text-gray-500">
                              {formatNumber(userShare.total_quantity)} shares owned
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(userShare.current_value)}</p>
                            <p className={`text-sm ${userShare.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {userShare.profit_loss >= 0 ? '+' : ''}{formatCurrency(userShare.profit_loss)} 
                              ({userShare.profit_loss_percentage >= 0 ? '+' : ''}{userShare.profit_loss_percentage.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span>Average Price: {formatCurrency(userShare.average_price)}</span>
                          </div>
                          <div>
                            <span>Total Invested: {formatCurrency(userShare.total_invested)}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleBuyShare(shares.find(s => s.id === userShare.share_id))}
                          >
                            Buy More
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleSellShare(userShare)}
                          >
                            Sell
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="market" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Shares</CardTitle>
              </CardHeader>
              <CardContent>
                {shares.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No shares available for purchase</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {shares.map((share) => (
                      <div key={share.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{share.name}</h3>
                            <p className="text-sm text-gray-500">{share.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(share.price_per_share, share.currency)}</p>
                            <p className="text-sm text-gray-500">per share</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span>Available: {formatNumber(share.available_shares)}</span>
                          </div>
                          <div>
                            <span>Total: {formatNumber(share.total_shares)}</span>
                          </div>
                          <div>
                            <span>Currency: {share.currency}</span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleBuyShare(share)}
                          disabled={share.available_shares <= 0}
                        >
                          {share.available_shares <= 0 ? 'Sold Out' : 'Buy Shares'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {shareTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No share transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shareTransactions.map((transaction) => (
                      <div key={transaction.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={
                                ['buy', 'purchase'].includes(transaction.transaction_type) ? 'default' :
                                ['company_issue', 'reserve_issue'].includes(transaction.transaction_type) ? 'default' :
                                transaction.transaction_type === 'dividend_issue' ? 'outline' :
                                ['sell', 'sale'].includes(transaction.transaction_type) ? 'destructive' :
                                ['transfer_in', 'transfer_out'].includes(transaction.transaction_type) ? 'secondary' :
                                'outline'
                              }>
                                {transaction.transaction_type === 'company_issue' ? 'COMPANY ISSUE' :
                                 transaction.transaction_type === 'reserve_issue' ? 'RESERVE ISSUE' :
                                 transaction.transaction_type === 'dividend_issue' ? 'DIVIDEND (SHARES)' :
                                 transaction.transaction_type === 'transfer_in' ? 'TRANSFER IN' :
                                 transaction.transaction_type === 'transfer_out' ? 'TRANSFER OUT' :
                                 transaction.transaction_type.toUpperCase()}
                              </Badge>
                              <span className="font-medium">{transaction.shares?.name}</span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatNumber(transaction.quantity)} shares @ {formatCurrency(transaction.price_per_share, transaction.currency)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency(transaction.quantity * transaction.price_per_share, transaction.currency)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <SharePurchaseModal
          share={selectedShare}
          isOpen={showPurchaseModal}
          onClose={() => {
            setShowPurchaseModal(false);
            setSelectedShare(null);
          }}
          onSuccess={() => {
            loadSharesData();
            setShowPurchaseModal(false);
            setSelectedShare(null);
          }}
        />

        <ShareSellModal
          share={selectedShare}
          isOpen={showSellModal}
          onClose={() => {
            setShowSellModal(false);
            setSelectedShare(null);
          }}
          onSuccess={() => {
            loadSharesData();
            setShowSellModal(false);
            setSelectedShare(null);
          }}
        />
      </div>
    </UserLayout>
  );
};

export default Shares;
