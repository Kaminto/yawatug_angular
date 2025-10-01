
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Wallet, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock,
  Shield,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  Settings
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
}

interface AdminWalletOverviewProps {
  onNavigate: (view: string) => void;
}

const ComprehensiveAdminWalletOverview: React.FC<AdminWalletOverviewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<WalletStats>({
    totalUsers: 0,
    totalWallets: 0,
    totalUGXBalance: 0,
    totalUSDBalance: 0,
    pendingTransactions: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    todayTransactions: 0,
    totalTransactionVolume: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletStats();
  }, []);

  const loadWalletStats = async () => {
    try {
      // Get total unique users with wallets
      const { data: usersData, error: usersError } = await supabase
        .from('wallets')
        .select('user_id')
        .not('user_id', 'is', null);

      if (usersError) throw usersError;

      const uniqueUsers = new Set(usersData?.map(w => w.user_id) || []).size;

      // Get total wallets count
      const { count: walletsCount, error: walletsError } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true });

      if (walletsError) throw walletsError;

      // Get UGX total balance
      const { data: ugxWallets, error: ugxError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('currency', 'UGX');

      if (ugxError) throw ugxError;

      const totalUGX = ugxWallets?.reduce((sum, wallet) => sum + (wallet.balance || 0), 0) || 0;

      // Get USD total balance
      const { data: usdWallets, error: usdError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('currency', 'USD');

      if (usdError) throw usdError;

      const totalUSD = usdWallets?.reduce((sum, wallet) => sum + (wallet.balance || 0), 0) || 0;

      // Get pending transactions count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Get pending deposits
      const { count: depositsCount, error: depositsError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('transaction_type', 'deposit')
        .eq('status', 'pending');

      if (depositsError) throw depositsError;

      // Get pending withdrawals
      const { count: withdrawalsCount, error: withdrawalsError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('transaction_type', 'withdrawal')
        .eq('status', 'pending');

      if (withdrawalsError) throw withdrawalsError;

      // Get today's transactions count
      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount, error: todayError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      if (todayError) throw todayError;

      // Get total transaction volume
      const { data: volumeData, error: volumeError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed');

      if (volumeError) throw volumeError;

      const totalVolume = volumeData?.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0) || 0;

      setStats({
        totalUsers: uniqueUsers,
        totalWallets: walletsCount || 0,
        totalUGXBalance: totalUGX,
        totalUSDBalance: totalUSD,
        pendingTransactions: pendingCount || 0,
        pendingDeposits: depositsCount || 0,
        pendingWithdrawals: withdrawalsCount || 0,
        todayTransactions: todayCount || 0,
        totalTransactionVolume: totalVolume
      });

    } catch (error) {
      console.error('Error loading wallet stats:', error);
      toast.error('Failed to load wallet statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading wallet overview...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wallet Holders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalWallets} total wallets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">UGX Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {stats.totalUGXBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total system balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USD Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">USD {stats.totalUSDBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total system balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-green-500" />
              Pending Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.pendingDeposits}</div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('approvals')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Review Deposits
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-red-500" />
              Pending Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.pendingWithdrawals}</div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('approvals')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Review Withdrawals
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.todayTransactions}</div>
            <p className="text-sm text-muted-foreground mt-1">Transactions today</p>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => onNavigate('real-time')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Live Monitor
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button 
              variant="outline" 
              onClick={() => onNavigate('system-monitor')}
              className="h-20 flex flex-col"
            >
              <Wallet className="h-6 w-6 mb-2" />
              System Monitor
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('user-wallets')}
              className="h-20 flex flex-col"
            >
              <Users className="h-6 w-6 mb-2" />
              User Wallets
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('transactions')}
              className="h-20 flex flex-col"
            >
              <FileText className="h-6 w-6 mb-2" />
              Transactions
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('reporting')}
              className="h-20 flex flex-col"
            >
              <TrendingUp className="h-6 w-6 mb-2" />
              Reports
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onNavigate('settings')}
              className="h-20 flex flex-col"
            >
              <Settings className="h-6 w-6 mb-2" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Wallet Service</span>
              <Badge variant="default" className="bg-green-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Transaction Processing</span>
              <Badge variant="default" className="bg-green-500">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Balance Sync</span>
              <Badge variant="default" className="bg-green-500">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComprehensiveAdminWalletOverview;
