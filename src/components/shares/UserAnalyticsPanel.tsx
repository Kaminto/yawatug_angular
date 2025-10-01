
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, TrendingUp, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdvancedPortfolioInsights from './AdvancedPortfolioInsights';

interface UserAnalyticsPanelProps {
  userShares: any[];
  stats: any;
  userId: string;
}

const UserAnalyticsPanel: React.FC<UserAnalyticsPanelProps> = ({
  userShares,
  stats,
  userId
}) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTransactionHistory();
  }, [userId]);

  const loadTransactionHistory = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('transaction_type', 'share_purchase')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error) {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock performance data for charts
  const performanceData = [
    { date: '2024-01', value: (stats?.totalInvestment || 0) * 0.8 },
    { date: '2024-02', value: (stats?.totalInvestment || 0) * 0.85 },
    { date: '2024-03', value: (stats?.totalInvestment || 0) * 0.92 },
    { date: '2024-04', value: (stats?.totalInvestment || 0) * 0.88 },
    { date: '2024-05', value: (stats?.totalInvestment || 0) * 0.95 },
    { date: '2024-06', value: stats?.currentValue || 0 },
  ];

  const monthlyData = transactions.reduce((acc: any[], transaction) => {
    const month = new Date(transaction.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const existing = acc.find(item => item.month === month);
    
    if (existing) {
      existing.amount += Math.abs(transaction.amount || 0);
      existing.count += 1;
    } else {
      acc.push({
        month,
        amount: Math.abs(transaction.amount || 0),
        count: 1
      });
    }
    
    return acc;
  }, []);

  const exportData = (type: 'csv' | 'pdf') => {
    // Implementation for export functionality
    console.log(`Exporting ${type} report...`);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Analytics</h2>
          <p className="text-muted-foreground">Detailed insights into your investment performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportData('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('pdf')}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Average Buy Price</p>
              <p className="text-2xl font-bold">
                UGX {userShares.length > 0 && stats?.totalInvestment
                  ? (stats.totalInvestment / userShares.reduce((sum, share) => sum + (share.quantity || 0), 0)).toLocaleString()
                  : '0'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Unrealized Gain/Loss</p>
              <p className={`text-2xl font-bold ${(stats?.totalGainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(stats?.totalGainLoss || 0) >= 0 ? '+' : ''}UGX {(stats?.totalGainLoss || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Holding Period</p>
              <p className="text-2xl font-bold">
                {userShares.length > 0 
                  ? Math.floor((Date.now() - new Date(userShares[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
                  : 0
                } days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`UGX ${Number(value).toLocaleString()}`, 'Portfolio Value']} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={{ fill: '#2563eb', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <AdvancedPortfolioInsights 
            userId={userId}
            userShares={userShares}
            currentSharePrice={stats?.currentValue / stats?.totalShares || 0}
          />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Investment Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`UGX ${Number(value).toLocaleString()}`, 'Investment Amount']} />
                    <Bar dataKey="amount" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{transaction.transaction_type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">UGX {Math.abs(transaction.amount || 0).toLocaleString()}</p>
                      <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="h-20 flex flex-col gap-2" onClick={() => exportData('pdf')}>
                  <FileText className="h-6 w-6" />
                  Portfolio Summary Report
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => exportData('csv')}>
                  <Download className="h-6 w-6" />
                  Transaction History (CSV)
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <TrendingUp className="h-6 w-6" />
                  Performance Analysis
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Calendar className="h-6 w-6" />
                  Tax Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserAnalyticsPanel;
