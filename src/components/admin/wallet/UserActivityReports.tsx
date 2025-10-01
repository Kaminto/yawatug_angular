
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Users, Activity, TrendingUp } from 'lucide-react';

interface UserActivityData {
  user_id: string;
  user_email: string;
  full_name: string;
  last_login: string;
  login_count: number;
  transaction_count: number;
  total_volume: number;
  status: string;
}

const UserActivityReports = () => {
  const [userActivity, setUserActivity] = useState<UserActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30');
  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    loadUserActivity();
  }, [timeframe]);

  const loadUserActivity = async () => {
    try {
      // Get user data with profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('last_login', { ascending: false });

      if (profilesError) throw profilesError;

      // Get transaction data for activity analysis
      const daysAgo = parseInt(timeframe);
      const dateThreshold = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('user_id, amount, currency, created_at')
        .gte('created_at', dateThreshold.toISOString());

      if (transactionsError) throw transactionsError;

      // Group transactions by user
      const userTransactions = transactions?.reduce((acc: any, transaction) => {
        if (!acc[transaction.user_id]) {
          acc[transaction.user_id] = { count: 0, volume: 0 };
        }
        acc[transaction.user_id].count += 1;
        const amount = transaction.currency === 'USD' ? Math.abs(transaction.amount) * 3700 : Math.abs(transaction.amount);
        acc[transaction.user_id].volume += amount;
        return acc;
      }, {});

      // Combine profile and transaction data
      const activityData = profiles?.map(profile => ({
        user_id: profile.id,
        user_email: profile.email,
        full_name: profile.full_name || 'N/A',
        last_login: profile.last_login,
        login_count: profile.login_count || 0,
        transaction_count: userTransactions?.[profile.id]?.count || 0,
        total_volume: userTransactions?.[profile.id]?.volume || 0,
        status: profile.status || 'unknown'
      })) || [];

      setUserActivity(activityData);

      // Create daily activity chart data
      const dailyActivity = transactions?.reduce((acc: any, transaction) => {
        const date = new Date(transaction.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, transactions: 0, unique_users: new Set() };
        }
        acc[date].transactions += 1;
        acc[date].unique_users.add(transaction.user_id);
        return acc;
      }, {});

      const chartData = Object.entries(dailyActivity || {}).map(([date, data]: [string, any]) => ({
        date,
        transactions: data.transactions,
        unique_users: data.unique_users.size
      })).slice(-14); // Last 14 days

      setActivityData(chartData);
    } catch (error) {
      console.error('Error loading user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const headers = ['Email', 'Full Name', 'Last Login', 'Login Count', 'Transaction Count', 'Total Volume (UGX)', 'Status'];
    const csvData = userActivity.map(user => [
      user.user_email,
      user.full_name,
      user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never',
      user.login_count,
      user.transaction_count,
      user.total_volume,
      user.status
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-activity-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const activeUsers = userActivity.filter(user => 
    user.last_login && new Date(user.last_login) > new Date(Date.now() - parseInt(timeframe) * 24 * 60 * 60 * 1000)
  ).length;

  const totalTransactions = userActivity.reduce((sum, user) => sum + user.transaction_count, 0);
  const totalVolume = userActivity.reduce((sum, user) => sum + user.total_volume, 0);

  if (loading) {
    return <div className="animate-pulse">Loading user activity reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">User Activity Reports</h3>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userActivity.length.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">{activeUsers.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Last {timeframe} days</div>
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
            <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {totalVolume.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="transactions" fill="#8884d8" name="Transactions" />
              <Bar dataKey="unique_users" fill="#82ca9d" name="Active Users" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* User Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Login Count</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userActivity.slice(0, 50).map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">
                    {user.full_name}
                  </TableCell>
                  <TableCell>{user.user_email}</TableCell>
                  <TableCell>
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>{user.login_count}</TableCell>
                  <TableCell>{user.transaction_count}</TableCell>
                  <TableCell className="font-mono">
                    UGX {user.total_volume.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      user.status === 'active' ? 'default' :
                      user.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {user.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityReports;
