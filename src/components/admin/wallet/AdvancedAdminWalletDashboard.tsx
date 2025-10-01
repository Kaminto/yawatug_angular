import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity,
  DollarSign,
  Users,
  FileText,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminUser } from '@/contexts/AdminUserContext';
import WalletHealthMonitor from './WalletHealthMonitor';
import TransactionFlowVisualizer from './TransactionFlowVisualizer';
import AnomalyDetectionPanel from './AnomalyDetectionPanel';
import ComplianceReportingPanel from './ComplianceReportingPanel';

interface AdminWalletStats {
  totalWallets: number;
  activeWallets: number;
  totalBalance: Record<string, number>;
  pendingTransactions: number;
  dailyVolume: Record<string, number>;
  monthlyGrowth: number;
  anomaliesDetected: number;
  complianceScore: number;
}

interface TransactionMetrics {
  hourlyVolume: Array<{ hour: string; volume: number; count: number }>;
  typeDistribution: Array<{ type: string; count: number; volume: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  averageProcessingTime: number;
  successRate: number;
}

const AdvancedAdminWalletDashboard: React.FC = () => {
  const { originalAdmin } = useAdminUser();
  const [stats, setStats] = useState<AdminWalletStats>({
    totalWallets: 0,
    activeWallets: 0,
    totalBalance: {},
    pendingTransactions: 0,
    dailyVolume: {},
    monthlyGrowth: 0,
    anomaliesDetected: 0,
    complianceScore: 95
  });
  const [metrics, setMetrics] = useState<TransactionMetrics>({
    hourlyVolume: [],
    typeDistribution: [],
    statusDistribution: [],
    averageProcessingTime: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const loadDashboardData = async () => {
    try {
      // Load wallet statistics
      const { data: walletsData } = await supabase
        .from('wallets')
        .select('currency, balance, status');

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('amount, currency, transaction_type, status, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: adminWalletsData } = await supabase
        .from('admin_sub_wallets')
        .select('balance, currency, wallet_type');

      // Process wallet statistics
      if (walletsData) {
        const totalWallets = walletsData.length;
        const activeWallets = walletsData.filter(w => w.status === 'active').length;
        
        const totalBalance: Record<string, number> = {};
        walletsData.forEach(wallet => {
          totalBalance[wallet.currency] = (totalBalance[wallet.currency] || 0) + wallet.balance;
        });

        // Add admin wallet balances
        if (adminWalletsData) {
          adminWalletsData.forEach(wallet => {
            totalBalance[wallet.currency] = (totalBalance[wallet.currency] || 0) + wallet.balance;
          });
        }

        const pendingTransactions = transactionsData?.filter(t => t.status === 'pending').length || 0;
        
        const dailyVolume: Record<string, number> = {};
        transactionsData?.forEach(transaction => {
          dailyVolume[transaction.currency] = (dailyVolume[transaction.currency] || 0) + Math.abs(transaction.amount);
        });

        setStats(prev => ({
          ...prev,
          totalWallets,
          activeWallets,
          totalBalance,
          pendingTransactions,
          dailyVolume
        }));
      }

      // Process transaction metrics
      if (transactionsData) {
        const now = new Date();
        const hourlyVolume = Array.from({ length: 24 }, (_, i) => {
          const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
          const hourStr = hour.getHours().toString().padStart(2, '0') + ':00';
          const hourTransactions = transactionsData.filter(t => 
            new Date(t.created_at).getHours() === hour.getHours()
          );
          
          return {
            hour: hourStr,
            volume: hourTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
            count: hourTransactions.length
          };
        }).reverse();

        const typeDistribution = Object.entries(
          transactionsData.reduce((acc, t) => {
            acc[t.transaction_type] = (acc[t.transaction_type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).map(([type, count]) => ({
          type,
          count,
          volume: transactionsData
            .filter(t => t.transaction_type === type)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)
        }));

        const statusDistribution = Object.entries(
          transactionsData.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).map(([status, count]) => ({ status, count }));

        const completedTransactions = transactionsData.filter(t => t.status === 'completed');
        const successRate = transactionsData.length > 0 
          ? (completedTransactions.length / transactionsData.length) * 100 
          : 0;

        setMetrics({
          hourlyVolume,
          typeDistribution,
          statusDistribution,
          averageProcessingTime: 2.5, // Mock data
          successRate
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeUpdates = () => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000); // Refresh every 30 seconds

    setRefreshInterval(interval);

    // Set up Supabase real-time subscriptions
    const transactionChannel = supabase
      .channel('admin-transaction-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' },
        () => loadDashboardData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        () => loadDashboardData()
      )
      .subscribe();

    return () => {
      if (interval) clearInterval(interval);
      supabase.removeChannel(transactionChannel);
    };
  };

  useEffect(() => {
    loadDashboardData();
    const cleanup = setupRealTimeUpdates();
    return cleanup;
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getHealthScore = () => {
    const scores = [
      stats.complianceScore,
      (stats.activeWallets / Math.max(stats.totalWallets, 1)) * 100,
      100 - (stats.anomaliesDetected * 5),
      metrics.successRate
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  if (loading) {
    return <div className="animate-pulse">Loading admin dashboard...</div>;
  }

  if (!originalAdmin) {
    return (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Admin access required to view this dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Wallet Administration</h1>
          <p className="text-muted-foreground">
            System-wide wallet monitoring and management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Live Updates
          </Badge>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Health</p>
                <p className="text-2xl font-bold">{getHealthScore()}%</p>
              </div>
              <div className={`p-2 rounded-full ${
                getHealthScore() >= 90 ? 'bg-green-100' : 
                getHealthScore() >= 70 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {getHealthScore() >= 90 ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> :
                  getHealthScore() >= 70 ?
                  <Clock className="h-4 w-4 text-yellow-600" /> :
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                }
              </div>
            </div>
            <Progress value={getHealthScore()} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Wallets</p>
                <p className="text-2xl font-bold">{stats.activeWallets}</p>
                <p className="text-xs text-muted-foreground">
                  of {stats.totalWallets} total
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Volume</p>
                <div className="space-y-1">
                  {Object.entries(stats.dailyVolume).map(([currency, volume]) => (
                    <p key={currency} className="text-lg font-semibold">
                      {formatCurrency(volume, currency)}
                    </p>
                  ))}
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold">{stats.pendingTransactions}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">
                    Avg: {metrics.averageProcessingTime}min
                  </span>
                </div>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monitoring">Health Monitor</TabsTrigger>
          <TabsTrigger value="flow">Transaction Flow</TabsTrigger>
          <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transaction Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Distribution (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.typeDistribution.map((item, index) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-primary`} 
                             style={{ opacity: 1 - (index * 0.2) }} />
                        <span className="text-sm font-medium capitalize">
                          {item.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{item.count}</p>
                        <p className="text-xs text-muted-foreground">
                          {(item.volume / 1000000).toFixed(1)}M
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Balances */}
            <Card>
              <CardHeader>
                <CardTitle>Total System Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.totalBalance).map(([currency, balance]) => (
                    <div key={currency} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="font-medium">{currency}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {formatCurrency(balance, currency)}
                        </p>
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs">+{stats.monthlyGrowth}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring">
          <WalletHealthMonitor />
        </TabsContent>

        <TabsContent value="flow">
          <TransactionFlowVisualizer />
        </TabsContent>

        <TabsContent value="anomalies">
          <AnomalyDetectionPanel />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceReportingPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAdminWalletDashboard;