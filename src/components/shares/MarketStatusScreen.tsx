
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
  RefreshCw
} from 'lucide-react';
import { useUser } from '@/providers/UserProvider';
import { toast } from 'sonner';

interface PortfolioMetrics {
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  returnPercentage: number;
  totalShares: number;
  averageBuyPrice: number;
  currentPrice: number;
  profitLoss: number;
}

interface MarketTrend {
  period: string;
  priceChange: number;
  changePercentage: number;
}

const MarketStatusScreen: React.FC = () => {
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [dividendHistory, setDividendHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userId } = useUser();

  useEffect(() => {
    if (userId) {
      loadMarketData();
    }
  }, [userId]);

  const loadMarketData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadPortfolioMetrics(),
        loadMarketTrends(),
        loadDividendHistory()
      ]);
    } catch (error) {
      console.error('Error loading market data:', error);
      toast.error('Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolioMetrics = async () => {
    if (!userId) return;

    // Get user's share holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from('user_share_holdings')
      .select(`
        *,
        shares (price_per_share)
      `)
      .eq('user_id', userId);

    if (holdingsError) throw holdingsError;

    if (!holdings || holdings.length === 0) {
      setPortfolioMetrics({
        totalInvested: 0,
        currentValue: 0,
        totalReturns: 0,
        returnPercentage: 0,
        totalShares: 0,
        averageBuyPrice: 0,
        currentPrice: 0,
        profitLoss: 0
      });
      return;
    }

    let totalInvested = 0;
    let currentValue = 0;
    let totalShares = 0;
    let weightedBuyPrice = 0;
    let currentPrice = 0;

    holdings.forEach(holding => {
      const invested = holding.total_invested || (holding.quantity * holding.average_buy_price);
      const current = holding.quantity * (holding.shares?.price_per_share || 0);
      
      totalInvested += invested;
      currentValue += current;
      totalShares += holding.quantity;
      weightedBuyPrice += holding.average_buy_price * holding.quantity;
      currentPrice = holding.shares?.price_per_share || 0;
    });

    const averageBuyPrice = totalShares > 0 ? weightedBuyPrice / totalShares : 0;
    const profitLoss = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    setPortfolioMetrics({
      totalInvested,
      currentValue,
      totalReturns: profitLoss,
      returnPercentage,
      totalShares,
      averageBuyPrice,
      currentPrice,
      profitLoss
    });
  };

  const loadMarketTrends = async () => {
    // Get recent price history for trend analysis
    const { data: priceHistory, error } = await supabase
      .from('share_price_history')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    if (error) throw error;

    if (!priceHistory || priceHistory.length < 2) {
      setMarketTrends([]);
      return;
    }

    const trends: MarketTrend[] = [];
    const current = priceHistory[0];
    
    // Daily trend
    if (priceHistory.length >= 2) {
      const yesterday = priceHistory[1];
      const change = current.price_per_share - yesterday.price_per_share;
      const changePercentage = (change / yesterday.price_per_share) * 100;
      trends.push({
        period: '24h',
        priceChange: change,
        changePercentage
      });
    }

    // Weekly trend
    const weekAgo = priceHistory.find(p => {
      const date = new Date(p.date);
      const weekAgoDate = new Date();
      weekAgoDate.setDate(weekAgoDate.getDate() - 7);
      return date <= weekAgoDate;
    });

    if (weekAgo) {
      const change = current.price_per_share - weekAgo.price_per_share;
      const changePercentage = (change / weekAgo.price_per_share) * 100;
      trends.push({
        period: '7d',
        priceChange: change,
        changePercentage
      });
    }

    // Monthly trend
    const monthAgo = priceHistory.find(p => {
      const date = new Date(p.date);
      const monthAgoDate = new Date();
      monthAgoDate.setDate(monthAgoDate.getDate() - 30);
      return date <= monthAgoDate;
    });

    if (monthAgo) {
      const change = current.price_per_share - monthAgo.price_per_share;
      const changePercentage = (change / monthAgo.price_per_share) * 100;
      trends.push({
        period: '30d',
        priceChange: change,
        changePercentage
      });
    }

    setMarketTrends(trends);
  };

  const loadDividendHistory = async () => {
    if (!userId) return;

    const { data: dividends, error } = await supabase
      .from('dividend_payments')
      .select(`
        *,
        dividend_declarations (
          declaration_date,
          per_share_amount,
          description
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    setDividendHistory(dividends || []);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMarketData();
    setRefreshing(false);
    toast.success('Market data refreshed');
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 20) return 'bg-green-500';
    if (percentage >= 10) return 'bg-yellow-500';
    if (percentage >= 0) return 'bg-blue-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (changePercentage: number) => {
    return changePercentage >= 0 ? 
      <TrendingUp className="h-4 w-4 text-green-600" /> : 
      <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Market Status</h2>
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
          <h2 className="text-2xl font-bold">Market Status</h2>
          <p className="text-muted-foreground">Your investment performance and market insights</p>
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

      {/* Portfolio Overview */}
      {portfolioMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Total Invested</span>
              </div>
              <div className="text-2xl font-bold">
                UGX {portfolioMetrics.totalInvested.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Current Value</span>
              </div>
              <div className="text-2xl font-bold">
                UGX {portfolioMetrics.currentValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                {portfolioMetrics.profitLoss >= 0 ? 
                  <TrendingUp className="h-4 w-4 text-green-600" /> : 
                  <TrendingDown className="h-4 w-4 text-red-600" />
                }
                <span className="text-sm font-medium">Profit/Loss</span>
              </div>
              <div className={`text-2xl font-bold ${portfolioMetrics.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolioMetrics.profitLoss >= 0 ? '+' : ''}UGX {portfolioMetrics.profitLoss.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Return %</span>
              </div>
              <div className={`text-2xl font-bold ${portfolioMetrics.returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolioMetrics.returnPercentage >= 0 ? '+' : ''}{portfolioMetrics.returnPercentage.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Progress */}
      {portfolioMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Investment Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Return Progress</span>
                  <span>{portfolioMetrics.returnPercentage.toFixed(2)}%</span>
                </div>
                <Progress 
                  value={Math.min(Math.abs(portfolioMetrics.returnPercentage), 100)} 
                  className="h-2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shares</p>
                  <p className="text-lg font-semibold">{portfolioMetrics.totalShares.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Buy Price</p>
                  <p className="text-lg font-semibold">UGX {portfolioMetrics.averageBuyPrice.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {marketTrends.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {marketTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(trend.changePercentage)}
                    <span className="font-medium">{trend.period}</span>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${trend.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {trend.changePercentage >= 0 ? '+' : ''}{trend.changePercentage.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      UGX {trend.priceChange.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No trend data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Dividends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Recent Dividend Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dividendHistory.length > 0 ? (
            <div className="space-y-3">
              {dividendHistory.map((dividend, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {dividend.dividend_declarations?.description || 'Dividend Payment'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(dividend.dividend_declarations?.declaration_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      +UGX {dividend.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dividend.shares_owned} shares
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No dividend payments yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Investment Insights */}
      {portfolioMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Investment Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Performance Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Investment Status:</span>
                    <Badge variant={portfolioMetrics.profitLoss >= 0 ? "default" : "secondary"}>
                      {portfolioMetrics.profitLoss >= 0 ? 'Profitable' : 'In Loss'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Performance vs Market:</span>
                    <span className={portfolioMetrics.returnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {portfolioMetrics.returnPercentage >= 0 ? 'Outperforming' : 'Underperforming'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price vs Avg Buy:</span>
                    <span className={portfolioMetrics.currentPrice >= portfolioMetrics.averageBuyPrice ? 'text-green-600' : 'text-red-600'}>
                      {portfolioMetrics.currentPrice >= portfolioMetrics.averageBuyPrice ? 'Above' : 'Below'} Average
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Key Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current Share Price:</span>
                    <span className="font-medium">UGX {portfolioMetrics.currentPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Portfolio Value:</span>
                    <span className="font-medium">UGX {portfolioMetrics.currentValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unrealized P&L:</span>
                    <span className={`font-medium ${portfolioMetrics.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {portfolioMetrics.profitLoss >= 0 ? '+' : ''}UGX {portfolioMetrics.profitLoss.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketStatusScreen;
