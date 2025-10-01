import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  DollarSign, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  RefreshCw,
  Plus,
  Eye,
  Wallet,
  Activity,
  Bell
} from 'lucide-react';

interface DashboardMetrics {
  totalAdminFunds: { [currency: string]: number };
  totalUserWalletBalance: { [currency: string]: number };
  pendingApprovals: number;
  todayTransactions: number;
  activeUsers: number;
  systemHealth: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'transaction' | 'user' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  amount?: number;
  currency?: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

const EnhancedWalletDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalAdminFunds: {},
    totalUserWalletBalance: {},
    pendingApprovals: 0,
    todayTransactions: 0,
    activeUsers: 0,
    systemHealth: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadAdminFunds(),
        loadUserWalletBalances(),
        loadTransactionMetrics(),
        loadUserMetrics(),
        loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAdminFunds = async () => {
    const { data: adminWallets, error } = await supabase
      .from('admin_sub_wallets')
      .select('currency, balance');

    if (error) throw error;

    const totalFunds: { [currency: string]: number } = {};
    adminWallets?.forEach(wallet => {
      totalFunds[wallet.currency] = (totalFunds[wallet.currency] || 0) + wallet.balance;
    });

    setMetrics(prev => ({ ...prev, totalAdminFunds: totalFunds }));
  };

  const loadUserWalletBalances = async () => {
    const { data: userWallets, error } = await supabase
      .from('wallets')
      .select('currency, balance');

    if (error) throw error;

    const totalBalances: { [currency: string]: number } = {};
    userWallets?.forEach(wallet => {
      totalBalances[wallet.currency] = (totalBalances[wallet.currency] || 0) + wallet.balance;
    });

    setMetrics(prev => ({ ...prev, totalUserWalletBalance: totalBalances }));
  };

  const loadTransactionMetrics = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingResult, todayResult, healthResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending'),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase
        .from('transactions')
        .select('status')
    ]);

    const pendingApprovals = pendingResult.count || 0;
    const todayTransactions = todayResult.count || 0;
    
    const allTransactions = healthResult.data || [];
    const completedTransactions = allTransactions.filter(t => t.status === 'completed').length;
    const systemHealth = allTransactions.length > 0 
      ? Math.round((completedTransactions / allTransactions.length) * 100) 
      : 100;

    setMetrics(prev => ({ 
      ...prev, 
      pendingApprovals, 
      todayTransactions, 
      systemHealth 
    }));
  };

  const loadUserMetrics = async () => {
    // Get users who have been active in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('last_login', thirtyDaysAgo.toISOString());

    setMetrics(prev => ({ ...prev, activeUsers: activeUsers || 0 }));
  };

  const loadRecentActivity = async () => {
    // Get recent transactions for activity feed
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select(`
        id, 
        transaction_type, 
        amount, 
        currency, 
        status, 
        approval_status,
        created_at,
        profiles!inner(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    const activity: ActivityItem[] = (recentTransactions || []).map(transaction => {
      const profile = Array.isArray(transaction.profiles) ? transaction.profiles[0] : transaction.profiles;
      return {
        id: transaction.id,
        type: 'transaction' as const,
        title: `${transaction.transaction_type} - ${profile?.full_name || 'Unknown User'}`,
        description: `${transaction.currency} ${Math.abs(transaction.amount).toLocaleString()}`,
        timestamp: transaction.created_at,
        status: transaction.approval_status === 'pending' ? 'warning' : 
                transaction.status === 'completed' ? 'success' : 'error',
        amount: transaction.amount,
        currency: transaction.currency
      };
    });

    setMetrics(prev => ({ ...prev, recentActivity: activity }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const quickActions: QuickAction[] = [
    {
      id: 'view-approvals',
      title: 'Pending Approvals',
      description: `${metrics.pendingApprovals} transactions awaiting review`,
      icon: <Clock className="h-5 w-5" />,
      action: () => {
        // Navigate to approvals - this would be handled by parent component
        window.location.hash = '#approvals';
      },
      color: 'hsl(var(--destructive))'
    },
    {
      id: 'add-funds',
      title: 'Fund Transfer',
      description: 'Transfer between admin wallets',
      icon: <Plus className="h-5 w-5" />,
      action: () => {
        window.location.hash = '#fund-transfers';
      },
      color: 'hsl(var(--primary))'
    },
    {
      id: 'user-wallets',
      title: 'User Wallets',
      description: 'Monitor user wallet balances',
      icon: <Wallet className="h-5 w-5" />,
      action: () => {
        window.location.hash = '#user-wallets';
      },
      color: 'hsl(var(--chart-2))'
    },
    {
      id: 'view-analytics',
      title: 'Analytics',
      description: 'View detailed financial reports',
      icon: <TrendingUp className="h-5 w-5" />,
      action: () => {
        window.location.hash = '#analytics';
      },
      color: 'hsl(var(--chart-3))'
    }
  ];

  const formatCurrency = (amount: number, currency = 'UGX') => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getActivityIcon = (type: string, status: string) => {
    if (type === 'transaction') {
      switch (status) {
        case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'warning': return <Clock className="h-4 w-4 text-yellow-600" />;
        case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
        default: return <Activity className="h-4 w-4 text-blue-600" />;
      }
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wallet Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of wallet operations and user activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={metrics.pendingApprovals > 0 ? "destructive" : "secondary"}
            className="animate-pulse"
          >
            <Bell className="h-3 w-3 mr-1" />
            {metrics.pendingApprovals} Pending
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Admin Funds */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Funds</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(metrics.totalAdminFunds).map(([currency, amount]) => (
                <div key={currency} className="text-lg font-bold">
                  {formatCurrency(amount, currency)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Balances */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Balances</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(metrics.totalUserWalletBalance).map(([currency, amount]) => (
                <div key={currency} className="text-lg font-bold">
                  {formatCurrency(amount, currency)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.todayTransactions} transactions today
            </p>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(metrics.systemHealth)}`}>
              {metrics.systemHealth}%
            </div>
            <Progress value={metrics.systemHealth} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used administrative functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map(action => (
              <Card 
                key={action.id} 
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                style={{ borderLeftColor: action.color }}
                onClick={action.action}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${action.color}15`, color: action.color }}
                    >
                      {action.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest transactions and system events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentActivity.slice(0, 8).map(item => (
              <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                {getActivityIcon(item.type, item.status)}
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {metrics.recentActivity.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedWalletDashboard;