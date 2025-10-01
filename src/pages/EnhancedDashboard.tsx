import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  CreditCard,
  Target,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import RealTimeWalletBalance from '@/components/wallet/RealTimeWalletBalance';
import MarketingCTAs from '@/components/dashboard/MarketingCTAs';
import DashboardSocialFooter from '@/components/dashboard/DashboardSocialFooter';

const EnhancedDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [userShares, setUserShares] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<any>({});
  const navigate = useNavigate();

  const breadcrumbs = [{ label: 'Dashboard' }];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Load wallets with comprehensive data
      const { data: walletsData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id);

      // Load user shares with join to shares table for current prices
      const { data: sharesData } = await supabase
        .from('user_shares')
        .select(`
          *,
          shares:share_id (
            id,
            price_per_share,
            currency
          )
        `)
        .eq('user_id', user.id);

      // Load recent transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setUserProfile(profile);
      setWallets(walletsData || []);
      setUserShares(sharesData || []);
      setTransactions(transactionsData || []);

      // Calculate portfolio statistics using real data
      const totalShares = sharesData?.reduce((sum, holding) => sum + holding.quantity, 0) || 0;
      const totalWalletValue = walletsData?.reduce((sum, wallet) => {
        if (wallet.currency === 'USD') return sum + (wallet.balance * 3800); // Convert to UGX
        return sum + wallet.balance;
      }, 0) || 0;

      // Calculate portfolio value using current share prices
      const portfolioValue = sharesData?.reduce((sum, holding) => {
        const sharePrice = holding.shares?.price_per_share || 0; // Use authoritative price only
        return sum + (holding.quantity * sharePrice);
      }, 0) || 0;

      setPortfolioStats({
        totalShares,
        totalWalletValue,
        portfolioValue,
        totalAssets: totalWalletValue + portfolioValue
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'withdraw':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <UserLayout title="Dashboard" breadcrumbs={breadcrumbs}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Dashboard" breadcrumbs={breadcrumbs}>
      <div className="space-y-6 md:space-y-8 pb-20 md:pb-4">
        {/* Marketing CTAs */}
        <MarketingCTAs />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-yawatu-gold/30 dark:bg-black/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg md:text-xl font-bold text-yawatu-gold">
                    UGX {portfolioStats.totalAssets?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <DollarSign className="h-5 w-5 text-yawatu-gold" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yawatu-gold/30 dark:bg-black/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg md:text-xl font-bold text-yawatu-gold">
                    UGX {portfolioStats.totalWalletValue?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">Cash</p>
                </div>
                <Wallet className="h-5 w-5 text-yawatu-gold" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yawatu-gold/30 dark:bg-black/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg md:text-xl font-bold text-yawatu-gold">
                    UGX {portfolioStats.portfolioValue?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">Shares</p>
                </div>
                <TrendingUp className="h-5 w-5 text-yawatu-gold" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yawatu-gold/30 dark:bg-black/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg md:text-xl font-bold text-yawatu-gold">
                    {portfolioStats.totalShares?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">Units</p>
                </div>
                <Target className="h-5 w-5 text-yawatu-gold" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <Button 
            onClick={() => navigate('/wallet')} 
            className="h-20 md:h-24 flex flex-col gap-2 border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold hover:text-black"
            variant="outline"
          >
            <Wallet className="h-6 w-6 md:h-8 md:w-8" />
            <span className="text-xs md:text-sm font-medium">Wallet</span>
          </Button>
          <Button 
            onClick={() => navigate('/shares')} 
            className="h-20 md:h-24 flex flex-col gap-2 border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold hover:text-black"
            variant="outline"
          >
            <TrendingUp className="h-6 w-6 md:h-8 md:w-8" />
            <span className="text-xs md:text-sm font-medium">Invest</span>
          </Button>
          <Button 
            onClick={() => navigate('/transactions')} 
            className="h-20 md:h-24 flex flex-col gap-2 border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold hover:text-black"
            variant="outline"
          >
            <Activity className="h-6 w-6 md:h-8 md:w-8" />
            <span className="text-xs md:text-sm font-medium">History</span>
          </Button>
          <Button 
            onClick={() => navigate('/profile')} 
            className="h-20 md:h-24 flex flex-col gap-2 border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold hover:text-black"
            variant="outline"
          >
            <Eye className="h-6 w-6 md:h-8 md:w-8" />
            <span className="text-xs md:text-sm font-medium">Profile</span>
          </Button>
          <Button 
            onClick={() => navigate('/business')} 
            className="h-20 md:h-24 flex flex-col gap-2 border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold hover:text-black"
            variant="outline"
          >
            <BarChart3 className="h-6 w-6 md:h-8 md:w-8" />
            <span className="text-xs md:text-sm font-medium">Business</span>
          </Button>
          <Button 
            onClick={() => navigate('/referrals')} 
            className="h-20 md:h-24 flex flex-col gap-2 border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold hover:text-black"
            variant="outline"
          >
            <CreditCard className="h-6 w-6 md:h-8 md:w-8" />
            <span className="text-xs md:text-sm font-medium">Earn</span>
          </Button>
        </div>

        {/* Recent Activity Summary */}
        <Card className="border-yawatu-gold/30 dark:bg-black/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-yawatu-gold" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 3).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border border-yawatu-gold/20 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.transaction_type)}
                      <div>
                        <p className="font-medium capitalize text-foreground text-sm">
                          {transaction.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-yawatu-gold text-sm">
                        {transaction.amount > 0 ? '+' : ''}{transaction.currency} {Math.abs(transaction.amount).toLocaleString()}
                      </p>
                      <Badge 
                        variant="outline"
                        className="text-xs border-yawatu-gold/50 text-muted-foreground"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button 
                  onClick={() => navigate('/transactions')} 
                  variant="outline"
                  className="w-full mt-4 border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold hover:text-black"
                  size="sm"
                >
                  View All Transactions
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Social Links & Support Footer */}
        <DashboardSocialFooter />
      </div>
    </UserLayout>
  );
};

export default EnhancedDashboard;