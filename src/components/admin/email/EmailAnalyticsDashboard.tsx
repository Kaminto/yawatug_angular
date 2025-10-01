import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  DollarSign, 
  TrendingUp,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface EmailAnalytics {
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  total_failed: number;
  total_cost: number;
  delivery_rate: number;
  bounce_rate: number;
  daily_breakdown: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  }>;
}

interface EmailProvider {
  id: string;
  name: string;
  provider_type: string;
  is_active: boolean;
  priority: number;
  cost_per_email: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  template_type: string;
  is_active: boolean;
}

interface RecentEmail {
  id: string;
  email_address: string;
  subject: string;
  status: string;
  cost: number;
  sent_at: string;
  provider_id: string;
  template_id: string;
}

const EmailAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Load analytics data
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('email_analytics')
        .select('*')
        .gte('analytics_date', startDate.toISOString().split('T')[0])
        .lte('analytics_date', endDate.toISOString().split('T')[0]);

      if (analyticsError) throw analyticsError;

      // Process analytics data
      const processedAnalytics = processAnalyticsData(analyticsData || []);
      setAnalytics(processedAnalytics);

      // Load providers
      const { data: providersData, error: providersError } = await supabase
        .from('email_providers')
        .select('*')
        .order('priority');

      if (providersError) throw providersError;
      setProviders(providersData || []);

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Load recent emails - map to expected interface with defaults
      const { data: recentEmailsData, error: recentEmailsError } = await supabase
        .from('email_delivery_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentEmailsError) throw recentEmailsError;
      
      // Map database fields to component interface with safe defaults
      const mappedEmails = (recentEmailsData || []).map(email => ({
        ...email,
        cost: 0, // Default value for cost field
        provider_id: email.provider || 'unknown', // Use provider field or default
        template_id: null // Set to null as default since field may not exist
      }));
      
      setRecentEmails(mappedEmails);

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load email analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (data: any[]): EmailAnalytics => {
    const totals = data.reduce((acc, item) => ({
      total_sent: acc.total_sent + (item.total_sent || 0),
      total_delivered: acc.total_delivered + (item.total_delivered || 0),
      total_bounced: acc.total_bounced + (item.total_bounced || 0),
      total_failed: acc.total_failed + (item.total_failed || 0),
      total_cost: acc.total_cost + (parseFloat(item.total_cost) || 0),
    }), {
      total_sent: 0,
      total_delivered: 0,
      total_bounced: 0,
      total_failed: 0,
      total_cost: 0,
    });

    const deliveryRate = totals.total_sent > 0 ? (totals.total_delivered / totals.total_sent) * 100 : 0;
    const bounceRate = totals.total_sent > 0 ? (totals.total_bounced / totals.total_sent) * 100 : 0;

    // Group by date for daily breakdown
    const dailyBreakdown = data.reduce((acc: any[], item) => {
      const date = item.analytics_date;
      const existing = acc.find(entry => entry.date === date);
      
      if (existing) {
        existing.sent += item.total_sent || 0;
        existing.delivered += item.total_delivered || 0;
        existing.failed += item.total_failed || 0;
        existing.cost += parseFloat(item.total_cost) || 0;
      } else {
        acc.push({
          date,
          sent: item.total_sent || 0,
          delivered: item.total_delivered || 0,
          failed: item.total_failed || 0,
          cost: parseFloat(item.total_cost) || 0,
        });
      }
      
      return acc;
    }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      ...totals,
      delivery_rate: deliveryRate,
      bounce_rate: bounceRate,
      daily_breakdown: dailyBreakdown,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'bounced': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pieChartData = analytics ? [
    { name: 'Delivered', value: analytics.total_delivered, color: '#22c55e' },
    { name: 'Failed', value: analytics.total_failed, color: '#ef4444' },
    { name: 'Bounced', value: analytics.total_bounced, color: '#f59e0b' },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yawatu-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email Analytics Dashboard</h2>
          <p className="text-muted-foreground">Monitor email delivery performance and costs</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_sent || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics?.delivery_rate.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {analytics?.bounce_rate.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics?.total_cost.toFixed(4) || '0.0000'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="recent">Recent Emails</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Email Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.daily_breakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="delivered" stroke="#22c55e" strokeWidth={2} />
                    <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle>Email Providers</CardTitle>
              <CardDescription>Configure and manage email service providers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Type: {provider.provider_type} | Priority: {provider.priority} | 
                        Cost: ${provider.cost_per_email}/email
                      </p>
                    </div>
                    <Badge variant={provider.is_active ? "default" : "secondary"}>
                      {provider.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Manage email templates for different purposes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Type: {template.template_type}
                      </p>
                    </div>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Email Deliveries</CardTitle>
              <CardDescription>Latest email sending activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEmails.map((email) => (
                  <div key={email.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium truncate">{email.subject}</h3>
                      <p className="text-sm text-muted-foreground">
                        To: {email.email_address} | Cost: ${email.cost}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(email.sent_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(email.status)}>
                      {email.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailAnalyticsDashboard;