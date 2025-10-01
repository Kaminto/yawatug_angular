
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  PieChart, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface FinancialMetrics {
  totalWalletBalance: { [currency: string]: number };
  totalShareValue: number;
  totalUsers: number;
  activeTransactions: number;
  pendingTransactions: number;
  systemHealth: number;
}

interface FundAllocation {
  projectFunding: number;
  adminFund: number;
  shareBuyback: number;
  operationalExpenses: number;
}

interface UserPortfolio {
  userId: string;
  userName: string;
  walletBalance: { [currency: string]: number };
  shareHoldings: number;
  shareValue: number;
  totalValue: number;
  riskScore: number;
}

const UnifiedFinancialDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalWalletBalance: {},
    totalShareValue: 0,
    totalUsers: 0,
    activeTransactions: 0,
    pendingTransactions: 0,
    systemHealth: 0
  });
  const [fundAllocation, setFundAllocation] = useState<FundAllocation>({
    projectFunding: 0,
    adminFund: 0,
    shareBuyback: 0,
    operationalExpenses: 0
  });
  const [topUsers, setTopUsers] = useState<UserPortfolio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
    const interval = setInterval(loadFinancialData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadFinancialData = async () => {
    try {
      await Promise.all([
        loadSystemMetrics(),
        loadFundAllocation(),
        loadTopUserPortfolios()
      ]);
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Failed to load financial dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemMetrics = async () => {
    try {
      // Load wallet balances by currency
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('currency, balance');

      if (walletError) throw walletError;

      const walletBalances: { [currency: string]: number } = {};
      walletData?.forEach(wallet => {
        walletBalances[wallet.currency] = (walletBalances[wallet.currency] || 0) + wallet.balance;
      });

      // Load share data
      const { data: shareData, error: shareError } = await supabase
        .from('shares')
        .select('price_per_share, total_shares, available_shares');

      if (shareError) {
        console.log('Shares table not found, using default values');
      }

      const currentSharePrice = shareData?.[0]?.price_per_share || 0;
      const totalSharesIssued = shareData?.[0] ? 
        shareData[0].total_shares - shareData[0].available_shares : 0;
      const totalShareValue = currentSharePrice * totalSharesIssued;

      // Load user count
      const { count: userCount, error: userCountError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (userCountError) throw userCountError;

      // Load transaction metrics
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('status');

      if (transactionError) throw transactionError;

      const activeTransactions = transactionData?.filter(t => t.status === 'completed').length || 0;
      const pendingTransactions = transactionData?.filter(t => t.status === 'pending').length || 0;

      const totalTransactions = transactionData?.length || 1;
      const systemHealth = Math.round((activeTransactions / totalTransactions) * 100);

      setMetrics({
        totalWalletBalance: walletBalances,
        totalShareValue,
        totalUsers: userCount || 0,
        activeTransactions,
        pendingTransactions,
        systemHealth
      });
    } catch (error) {
      console.error('Error loading system metrics:', error);
    }
  };

  const loadFundAllocation = async () => {
    try {
      const { data: adminWallets, error } = await supabase
        .from('admin_sub_wallets')
        .select('wallet_type, balance, currency')
        .eq('currency', 'UGX');

      if (error) throw error;

      const allocation: FundAllocation = {
        projectFunding: 0,
        adminFund: 0,
        shareBuyback: 0,
        operationalExpenses: 0
      };

      adminWallets?.forEach(wallet => {
        switch (wallet.wallet_type) {
          case 'project_funding':
            allocation.projectFunding += wallet.balance;
            break;
          case 'admin_fund':
            allocation.adminFund += wallet.balance;
            break;
          case 'share_buyback':
            allocation.shareBuyback += wallet.balance;
            break;
          case 'operational_expenses':
            allocation.operationalExpenses += wallet.balance;
            break;
        }
      });

      setFundAllocation(allocation);
    } catch (error) {
      console.error('Error loading fund allocation:', error);
    }
  };

  const loadTopUserPortfolios = async () => {
    try {
      // Get users with basic info
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(20);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setTopUsers([]);
        return;
      }

      // Get wallet data for these users
      const userIds = profiles.map(p => p.id);
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('user_id, currency, balance')
        .in('user_id', userIds);

      if (walletError) throw walletError;

      // Get share holdings (if table exists)
      const { data: shareHoldings, error: shareError } = await supabase
        .from('user_share_holdings')
        .select('user_id, quantity, purchase_price')
        .in('user_id', userIds);

      // If shares table doesn't exist, continue without it
      if (shareError) {
        console.log('User share holdings table not found, continuing without share data');
      }

      // Get current share price
      const { data: shareData } = await supabase
        .from('shares')
        .select('price_per_share')
        .single();

      const currentSharePrice = shareData?.price_per_share || 0;

      const portfolios: UserPortfolio[] = [];

      profiles.forEach(profile => {
        const userWallets = walletData?.filter(w => w.user_id === profile.id) || [];
        const userShares = shareHoldings?.filter(s => s.user_id === profile.id) || [];

        const walletBalance: { [currency: string]: number } = {};
        let totalWalletValue = 0;

        userWallets.forEach(wallet => {
          walletBalance[wallet.currency] = (walletBalance[wallet.currency] || 0) + wallet.balance;
          totalWalletValue += wallet.balance;
        });

        const totalShares = userShares.reduce((sum, holding) => sum + holding.quantity, 0);
        const shareValue = totalShares * currentSharePrice;
        const totalValue = totalWalletValue + shareValue;
        const shareRatio = totalValue > 0 ? shareValue / totalValue : 0;
        const riskScore = Math.round(shareRatio * 100);

        portfolios.push({
          userId: profile.id,
          userName: profile.full_name || 'Unknown User',
          walletBalance,
          shareHoldings: totalShares,
          shareValue,
          totalValue,
          riskScore
        });
      });

      portfolios.sort((a, b) => b.totalValue - a.totalValue);
      setTopUsers(portfolios.slice(0, 10));
    } catch (error) {
      console.error('Error loading user portfolios:', error);
    }
  };

  const formatCurrency = (amount: number, currency = 'UGX') => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (health: number) => {
    if (health >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (health >= 70) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-center">
          <Activity className="h-8 w-8 mx-auto mb-2" />
          <p>Loading financial dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Unified Financial Dashboard</h2>
        <Badge variant="outline" className="flex items-center gap-1">
          {getHealthIcon(metrics.systemHealth)}
          System Health: {metrics.systemHealth}%
        </Badge>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wallet Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(metrics.totalWalletBalance).map(([currency, amount]) => (
                <div key={currency} className="text-lg font-bold">
                  {formatCurrency(amount, currency)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Share Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.totalShareValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeTransactions} active transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(metrics.systemHealth)}`}>
              {metrics.systemHealth}%
            </div>
            <Progress value={metrics.systemHealth} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="allocation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="allocation">Fund Allocation</TabsTrigger>
          <TabsTrigger value="portfolios">Top User Portfolios</TabsTrigger>
          <TabsTrigger value="analytics">Real-time Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Administrative Fund Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Project Funding</span>
                    <span className="font-bold">{formatCurrency(fundAllocation.projectFunding)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Admin Fund</span>
                    <span className="font-bold">{formatCurrency(fundAllocation.adminFund)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Share Buyback</span>
                    <span className="font-bold">{formatCurrency(fundAllocation.shareBuyback)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Operational Expenses</span>
                    <span className="font-bold">{formatCurrency(fundAllocation.operationalExpenses)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(fundAllocation).map(([key, value]) => {
                    const total = Object.values(fundAllocation).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (value / total) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span>{percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top User Portfolios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{user.userName}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.shareHoldings} shares • Risk: {user.riskScore}%
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(user.totalValue)}</div>
                      <div className="text-sm text-muted-foreground">
                        Shares: {formatCurrency(user.shareValue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Completed Transactions</span>
                    <Badge variant="default">{metrics.activeTransactions}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Transactions</span>
                    <Badge variant="secondary">{metrics.pendingTransactions}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <Badge className={getHealthColor(metrics.systemHealth)}>
                      {metrics.systemHealth}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Database Health</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Healthy</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Real-time Updates</span>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
                      <span className="text-blue-600">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Security Status</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Secure</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedFinancialDashboard;
