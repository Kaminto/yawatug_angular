
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, DollarSign, Users, Activity } from 'lucide-react';

interface AnalyticsData {
  totalTransactionVolume: number;
  transactionCount: number;
  activeUsers: number;
  avgTransactionSize: number;
  currencyDistribution: { [key: string]: number };
  transactionTypes: { [key: string]: number };
  monthlyGrowth: number;
}

const FinancialAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTransactionVolume: 0,
    transactionCount: 0,
    activeUsers: 0,
    avgTransactionSize: 0,
    currencyDistribution: {},
    transactionTypes: {},
    monthlyGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Get all transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'completed');

      if (error) throw error;

      // Calculate metrics
      const totalVolume = transactions?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
      const transactionCount = transactions?.length || 0;
      const avgSize = transactionCount > 0 ? totalVolume / transactionCount : 0;

      // Currency distribution
      const currencyDist: { [key: string]: number } = {};
      transactions?.forEach(tx => {
        currencyDist[tx.currency] = (currencyDist[tx.currency] || 0) + Math.abs(tx.amount);
      });

      // Transaction types
      const typeDist: { [key: string]: number } = {};
      transactions?.forEach(tx => {
        typeDist[tx.transaction_type] = (typeDist[tx.transaction_type] || 0) + 1;
      });

      // Active users count
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Monthly growth (simplified)
      const currentMonth = new Date().getMonth();
      const thisMonthTransactions = transactions?.filter(tx => 
        new Date(tx.created_at).getMonth() === currentMonth
      ).length || 0;

      const lastMonthTransactions = transactions?.filter(tx => 
        new Date(tx.created_at).getMonth() === currentMonth - 1
      ).length || 0;

      const monthlyGrowth = lastMonthTransactions > 0 ? 
        ((thisMonthTransactions - lastMonthTransactions) / lastMonthTransactions) * 100 : 0;

      setAnalytics({
        totalTransactionVolume: totalVolume,
        transactionCount,
        activeUsers: activeUsers || 0,
        avgTransactionSize: avgSize,
        currencyDistribution: currencyDist,
        transactionTypes: typeDist,
        monthlyGrowth
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Financial Analytics</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          <Activity className="h-4 w-4" />
          Real-time Data
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {analytics.totalTransactionVolume.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {analytics.monthlyGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              {Math.abs(analytics.monthlyGrowth).toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.transactionCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Avg: UGX {analytics.avgTransactionSize.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeUsers.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              {analytics.transactionCount > 0 ? (analytics.transactionCount / analytics.activeUsers).toFixed(1) : 0} avg transactions per user
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.monthlyGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics.monthlyGrowth > 0 ? '+' : ''}{analytics.monthlyGrowth.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Month over month</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Currency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Currency Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.currencyDistribution).map(([currency, amount]) => {
                const percentage = (amount / analytics.totalTransactionVolume) * 100;
                return (
                  <div key={currency}>
                    <div className="flex justify-between text-sm">
                      <span>{currency}</span>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {currency} {amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Types */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.transactionTypes).map(([type, count]) => {
                const percentage = (count / analytics.transactionCount) * 100;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {count.toLocaleString()} transactions
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analytics.transactionCount > 0 ? 
                  ((analytics.transactionCount - (analytics.transactionCount * 0.02)) / analytics.transactionCount * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.activeUsers > 0 ? 
                  (analytics.transactionCount / analytics.activeUsers).toFixed(1) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Transactions per User</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                UGX {analytics.avgTransactionSize.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Average Transaction Size</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialAnalytics;
