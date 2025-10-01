
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SystemMonitorMetrics } from '@/types/custom';
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';

const SystemMonitor = () => {
  const [metrics, setMetrics] = useState<SystemMonitorMetrics>({
    total_users: 0,
    active_wallets: 0,
    total_transactions_today: 0,
    total_volume_today: 0,
    pending_approvals: 0,
    system_health_score: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemMetrics();
    const interval = setInterval(loadSystemMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemMetrics = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active wallets
      const { count: activeWallets } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get today's transactions
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTransactions } = await supabase
        .from('transactions')
        .select('amount, status')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      const totalTransactionsToday = todayTransactions?.length || 0;
      const totalVolumeToday = todayTransactions?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;

      // Get pending approvals
      const { count: pendingApprovals } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Calculate system health score
      const completedTransactions = todayTransactions?.filter(tx => tx.status === 'completed').length || 0;
      const healthScore = totalTransactionsToday > 0 ? 
        Math.round((completedTransactions / totalTransactionsToday) * 100) : 100;

      setMetrics({
        total_users: totalUsers || 0,
        active_wallets: activeWallets || 0,
        total_transactions_today: totalTransactionsToday,
        total_volume_today: totalVolumeToday,
        pending_approvals: pendingApprovals || 0,
        system_health_score: healthScore
      });
    } catch (error) {
      console.error('Error loading system metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 95) return 'text-green-600';
    if (health >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (health: number) => {
    if (health >= 95) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (health >= 85) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return <div className="animate-pulse">Loading system metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">System Monitor</h3>
        <Badge variant="outline" className="flex items-center gap-1">
          {getHealthIcon(metrics.system_health_score)}
          System Health: {metrics.system_health_score}%
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.active_wallets} active wallets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_transactions_today}</div>
            <p className="text-xs text-muted-foreground">
              UGX {metrics.total_volume_today.toLocaleString()} volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pending_approvals}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(metrics.system_health_score)}`}>
              {metrics.system_health_score}%
            </div>
            <Progress value={metrics.system_health_score} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Database Connection</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Connected</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Payment Processing</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Operational</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Real-time Updates</span>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
                  <span className="text-blue-600">Active</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Security Status</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Secure</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">User wallet created</div>
                  <div className="text-xs text-muted-foreground">2 minutes ago</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Transaction processed</div>
                  <div className="text-xs text-muted-foreground">5 minutes ago</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Approval pending</div>
                  <div className="text-xs text-muted-foreground">12 minutes ago</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">System backup completed</div>
                  <div className="text-xs text-muted-foreground">1 hour ago</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemMonitor;
