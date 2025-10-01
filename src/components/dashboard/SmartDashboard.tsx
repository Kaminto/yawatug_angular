import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, 
  TrendingUp, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Activity,
  PieChart,
  DollarSign,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BusinessSummary from '@/components/business/BusinessSummary';

interface SmartDashboardProps {
  wallet: any;
  userShares: any[];
  transactions: any[];
  loading?: boolean;
  onRefresh?: () => void;
}

const SmartDashboard: React.FC<SmartDashboardProps> = ({
  wallet,
  userShares,
  transactions,
  loading = false,
  onRefresh
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [showValues, setShowValues] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: 0,
    todayChange: 0,
    changePercent: 0
  });

  useEffect(() => {
    calculatePortfolioStats();
  }, [userShares]);

  const calculatePortfolioStats = () => {
    if (!userShares.length) return;
    
    const totalValue = userShares.reduce((sum, share) => 
      sum + (share.quantity * share.shares?.price_per_share || 0), 0
    );
    
    // Mock today's change calculation (in real app, would come from API)
    const changePercent = Math.random() * 10 - 5; // -5% to +5%
    const todayChange = totalValue * (changePercent / 100);
    
    setPortfolioStats({ totalValue, todayChange, changePercent });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    if (!showValues) return '••••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number, currency: string = 'USD') => {
    if (!showValues) return '••••••';
    if (amount >= 1000000) {
      return `${currency === 'USD' ? '$' : 'UGX '}${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${currency === 'USD' ? '$' : 'UGX '}${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount, currency);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalAssets = (wallet?.balance || 0) + portfolioStats.totalValue;
  const recentTransactions = transactions.slice(0, isMobile ? 3 : 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <img 
          src="/yawatu-logo.png" 
          alt="Yawatu" 
          className="h-8 w-8 object-contain drop-shadow-sm"
        />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground">Your financial overview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowValues(!showValues)}
            className="p-2"
          >
            {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="elegant-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-primary" />
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCompactCurrency(totalAssets, wallet?.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Wallet + Portfolio
            </p>
          </CardContent>
        </Card>

        <Card className="elegant-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Wallet className="h-4 w-4 mr-2 text-blue-500" />
              Cash Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCompactCurrency(wallet?.balance || 0, wallet?.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Available funds
            </p>
          </CardContent>
        </Card>

        <Card className="elegant-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <PieChart className="h-4 w-4 mr-2 text-green-500" />
              Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCompactCurrency(portfolioStats.totalValue, wallet?.currency)}
            </div>
            <div className="flex items-center text-xs">
              {portfolioStats.changePercent >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={portfolioStats.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                {showValues ? `${portfolioStats.changePercent.toFixed(1)}%` : '••••'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="elegant-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2 text-orange-500" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Recent transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="elegant-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center">
            <Zap className="h-5 w-5 mr-2 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Button asChild className="h-12 flex-col gap-1 bg-primary hover:bg-primary/90">
              <Link to="/wallet">
                <Plus className="h-4 w-4" />
                <span className="text-xs">Add Funds</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-12 flex-col gap-1">
              <Link to="/shares">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Buy Shares</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-12 flex-col gap-1">
              <Link to="/portfolio">
                <PieChart className="h-4 w-4" />
                <span className="text-xs">Portfolio</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-12 flex-col gap-1">
              <Link to="/transactions">
                <Activity className="h-4 w-4" />
                <span className="text-xs">History</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business Summary */}
      <BusinessSummary showExport={false} />

      {/* Mobile-optimized Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          {!isMobile && <TabsTrigger value="portfolio">Portfolio</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="elegant-card">
            <CardHeader>
              <CardTitle className="text-lg">Wallet Overview</CardTitle>
              <CardDescription>Your cash balances and payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(wallet?.balance || 0, wallet?.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {wallet?.currency} Balance
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" asChild>
                    <Link to="/wallet">Manage</Link>
                  </Button>
                </div>
              </div>
              
              {wallet?.balance > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Investment Power</span>
                    <span className="text-sm font-medium">
                      {Math.floor((wallet?.balance || 0) / 100)} shares available
                    </span>
                  </div>
                  <Progress value={Math.min((wallet?.balance || 0) / 1000 * 100, 100)} className="mt-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {userShares.length > 0 && (
            <Card className="elegant-card">
              <CardHeader>
                <CardTitle className="text-lg">Top Holdings</CardTitle>
                <CardDescription>Your best performing shares</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userShares.slice(0, 3).map((share, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{share.shares?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {share.quantity} shares
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(share.quantity * (share.shares?.price_per_share || 0), share.currency)}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          @{formatCurrency(share.shares?.price_per_share || 0, share.currency)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                {userShares.length > 3 && (
                  <Button variant="outline" size="sm" asChild className="w-full mt-4">
                    <Link to="/portfolio">View All Holdings</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card className="elegant-card">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Your latest transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {recentTransactions.map((tx, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          tx.transaction_type === 'deposit' ? 'bg-green-100 text-green-600' :
                          tx.transaction_type === 'withdrawal' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {tx.transaction_type === 'deposit' ? <ArrowUpRight className="h-4 w-4" /> :
                           tx.transaction_type === 'withdrawal' ? <ArrowDownRight className="h-4 w-4" /> :
                           <Activity className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {tx.transaction_type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, tx.currency)}
                        </p>
                        <Badge variant={tx.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No recent activity</p>
                  <Button size="sm" asChild className="mt-4">
                    <Link to="/wallet">Start Trading</Link>
                  </Button>
                </div>
              )}
              
              {transactions.length > recentTransactions.length && (
                <Button variant="outline" size="sm" asChild className="w-full mt-4">
                  <Link to="/transactions">View All Activity</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <BusinessSummary showExport={true} />
        </TabsContent>

        {!isMobile && (
          <TabsContent value="portfolio" className="space-y-4">
            <Card className="elegant-card">
              <CardHeader>
                <CardTitle className="text-lg">Portfolio Performance</CardTitle>
                <CardDescription>Your investment breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {userShares.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {formatCompactCurrency(portfolioStats.totalValue, wallet?.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Value</p>
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${portfolioStats.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {showValues ? `${portfolioStats.changePercent.toFixed(1)}%` : '••••'}
                        </p>
                        <p className="text-sm text-muted-foreground">Today's Change</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {userShares.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Holdings</p>
                      </div>
                    </div>
                    
                    <Button asChild className="w-full">
                      <Link to="/portfolio">View Full Portfolio</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No investments yet</p>
                    <Button size="sm" asChild className="mt-4">
                      <Link to="/shares">Start Investing</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SmartDashboard;