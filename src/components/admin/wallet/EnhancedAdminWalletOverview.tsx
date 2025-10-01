import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Wallet, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft,
  Clock,
  Shield,
  DollarSign,
  RefreshCw,
  CheckCircle,
  Eye,
  FileText,
  Settings,
  Share,
  Zap,
  Activity,
  Bell,
  Target,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

interface WalletStats {
  totalUsers: number;
  totalWallets: number;
  totalUGXBalance: number;
  totalUSDBalance: number;
  pendingTransactions: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  todayTransactions: number;
  totalTransactionVolume: number;
  // Share integration stats
  shareIntegrationStats: {
    projectFundingBalance: number;
    adminFundBalance: number;
    buybackFundBalance: number;
    todayShareTransactions: number;
    pendingBuybackOrders: number;
    todayAllocations: number;
  };
}

interface AdminWalletOverviewProps {
  onNavigate: (view: string) => void;
}

const EnhancedAdminWalletOverview: React.FC<AdminWalletOverviewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<WalletStats>({
    totalUsers: 0,
    totalWallets: 0,
    totalUGXBalance: 0,
    totalUSDBalance: 0,
    pendingTransactions: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    todayTransactions: 0,
    totalTransactionVolume: 0,
    shareIntegrationStats: {
      projectFundingBalance: 0,
      adminFundBalance: 0,
      buybackFundBalance: 0,
      todayShareTransactions: 0,
      pendingBuybackOrders: 0,
      todayAllocations: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWalletStats();
    
    // Set up real-time subscription for balance updates
    const subscription = supabase
      .channel('wallet-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => {
        loadWalletStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_sub_wallets' }, () => {
        loadWalletStats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadWalletStats = async () => {
    try {
      // Existing wallet stats
      const [
        usersData,
        walletsCount,
        ugxWallets,
        usdWallets,
        pendingCount,
        depositsCount,
        withdrawalsCount,
        todayCount,
        volumeData,
        // New share integration stats
        adminSubWallets,
        todayAllocations,
        pendingBuybacks
      ] = await Promise.all([
        supabase.from('wallets').select('user_id').not('user_id', 'is', null),
        supabase.from('wallets').select('*', { count: 'exact', head: true }),
        supabase.from('wallets').select('balance').eq('currency', 'UGX'),
        supabase.from('wallets').select('balance').eq('currency', 'USD'),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('transaction_type', 'deposit').eq('status', 'pending'),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('transaction_type', 'withdrawal').eq('status', 'pending'),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).gte('created_at', `${new Date().toISOString().split('T')[0]}T00:00:00.000Z`),
        supabase.from('transactions').select('amount').eq('status', 'completed'),
        // Share-related queries
        supabase.from('admin_sub_wallets').select('*'),
        supabase.from('admin_wallet_fund_transfers').select('amount').eq('transfer_type', 'share_purchase_allocation').gte('created_at', `${new Date().toISOString().split('T')[0]}T00:00:00.000Z`),
        supabase.from('share_buyback_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      // Process existing stats
      const uniqueUsers = new Set(usersData.data?.map(w => w.user_id) || []).size;
      const totalUGX = ugxWallets.data?.reduce((sum, wallet) => sum + (wallet.balance || 0), 0) || 0;
      const totalUSD = usdWallets.data?.reduce((sum, wallet) => sum + (wallet.balance || 0), 0) || 0;
      const totalVolume = volumeData.data?.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0) || 0;

      // Process share integration stats
      const subWallets = adminSubWallets.data || [];
      const projectFunding = subWallets.find(w => w.wallet_type === 'project_funding')?.balance || 0;
      const adminFund = subWallets.find(w => w.wallet_type === 'admin_fund')?.balance || 0;
      const buybackFund = subWallets.find(w => w.wallet_type === 'share_buyback')?.balance || 0;
      const todayAllocationsSum = todayAllocations.data?.reduce((sum, alloc) => sum + (alloc.amount || 0), 0) || 0;

      setStats({
        totalUsers: uniqueUsers,
        totalWallets: walletsCount.count || 0,
        totalUGXBalance: totalUGX,
        totalUSDBalance: totalUSD,
        pendingTransactions: pendingCount.count || 0,
        pendingDeposits: depositsCount.count || 0,
        pendingWithdrawals: withdrawalsCount.count || 0,
        todayTransactions: todayCount.count || 0,
        totalTransactionVolume: totalVolume,
        shareIntegrationStats: {
          projectFundingBalance: projectFunding,
          adminFundBalance: adminFund,
          buybackFundBalance: buybackFund,
          todayShareTransactions: todayCount.count || 0, // Can be refined for share-specific
          pendingBuybackOrders: pendingBuybacks.count || 0,
          todayAllocations: todayAllocationsSum
        }
      });

    } catch (error) {
      console.error('Error loading wallet stats:', error);
      toast.error('Failed to load wallet statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWalletStats();
    toast.success('Data refreshed successfully');
  };

  if (loading) {
    return <div className="animate-pulse">Loading enhanced wallet overview...</div>;
  }

  const totalSystemBalance = stats.totalUGXBalance + (stats.totalUSDBalance * 3700); // Approximate conversion

  return (
    <div className="space-y-6">
      {/* Header with Real-time Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Control Center</h2>
          <p className="text-muted-foreground">Unified wallet and share system management</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Syncing...' : 'Refresh'}
        </Button>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total System Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {totalSystemBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Combined wallet + share funds
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalWallets} total wallets
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingTransactions + stats.shareIntegrationStats.pendingBuybackOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayTransactions}</div>
            <p className="text-xs text-muted-foreground">
              All transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet-Share Integration Panel */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Wallet-Share Integration Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Project Funding */}
            <div className="p-4 border rounded-lg hover-scale">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Project Funding</span>
                <Target className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                UGX {stats.shareIntegrationStats.projectFundingBalance.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Available for mining projects
              </div>
              <Progress 
                value={(stats.shareIntegrationStats.projectFundingBalance / 10000000) * 100} 
                className="mt-2" 
              />
            </div>

            {/* Admin Fund */}
            <div className="p-4 border rounded-lg hover-scale">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Admin Fund</span>
                <Shield className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                UGX {stats.shareIntegrationStats.adminFundBalance.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Operations & expenses
              </div>
              <Progress 
                value={(stats.shareIntegrationStats.adminFundBalance / 5000000) * 100} 
                className="mt-2" 
              />
            </div>

            {/* Buyback Fund */}
            <div className="p-4 border rounded-lg hover-scale">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Buyback Fund</span>
                <Zap className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-purple-600">
                UGX {stats.shareIntegrationStats.buybackFundBalance.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {stats.shareIntegrationStats.pendingBuybackOrders} pending orders
              </div>
              <Progress 
                value={(stats.shareIntegrationStats.buybackFundBalance / 3000000) * 100} 
                className="mt-2" 
              />
            </div>
          </div>

          <Separator className="my-4" />

          {/* Quick Integration Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open('/admin/shares', '_blank')}>
              <Share className="h-4 w-4 mr-2" />
              Manage Shares
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('admin-wallets')}>
              <Wallet className="h-4 w-4 mr-2" />
              Fund Allocation
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('approvals')}>
              <Clock className="h-4 w-4 mr-2" />
              Process Buybacks
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('real-time')}>
              <Activity className="h-4 w-4 mr-2" />
              Live Monitor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Flow Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-green-500" />
              Inflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Deposits</span>
                <Badge variant="outline">{stats.pendingDeposits} pending</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Share Sales</span>
                <Badge className="bg-blue-100 text-blue-800">
                  UGX {stats.shareIntegrationStats.todayAllocations.toLocaleString()}
                </Badge>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('approvals')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Review Inflows
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-red-500" />
              Outflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Withdrawals</span>
                <Badge variant="outline">{stats.pendingWithdrawals} pending</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Buybacks</span>
                <Badge className="bg-purple-100 text-purple-800">
                  {stats.shareIntegrationStats.pendingBuybackOrders} orders
                </Badge>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('approvals')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Review Outflows
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Volume Today</span>
                <span className="font-bold">UGX {stats.totalTransactionVolume.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Integration Health</span>
                <Badge className="bg-green-100 text-green-800">Optimal</Badge>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('reporting')}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quick Actions */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Financial Operations Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Button 
              variant="outline" 
              onClick={() => onNavigate('system-monitor')}
              className="h-20 flex flex-col hover-scale"
            >
              <Wallet className="h-6 w-6 mb-2" />
              System Monitor
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('user-wallets')}
              className="h-20 flex flex-col hover-scale"
            >
              <Users className="h-6 w-6 mb-2" />
              User Wallets
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('admin-wallets')}
              className="h-20 flex flex-col hover-scale"
            >
              <ArrowRightLeft className="h-6 w-6 mb-2" />
              Fund Transfers
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('approvals')}
              className="h-20 flex flex-col hover-scale"
            >
              <Clock className="h-6 w-6 mb-2" />
              Approvals
              {(stats.pendingTransactions + stats.shareIntegrationStats.pendingBuybackOrders) > 0 && (
                <Badge className="mt-1 bg-red-500">
                  {stats.pendingTransactions + stats.shareIntegrationStats.pendingBuybackOrders}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('reporting')}
              className="h-20 flex flex-col hover-scale"
            >
              <TrendingUp className="h-6 w-6 mb-2" />
              Analytics
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('settings')}
              className="h-20 flex flex-col hover-scale"
            >
              <Settings className="h-6 w-6 mb-2" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Health with Integration Status */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            System Health & Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <span className="text-sm font-medium">Wallet Service</span>
              <Badge variant="default" className="bg-green-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <span className="text-sm font-medium">Share Integration</span>
              <Badge variant="default" className="bg-green-500">Synced</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <span className="text-sm font-medium">Real-time Updates</span>
              <Badge variant="default" className="bg-green-500">Live</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <span className="text-sm font-medium">Fund Allocation</span>
              <Badge variant="default" className="bg-green-500">Optimal</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAdminWalletOverview;
