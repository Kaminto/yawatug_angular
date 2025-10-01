
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  BarChart3,
  Target,
  Calendar,
  Award,
  RefreshCw,
  PieChart,
  Wallet
} from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { toast } from 'sonner';

interface UserPortfolioMetrics {
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  returnPercentage: number;
  totalShares: number;
  averageBuyPrice: number;
  currentSharePrice: number;
  unrealizedProfitLoss: number;
  investmentGrowth: number;
}

interface InvestmentTrend {
  period: string;
  invested: number;
  currentValue: number;
  growth: number;
}

const UserPortfolioInsights: React.FC = () => {
  const [portfolioMetrics, setPortfolioMetrics] = useState<UserPortfolioMetrics | null>(null);
  const [investmentTrends, setInvestmentTrends] = useState<InvestmentTrend[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userId } = useUser();

  useEffect(() => {
    if (userId) {
      loadPortfolioData();
    }
  }, [userId]);

  const loadPortfolioData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadUserPortfolioMetrics(),
        loadInvestmentTrends(),
        loadRecentTransactions()
      ]);
    } catch (error) {
      console.error('Error loading portfolio data:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPortfolioMetrics = async () => {
    if (!userId) return;

    try {
      // Get user's share holdings with current prices - only user-accessible data
      const { data: holdings, error: holdingsError } = await supabase
        .from('user_share_holdings')
        .select(`
          *,
          shares (price_per_share)
        `)
        .eq('user_id', userId);

      if (holdingsError) {
        console.error('Holdings error:', holdingsError);
        throw holdingsError;
      }

      // Get current share price - only public pricing data
      const { data: shareData, error: shareError } = await supabase
        .from('shares')
        .select('price_per_share')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (shareError && shareError.code !== 'PGRST116') {
        console.error('Share error:', shareError);
        throw shareError;
      }

      const currentSharePrice = shareData?.price_per_share || 0;

      if (!holdings || holdings.length === 0) {
        setPortfolioMetrics({
          totalInvested: 0,
          currentValue: 0,
          totalReturns: 0,
          returnPercentage: 0,
          totalShares: 0,
          averageBuyPrice: 0,
          currentSharePrice,
          unrealizedProfitLoss: 0,
          investmentGrowth: 0
        });
        return;
      }

      let totalInvested = 0;
      let currentValue = 0;
      let totalShares = 0;
      let weightedBuyPrice = 0;

      holdings.forEach(holding => {
        const holdingShares = holding?.shares;
        const sharePrice = holdingShares?.price_per_share || currentSharePrice;
        const quantity = Number(holding?.quantity) || 0;
        const buyPrice = Number(holding?.average_buy_price || holding?.purchase_price) || 0;
        
        const invested = quantity * buyPrice;
        const current = quantity * sharePrice;
        
        totalInvested += invested;
        currentValue += current;
        totalShares += quantity;
        weightedBuyPrice += buyPrice * quantity;
      });

      const averageBuyPrice = totalShares > 0 ? weightedBuyPrice / totalShares : 0;
      const unrealizedProfitLoss = currentValue - totalInvested;
      const returnPercentage = totalInvested > 0 ? (unrealizedProfitLoss / totalInvested) * 100 : 0;
      const investmentGrowth = totalInvested > 0 ? ((currentValue / totalInvested) * 100) - 100 : 0;

      setPortfolioMetrics({
        totalInvested,
        currentValue,
        totalReturns: unrealizedProfitLoss,
        returnPercentage,
        totalShares,
        averageBuyPrice,
        currentSharePrice,
        unrealizedProfitLoss,
        investmentGrowth
      });
    } catch (error) {
      console.error('Error in loadUserPortfolioMetrics:', error);
      // Set default values on error
      setPortfolioMetrics({
        totalInvested: 0,
        currentValue: 0,
        totalReturns: 0,
        returnPercentage: 0,
        totalShares: 0,
        averageBuyPrice: 0,
        currentSharePrice: 0,
        unrealizedProfitLoss: 0,
        investmentGrowth: 0
      });
    }
  };

  const loadInvestmentTrends = async () => {
    if (!userId) return;

    try {
      // Get user's transaction history to calculate trends - only user's own data
      const { data: transactions, error } = await supabase
        .from('share_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('transaction_type', 'buy')
        .order('created_at', { ascending: false })
        .limit(12); // Last 12 transactions for trends

      if (error) {
        console.error('Transactions error:', error);
        throw error;
      }

      // Calculate monthly investment trends based on user's transactions only
      const monthlyData: { [key: string]: { invested: number; transactions: number } } = {};
      
      (transactions || []).forEach(transaction => {
        const month = new Date(transaction.created_at).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { invested: 0, transactions: 0 };
        }
        const amount = (Number(transaction.quantity) || 0) * (Number(transaction.price_per_share) || 0);
        monthlyData[month].invested += amount;
        monthlyData[month].transactions += 1;
      });

      const trends: InvestmentTrend[] = Object.entries(monthlyData)
        .slice(0, 6) // Last 6 months
        .map(([month, data]) => ({
          period: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          invested: data.invested,
          currentValue: data.invested, // Simplified calculation
          growth: 0 // Simplified for now
        }));

      setInvestmentTrends(trends);
    } catch (error) {
      console.error('Error loading investment trends:', error);
      setInvestmentTrends([]);
    }
  };

  const loadRecentTransactions = async () => {
    if (!userId) return;

    try {
      // Only load user's own transaction history
      const { data: transactions, error } = await supabase
        .from('share_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Recent transactions error:', error);
        throw error;
      }
      setRecentTransactions(transactions || []);
    } catch (error) {
      console.error('Error loading recent transactions:', error);
      setRecentTransactions([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPortfolioData();
    setRefreshing(false);
    toast.success('Portfolio data refreshed');
  };

  const getPerformanceColor = (percentage: number) => {
    if (!isFinite(percentage)) return 'text-gray-600';
    if (percentage >= 10) return 'text-green-600';
    if (percentage >= 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (percentage: number) => {
    if (!isFinite(percentage)) return <Activity className="h-4 w-4 text-gray-600" />;
    return percentage >= 0 ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isFinite(num) ? num : 0;
  };

  const formatNumber = (value: any): string => {
    const num = safeNumber(value);
    return num.toLocaleString();
  };

  const formatCurrency = (value: any): string => {
    const num = safeNumber(value);
    return `UGX ${num.toLocaleString()}`;
  };

  const formatPercentage = (value: any): string => {
    const num = safeNumber(value);
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Portfolio Insights</h2>
          <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Insights</h2>
          <p className="text-muted-foreground">Your personal investment performance and insights</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Portfolio Performance Overview */}
      {portfolioMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Total Invested</span>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(portfolioMetrics.totalInvested)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(portfolioMetrics.totalShares)} shares owned
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Current Value</span>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(portfolioMetrics.currentValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                At {formatCurrency(portfolioMetrics.currentSharePrice)}/share
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                {getPerformanceIcon(portfolioMetrics.unrealizedProfitLoss)}
                <span className="text-sm font-medium">Unrealized P&L</span>
              </div>
              <div className={`text-2xl font-bold ${getPerformanceColor(portfolioMetrics.returnPercentage)}`}>
                {portfolioMetrics.unrealizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.unrealizedProfitLoss)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(portfolioMetrics.returnPercentage)} return
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Investment Growth</span>
              </div>
              <div className={`text-2xl font-bold ${getPerformanceColor(portfolioMetrics.investmentGrowth)}`}>
                {formatPercentage(portfolioMetrics.investmentGrowth)}
              </div>
              <p className="text-xs text-muted-foreground">
                Portfolio growth rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Investment Performance Progress */}
      {portfolioMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Personal Investment Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Portfolio Growth</span>
                  <span className={getPerformanceColor(portfolioMetrics.investmentGrowth)}>
                    {formatPercentage(portfolioMetrics.investmentGrowth)}
                  </span>
                </div>
                <Progress 
                  value={Math.min(Math.abs(safeNumber(portfolioMetrics.investmentGrowth)), 100)} 
                  className="h-2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Average Buy Price</p>
                  <p className="text-lg font-semibold">{formatCurrency(portfolioMetrics.averageBuyPrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Share Price</p>
                  <p className="text-lg font-semibold">{formatCurrency(portfolioMetrics.currentSharePrice)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Investment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {portfolioMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Performance Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Investment Status:</span>
                    <Badge variant={portfolioMetrics.unrealizedProfitLoss >= 0 ? "default" : "secondary"}>
                      {portfolioMetrics.unrealizedProfitLoss >= 0 ? 'Profitable' : 'In Loss'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Price Performance:</span>
                    <span className={getPerformanceColor(portfolioMetrics.currentSharePrice - portfolioMetrics.averageBuyPrice)}>
                      {portfolioMetrics.currentSharePrice >= portfolioMetrics.averageBuyPrice ? 'Above' : 'Below'} Average
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Portfolio Size:</span>
                    <span className="font-medium">
                      {portfolioMetrics.totalShares >= 1000 ? 'Large' : portfolioMetrics.totalShares >= 100 ? 'Medium' : 'Small'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Investment Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Shares Owned:</span>
                    <span className="font-medium">{formatNumber(portfolioMetrics.totalShares)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Portfolio Value:</span>
                    <span className="font-medium">{formatCurrency(portfolioMetrics.currentValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unrealized Gain/Loss:</span>
                    <span className={`font-medium ${getPerformanceColor(portfolioMetrics.unrealizedProfitLoss)}`}>
                      {portfolioMetrics.unrealizedProfitLoss >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.unrealizedProfitLoss)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No investment data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Investment Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Investment Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.transaction_type === 'buy' ? 'bg-green-100' : 
                      transaction.transaction_type === 'sell' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      {transaction.transaction_type === 'buy' ? 
                        <TrendingUp className="h-4 w-4 text-green-600" /> :
                        transaction.transaction_type === 'sell' ?
                        <TrendingDown className="h-4 w-4 text-red-600" /> :
                        <Activity className="h-4 w-4 text-blue-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium capitalize">
                        {transaction.transaction_type || 'Unknown'} Transaction
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatNumber(transaction.quantity)} shares
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(transaction.price_per_share)}/share
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No recent transactions
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserPortfolioInsights;
