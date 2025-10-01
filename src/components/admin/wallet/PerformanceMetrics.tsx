
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, Clock, Target } from 'lucide-react';

interface MetricsData {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalVolume: number;
  avgTransactionSize: number;
  userGrowthRate: number;
  transactionGrowthRate: number;
  platformUtilization: number;
}

const PerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<MetricsData>({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    avgTransactionSize: 0,
    userGrowthRate: 0,
    transactionGrowthRate: 0,
    platformUtilization: 0
  });
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [transactionTypeData, setTransactionTypeData] = useState<any[]>([]);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      // Get user metrics
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Get transaction metrics
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, currency, created_at, transaction_type')
        .eq('status', 'completed');

      const totalTransactions = transactions?.length || 0;
      const totalVolume = transactions?.reduce((sum, t) => {
        const amount = t.currency === 'USD' ? t.amount * 3700 : t.amount;
        return sum + Math.abs(amount);
      }, 0) || 0;

      const avgTransactionSize = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

      // Calculate growth rates (simplified - comparing last 30 days to previous 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      const recentTransactions = transactions?.filter(t => 
        new Date(t.created_at) > thirtyDaysAgo
      ).length || 0;

      const previousTransactions = transactions?.filter(t => 
        new Date(t.created_at) > sixtyDaysAgo && new Date(t.created_at) <= thirtyDaysAgo
      ).length || 0;

      const transactionGrowthRate = previousTransactions > 0 
        ? ((recentTransactions - previousTransactions) / previousTransactions) * 100 
        : 0;

      // Monthly transaction data
      const monthlyTransactionData = transactions?.reduce((acc: any, t) => {
        const month = new Date(t.created_at).toISOString().substring(0, 7);
        if (!acc[month]) {
          acc[month] = { month, transactions: 0, volume: 0 };
        }
        acc[month].transactions += 1;
        const amount = t.currency === 'USD' ? Math.abs(t.amount) * 3700 : Math.abs(t.amount);
        acc[month].volume += amount;
        return acc;
      }, {});

      const monthlyData = Object.values(monthlyTransactionData || {}).slice(-6);

      // Transaction type breakdown
      const typeData = transactions?.reduce((acc: any, t) => {
        if (!acc[t.transaction_type]) {
          acc[t.transaction_type] = { name: t.transaction_type, value: 0 };
        }
        acc[t.transaction_type].value += 1;
        return acc;
      }, {});

      const transactionTypeData = Object.values(typeData || {});

      setMetrics({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalTransactions,
        totalVolume,
        avgTransactionSize,
        userGrowthRate: 0, // Simplified for now
        transactionGrowthRate,
        platformUtilization: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
      });

      setMonthlyData(monthlyData);
      setTransactionTypeData(transactionTypeData);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return <div className="animate-pulse">Loading performance metrics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Last 30 days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Platform Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.platformUtilization.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Active/Total</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {metrics.totalVolume.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Transaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {Math.round(metrics.avgTransactionSize).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Growth Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.transactionGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.transactionGrowthRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Transactions</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Transaction Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="transactions" fill="#8884d8" name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transaction Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={transactionTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {transactionTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
