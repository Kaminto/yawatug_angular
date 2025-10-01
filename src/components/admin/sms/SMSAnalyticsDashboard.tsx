import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  MessageSquare, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';

interface SMSAnalytics {
  id: string;
  date: string;
  provider_id: string;
  provider_name: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  success_rate: number;
  total_cost: number;
  avg_delivery_time_seconds: number;
}

interface SMSProvider {
  id: string;
  provider_name: string;
  provider_type: string;
  is_active: boolean;
  success_rate: number;
  cost_per_sms: number;
  avg_delivery_time_seconds: number;
}

interface SMSBudget {
  id: string;
  budget_name: string;
  monthly_budget_limit: number;
  daily_budget_limit: number;
  current_month_spent: number;
  current_day_spent: number;
  alert_threshold_percent: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const SMSAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<SMSAnalytics[]>([]);
  const [providers, setProviders] = useState<SMSProvider[]>([]);
  const [budget, setBudget] = useState<SMSBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');
  const { toast } = useToast();

  useEffect(() => {
    loadSMSData();
  }, [timeRange]);

  const loadSMSData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      // Load analytics data
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('sms_analytics')
        .select(`
          *,
          sms_providers(provider_name)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (analyticsError) throw analyticsError;

      // Transform analytics data to include provider_name
      const transformedAnalytics = analyticsData?.map(item => ({
        ...item,
        provider_name: item.sms_providers?.provider_name || 'Unknown'
      })) || [];

      // Load providers data
      const { data: providersData, error: providersError } = await supabase
        .from('sms_providers')
        .select('*')
        .order('priority_order');

      if (providersError) throw providersError;

      // Load budget data
      const { data: budgetData, error: budgetError } = await supabase
        .from('sms_budget_controls')
        .select('*')
        .eq('is_active', true)
        .single();

      if (budgetError && budgetError.code !== 'PGRST116') {
        console.error('Budget error:', budgetError);
      }

      setAnalytics(transformedAnalytics);
      setProviders(providersData || []);
      setBudget(budgetData);

    } catch (error) {
      console.error('Error loading SMS data:', error);
      toast({
        title: "Error",
        description: "Failed to load SMS analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const summaryStats = analytics.reduce((acc, item) => {
    acc.totalSent += item.total_sent;
    acc.totalDelivered += item.total_delivered;
    acc.totalFailed += item.total_failed;
    acc.totalCost += item.total_cost;
    return acc;
  }, { totalSent: 0, totalDelivered: 0, totalFailed: 0, totalCost: 0 });

  const overallSuccessRate = summaryStats.totalSent > 0 
    ? (summaryStats.totalDelivered / summaryStats.totalSent) * 100 
    : 0;

  // Prepare chart data
  const dailyData = analytics.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    sent: item.total_sent,
    delivered: item.total_delivered,
    failed: item.total_failed,
    cost: item.total_cost
  }));

  const providerData = providers.map(provider => {
    const providerStats = analytics
      .filter(item => item.provider_id === provider.id)
      .reduce((acc, item) => {
        acc.sent += item.total_sent;
        acc.delivered += item.total_delivered;
        acc.cost += item.total_cost;
        return acc;
      }, { sent: 0, delivered: 0, cost: 0 });

    return {
      name: provider.provider_name,
      sent: providerStats.sent,
      delivered: providerStats.delivered,
      cost: providerStats.cost,
      successRate: providerStats.sent > 0 ? (providerStats.delivered / providerStats.sent) * 100 : 0
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SMS Analytics</h2>
          <p className="text-muted-foreground">
            Monitor SMS delivery performance and costs
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>
          <Button onClick={loadSMSData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SMS Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.totalDelivered.toLocaleString()} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallSuccessRate.toFixed(1)}%</div>
            <div className="flex items-center space-x-2 text-xs">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-green-500">{summaryStats.totalDelivered}</span>
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="text-red-500">{summaryStats.totalFailed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summaryStats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${(summaryStats.totalCost / (summaryStats.totalSent || 1)).toFixed(4)} per SMS
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.filter(p => p.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              of {providers.length} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Status */}
      {budget && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Status</CardTitle>
            <CardDescription>Current spending against limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Daily Budget</span>
                  <span className="text-sm text-muted-foreground">
                    ${budget.current_day_spent.toFixed(2)} / ${budget.daily_budget_limit.toFixed(2)}
                  </span>
                </div>
                <Progress 
                  value={(budget.current_day_spent / budget.daily_budget_limit) * 100} 
                  className="mb-2"
                />
                {budget.current_day_spent / budget.daily_budget_limit > budget.alert_threshold_percent / 100 && (
                  <div className="flex items-center text-yellow-600 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Budget threshold exceeded
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Monthly Budget</span>
                  <span className="text-sm text-muted-foreground">
                    ${budget.current_month_spent.toFixed(2)} / ${budget.monthly_budget_limit.toFixed(2)}
                  </span>
                </div>
                <Progress 
                  value={(budget.current_month_spent / budget.monthly_budget_limit) * 100} 
                  className="mb-2"
                />
                {budget.current_month_spent / budget.monthly_budget_limit > budget.alert_threshold_percent / 100 && (
                  <div className="flex items-center text-yellow-600 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Budget threshold exceeded
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily SMS Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="delivered" fill="#00C49F" name="Delivered" />
                    <Bar dataKey="failed" fill="#FF8042" name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Provider Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={providerData}
                      dataKey="sent"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {providerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance</CardTitle>
              <CardDescription>Compare SMS provider statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providers.map((provider) => {
                  const stats = providerData.find(p => p.name === provider.provider_name);
                  return (
                    <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h4 className="font-medium">{provider.provider_name}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant={provider.is_active ? "default" : "secondary"}>
                              {provider.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline">{provider.provider_type}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {stats?.sent || 0} sent | {stats?.successRate.toFixed(1) || 0}% success
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${provider.cost_per_sms.toFixed(4)} per SMS
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cost" stroke="#8884d8" name="Daily Cost ($)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SMSAnalyticsDashboard;