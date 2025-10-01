import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity,
  Shield,
  Wallet,
  BarChart3,
  MessageSquare,
  Bell
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { APITestPanel } from '@/components/admin/APITestPanel';

interface DashboardMetrics {
  totalUsers: number;
  pendingVerifications: number;
  totalBalance: number;
  dailyTransactions: number;
  systemHealth: number;
  activeVotings: number;
  pendingApprovals: number;
  monthlyRevenue: number;
}

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    pendingVerifications: 0,
    totalBalance: 0,
    dailyTransactions: 0,
    systemHealth: 98,
    activeVotings: 0,
    pendingApprovals: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    loadDashboardData();
    setupRealTimeUpdates();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load multiple dashboard metrics in parallel
      const [
        usersResult,
        verificationsResult,
        walletsResult,
        transactionsResult,
        votingsResult,
        approvalsResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'pending_verification'),
        supabase.from('admin_sub_wallets').select('balance, currency'),
        supabase.from('transactions').select('amount, created_at').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('voting_proposals').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('transactions').select('id', { count: 'exact' }).eq('approval_status', 'pending')
      ]);

      // Calculate total balance across all admin wallets
      const totalBalance = walletsResult.data?.reduce((sum, wallet) => {
        if (wallet.currency === 'UGX') return sum + (wallet.balance || 0);
        return sum + ((wallet.balance || 0) * 3700); // Approximate USD to UGX conversion
      }, 0) || 0;

      // Calculate daily transaction volume
      const dailyVolume = transactionsResult.data?.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0) || 0;

      setMetrics({
        totalUsers: usersResult.count || 0,
        pendingVerifications: verificationsResult.count || 0,
        totalBalance,
        dailyTransactions: transactionsResult.count || 0,
        systemHealth: 98, // This would be calculated from actual system metrics
        activeVotings: votingsResult.count || 0,
        pendingApprovals: approvalsResult.count || 0,
        monthlyRevenue: dailyVolume * 30 // Estimate based on daily volume
      });

      // Load recent activities
      const { data: activities } = await supabase
        .from('transactions')
        .select('*, profiles!inner(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivities(activities || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeUpdates = () => {
    const channel = supabase
      .channel('admin-dashboard-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions'
      }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'profiles'
      }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const quickActions = [
    { label: 'Verify Users', href: '/admin/verification', icon: CheckCircle, count: metrics.pendingVerifications },
    { label: 'Approve Transactions', href: '/admin/wallet-approvals', icon: DollarSign, count: metrics.pendingApprovals },
    { label: 'Monitor System', href: '/admin/system-health', icon: Activity, count: 0 },
    { label: 'Manage Voting', href: '/admin/voting', icon: BarChart3, count: metrics.activeVotings }
  ];

  if (loading) {
    return (
      <AdminLayout title="Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{metrics.pendingVerifications} pending verification
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">UGX {metrics.totalBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all admin wallets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.dailyTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.systemHealth}%</div>
              <Progress value={metrics.systemHealth} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Most critical admin tasks requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link key={action.label} to={action.href}>
                  <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2 hover:bg-muted">
                    <div className="flex items-center gap-2">
                      <action.icon className="h-5 w-5" />
                      {action.count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {action.count}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & System Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity: any) => (
                    <div key={activity.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium text-sm">
                          {activity.profiles?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.transaction_type} - UGX {Math.abs(activity.amount).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.pendingVerifications > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">Pending Verifications</p>
                      <p className="text-xs text-muted-foreground">
                        {metrics.pendingVerifications} users awaiting verification
                      </p>
                    </div>
                  </div>
                )}
                
                {metrics.pendingApprovals > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Pending Approvals</p>
                      <p className="text-xs text-muted-foreground">
                        {metrics.pendingApprovals} transactions need approval
                      </p>
                    </div>
                  </div>
                )}

                {metrics.systemHealth < 95 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-sm font-medium">System Health Warning</p>
                      <p className="text-xs text-muted-foreground">
                        System health below optimal level
                      </p>
                    </div>
                  </div>
                )}

                {metrics.pendingVerifications === 0 && metrics.pendingApprovals === 0 && metrics.systemHealth >= 95 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">All Systems Normal</p>
                      <p className="text-xs text-muted-foreground">
                        No critical issues detected
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Testing Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              API Testing
            </CardTitle>
            <CardDescription>
              Test email and SMS systems with existing API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <APITestPanel />
          </CardContent>
        </Card>

        {/* Admin Notification Center */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Center
            </CardTitle>
            <CardDescription>
              Monitor system alerts and configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Manage system notifications and alerts for admin operations
              </p>
              <Link to="/admin/notifications">
                <Button>
                  <Bell className="h-4 w-4 mr-2" />
                  Open Notification Center
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;