
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ShareData } from '@/types/custom';

interface AdvancedAnalyticsDashboardProps {
  shareData: ShareData;
}

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({ shareData }) => {
  const [analytics, setAnalytics] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load transaction analytics
      const { data: transactions } = await supabase
        .from('share_transactions')
        .select('*')
        .gte('created_at', getDateRange())
        .order('created_at', { ascending: false });

      // Load user activity
      const { data: users } = await supabase
        .from('profiles')
        .select('id, created_at, last_login')
        .eq('status', 'active');

      // Process analytics data
      const processedData = processAnalyticsData(transactions || [], users || []);
      setAnalytics(processedData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };

  const processAnalyticsData = (transactions: any[], users: any[]) => {
    const dailyVolume = transactions.reduce((acc, tx) => {
      const date = new Date(tx.created_at).toDateString();
      acc[date] = (acc[date] || 0) + (tx.quantity * tx.price_per_share);
      return acc;
    }, {});

    const usersByType = users.reduce((acc, user) => {
      const type = user.account_type || 'individual';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalVolume: transactions.reduce((sum, tx) => sum + (tx.quantity * tx.price_per_share), 0),
      totalTransactions: transactions.length,
      activeUsers: users.filter(u => u.last_login && new Date(u.last_login) > new Date(getDateRange())).length,
      dailyVolumeChart: Object.entries(dailyVolume).map(([date, volume]) => ({ date, volume })),
      userTypeChart: Object.entries(usersByType).map(([type, count]) => ({ type, count }))
    };
  };

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Volume,Transactions\n" +
      analytics.dailyVolumeChart?.map((row: any) => `${row.date},${row.volume},${row.transactions || 0}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `share_analytics_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="animate-pulse">Loading analytics...</div>;
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Advanced Analytics Dashboard</h3>
        <div className="flex gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">
                  {shareData.currency} {analytics.totalVolume?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{analytics.totalTransactions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{analytics.activeUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg. Price</p>
                <p className="text-2xl font-bold">
                  {shareData.currency} {shareData.price_per_share.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.dailyVolumeChart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="volume" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.userTypeChart || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(analytics.userTypeChart || []).map((entry: any, index: number) => (
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

export default AdvancedAnalyticsDashboard;
