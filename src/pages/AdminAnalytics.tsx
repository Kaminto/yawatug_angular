import React, { useState, useEffect } from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Users, TrendingUp, Activity, Download, BarChart3 } from 'lucide-react';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalUsers: 0,
    totalShares: 0,
    totalTransactions: 0,
    monthlyData: [],
    userTypes: [],
    transactionTypes: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Load basic stats
      const [
        { count: totalUsers },
        { data: transactions },
        { data: shares },
        { data: profiles }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount, currency, transaction_type, created_at'),
        supabase.from('shares').select('*'),
        supabase.from('profiles').select('user_type')
      ]);

      const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const totalShares = shares?.reduce((sum, s) => sum + (s.total_shares || 0), 0) || 0;

      // Process user types
      const userTypeCounts = profiles?.reduce((acc: any, profile) => {
        const type = profile.user_type || 'individual';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const userTypes = Object.entries(userTypeCounts || {}).map(([name, value]) => ({
        name,
        value
      }));

      // Process transaction types
      const transactionTypeCounts = transactions?.reduce((acc: any, transaction) => {
        const type = transaction.transaction_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const transactionTypes = Object.entries(transactionTypeCounts || {}).map(([name, value]) => ({
        name,
        value
      }));

      // Generate monthly data (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en', { month: 'short' });
        
        const monthTransactions = transactions?.filter(t => {
          const tDate = new Date(t.created_at);
          return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
        }) || [];

        monthlyData.push({
          month: monthName,
          transactions: monthTransactions.length,
          revenue: monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
        });
      }

      setAnalytics({
        totalRevenue,
        totalUsers: totalUsers || 0,
        totalShares,
        totalTransactions: transactions?.length || 0,
        monthlyData,
        userTypes,
        transactionTypes
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <UnifiedLayout title="Analytics & Reports" breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Analytics & Reports' }
      ]}>
        <div className="animate-pulse">Loading analytics...</div>
      </UnifiedLayout>
    );
  }

  return (
    <UnifiedLayout title="Analytics & Reports" breadcrumbs={[
      { label: 'Admin', href: '/admin' },
      { label: 'Analytics & Reports' }
    ]}>
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">UGX {analytics.totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalShares.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalTransactions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="revenue">
              <span className="hidden sm:inline">Revenue Trends</span>
              <span className="sm:hidden">Revenue</span>
            </TabsTrigger>
            <TabsTrigger value="users">
              <span className="hidden sm:inline">User Analytics</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <span className="hidden sm:inline">Transaction Analysis</span>
              <span className="sm:hidden">Txns</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue & Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue (UGX)" />
                    <Bar dataKey="transactions" fill="#82ca9d" name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={analytics.userTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.userTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={analytics.transactionTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
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
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                View Trends
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Detailed Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </UnifiedLayout>
  );
};

export default AdminAnalytics;
