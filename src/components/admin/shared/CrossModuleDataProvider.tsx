import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CrossModuleData {
  // Wallet data
  totalBalance: number;
  pendingTransactions: number;
  dailyVolume: number;
  
  // User data
  totalUsers: number;
  pendingVerifications: number;
  activeUsers: number;
  
  // System alerts
  criticalAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  
  // Real-time counters
  onlineUsers: number;
  recentActivity: any[];
}

interface CrossModuleContextValue {
  data: CrossModuleData;
  loading: boolean;
  refresh: () => Promise<void>;
  updateMetric: (key: keyof CrossModuleData, value: any) => void;
}

const CrossModuleContext = createContext<CrossModuleContextValue | null>(null);

export const useCrossModuleData = () => {
  const context = useContext(CrossModuleContext);
  if (!context) {
    throw new Error('useCrossModuleData must be used within CrossModuleDataProvider');
  }
  return context;
};

interface CrossModuleDataProviderProps {
  children: React.ReactNode;
}

export const CrossModuleDataProvider: React.FC<CrossModuleDataProviderProps> = ({ children }) => {
  const [data, setData] = useState<CrossModuleData>({
    totalBalance: 0,
    pendingTransactions: 0,
    dailyVolume: 0,
    totalUsers: 0,
    pendingVerifications: 0,
    activeUsers: 0,
    criticalAlerts: 0,
    systemHealth: 'healthy',
    onlineUsers: 0,
    recentActivity: []
  });
  
  const [loading, setLoading] = useState(true);

  const fetchWalletData = async () => {
    try {
      // Fetch wallet balances
      const { data: wallets } = await supabase
        .from('admin_sub_wallets')
        .select('balance, currency')
        .eq('is_active', true);
      
      const totalBalance = wallets?.reduce((sum, wallet) => {
        // Convert to USD equivalent (simplified)
        return sum + (wallet.currency === 'USD' ? wallet.balance : wallet.balance / 3700);
      }, 0) || 0;

      // Fetch pending transactions
      const { count: pendingCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .in('approval_status', ['pending', 'review']);

      // Fetch daily volume
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyTxns } = await supabase
        .from('transactions')
        .select('amount')
        .gte('created_at', today)
        .eq('status', 'completed');

      const dailyVolume = dailyTxns?.reduce((sum, txn) => sum + Math.abs(txn.amount), 0) || 0;

      return {
        totalBalance: Math.round(totalBalance),
        pendingTransactions: pendingCount || 0,
        dailyVolume: Math.round(dailyVolume)
      };
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      return { totalBalance: 0, pendingTransactions: 0, dailyVolume: 0 };
    }
  };

  const fetchUserData = async () => {
    try {
      // Total users
      const { count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Pending verifications
      const { count: pendingCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_verification');

      // Active users (logged in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: activeCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', thirtyDaysAgo);

      return {
        totalUsers: totalCount || 0,
        pendingVerifications: pendingCount || 0,
        activeUsers: activeCount || 0
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { totalUsers: 0, pendingVerifications: 0, activeUsers: 0 };
    }
  };

  const fetchSystemData = async () => {
    try {
      // Calculate system health based on various metrics
      const walletData = await fetchWalletData();
      const userData = await fetchUserData();
      
      let criticalAlerts = 0;
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check for critical conditions
      if (walletData.totalBalance < 5000) {
        criticalAlerts++;
        systemHealth = 'critical';
      }
      
      if (walletData.pendingTransactions > 20) {
        criticalAlerts++;
        if (systemHealth !== 'critical') systemHealth = 'warning';
      }
      
      if (userData.pendingVerifications > 50) {
        criticalAlerts++;
        if (systemHealth !== 'critical') systemHealth = 'warning';
      }

      return {
        criticalAlerts,
        systemHealth,
        onlineUsers: Math.floor(Math.random() * 50) + 10, // Mock online users
        recentActivity: [] // Will be populated by real-time updates
      };
    } catch (error) {
      console.error('Error fetching system data:', error);
      return { 
        criticalAlerts: 0, 
        systemHealth: 'healthy' as const, 
        onlineUsers: 0, 
        recentActivity: [] 
      };
    }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [walletData, userData, systemData] = await Promise.all([
        fetchWalletData(),
        fetchUserData(),
        fetchSystemData()
      ]);

      setData(prevData => ({
        ...prevData,
        ...walletData,
        ...userData,
        ...systemData
      }));
    } catch (error) {
      console.error('Error refreshing cross-module data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMetric = useCallback((key: keyof CrossModuleData, value: any) => {
    setData(prevData => ({
      ...prevData,
      [key]: value
    }));
  }, []);

  useEffect(() => {
    refresh();
    
    // Set up real-time subscriptions for cross-module updates
    const transactionChannel = supabase
      .channel('cross-module-transactions')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions' 
      }, (payload) => {
        // Update pending transactions count
        refresh();
      })
      .subscribe();

    const profileChannel = supabase
      .channel('cross-module-profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, (payload) => {
        // Update user metrics
        refresh();
      })
      .subscribe();

    const walletChannel = supabase
      .channel('cross-module-wallets')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'admin_sub_wallets' 
      }, (payload) => {
        // Update wallet metrics
        refresh();
      })
      .subscribe();

    // Refresh data every 30 seconds
    const interval = setInterval(refresh, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(transactionChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(walletChannel);
    };
  }, [refresh]);

  const contextValue: CrossModuleContextValue = {
    data,
    loading,
    refresh,
    updateMetric
  };

  return (
    <CrossModuleContext.Provider value={contextValue}>
      {children}
    </CrossModuleContext.Provider>
  );
};