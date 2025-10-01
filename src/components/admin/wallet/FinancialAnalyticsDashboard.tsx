
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AnalyticsData {
  totalRevenue: number;
  totalUsers: number;
  totalTransactions: number;
  avgTransactionValue: number;
  revenueGrowth: number;
  userGrowth: number;
  monthlyRevenue: any[];
  transactionTypes: any[];
  topUsers: any[];
}

const FinancialAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalUsers: 0,
    totalTransactions: 0,
    avgTransactionValue: 0,
    revenueGrowth: 0,
    userGrowth: 0,
    monthlyRevenue: [],
    transactionTypes: [],
    topUsers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total transactions and revenue
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, currency, created_at, transaction_type, user_id')
        .eq('status', 'completed');

      // Calculate metrics
      const totalTransactions = transactions?.length || 0;
      const totalRevenue = transactions?.reduce((sum, t) => {
        const amount = t.currency === 'USD' ? t.amount * 3700 : t.amount;
        return sum + (t.amount > 0 ? amount : 0);
      }, 0) || 0;

      const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Group by month for revenue chart
      const monthlyData = transactions?.reduce((acc: any, t) => {
        const month = new Date(t.created_at).toISOString().substring(0, 7);
        const amount = t.currency === 'USD' ? t.amount * 3700 : t.amount;
        
        if (!acc[month]) {
          acc[month] = { month, revenue: 0, transactions: 0 };
        }
        if (t.amount > 0) {
          acc[month].revenue += amount;
        }
        acc[month].transactions += 1;
        return acc;
      }, {});

      const monthlyRevenue = Object.values(monthlyData || {});

      // Group by transaction type
      const typeData = transactions?.reduce((acc: any, t) => {
        if (!acc[t.transaction_type]) {
          acc[t.transaction_type] = { name: t.transaction_type, value: 0, count: 0 };
        }
        acc[t.transaction_type].count += 1;
        const amount = t.currency === 'USD' ? Math.abs(t.amount) * 3700 : Math.abs(t.amount);
        acc[t.transaction_type].value += amount;
        return acc;
      }, {});

      const transactionTypes = Object.values(typeData || {});

      // Top users by transaction volume
      const userVolumes = transactions?.reduce((acc: any, t) => {
        if (!acc[t.user_id]) {
          acc[t.user_id] = { user_id: t.user_id, volume: 0, transactions: 0 };
        }
        const amount = t.currency === 'USD' ? Math.abs(t.amount) * 3700 : Math.abs(t.amount);
        acc[t.user_id].volume += amount;
        acc[t.user_id].transactions += 1;
        return acc;
      }, {});

      const topUserIds = Object.values(userVolumes || {})
        .sort((a: any, b: any) => b.volume - a.volume)
        .slice(0, 5);

      // Get user names for top users
      const topUsers = await Promise.all(
        topUserIds.map(async (user: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.user_id)
            .single();
          
          return {
            ...user,
            name: profile?.full_name || 'Unknown',
            email: profile?.email || 'Unknown'
          };
        })
      );

      setAnalytics({
        totalRevenue,
        totalUsers: userCount || 0,
        totalTransactions,
        avgTransactionValue,
        revenueGrowth: 12.5, // Placeholder
        userGrowth: 8.3, // Placeholder
        monthlyRevenue,
        transactionTypes,
        topUsers
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return <div className="animate-pulse">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {analytics.totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {analytics.revenueGrowth}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalUsers.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {analytics.userGrowth}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalTransactions.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              All completed transactions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Avg Transaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {Math.round(analytics.avgTransactionValue).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Per transaction value
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transaction Types */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.transactionTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.transactionTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle>Top Users by Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topUsers.map((user: any, index) => (
                <div key={user.user_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">UGX {user.volume.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{user.transactions} transactions</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialAnalyticsDashboard;
