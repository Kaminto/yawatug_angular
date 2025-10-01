import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface SyncData {
  user_id: string;
  data_type: string;
  data_content: any;
  last_synced: string;
}

interface UseAppSyncOptions {
  autoSync?: boolean;
  syncInterval?: number; // in milliseconds
}

export const useAppSync = (options: UseAppSyncOptions = {}) => {
  const { autoSync = true, syncInterval = 30000 } = options; // 30 seconds default
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncData, setSyncData] = useState<SyncData[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Sync data to server
  const syncToServer = useCallback(async (dataType: string, dataContent: any) => {
    if (!user) return false;

    try {
      setSyncing(true);
      
      const { error } = await supabase
        .from('app_sync_data')
        .upsert({
          user_id: user.id,
          data_type: dataType,
          data_content: dataContent,
          last_synced: new Date().toISOString()
        }, {
          onConflict: 'user_id,data_type'
        });

      if (error) throw error;
      
      setLastSync(new Date());
      await loadSyncData();
      
      return true;
    } catch (error) {
      console.error('Sync to server failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync data to server",
        variant: "destructive",
      });
      return false;
    } finally {
      setSyncing(false);
    }
  }, [user, toast]);

  // Sync data from server
  const syncFromServer = useCallback(async (dataType?: string) => {
    if (!user) return null;

    try {
      setSyncing(true);
      
      let query = supabase
        .from('app_sync_data')
        .select('*')
        .eq('user_id', user.id)
        .order('last_synced', { ascending: false });

      if (dataType) {
        query = query.eq('data_type', dataType);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setLastSync(new Date());
      
      if (dataType && data && data.length > 0) {
        return data[0].data_content;
      }
      
      return data;
    } catch (error) {
      console.error('Sync from server failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync data from server",
        variant: "destructive",
      });
      return null;
    } finally {
      setSyncing(false);
    }
  }, [user, toast]);

  // Load all sync data for user
  const loadSyncData = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('app_sync_data')
        .select('*')
        .eq('user_id', user.id)
        .order('last_synced', { ascending: false });

      if (error) throw error;
      setSyncData(data || []);
    } catch (error) {
      console.error('Failed to load sync data:', error);
    }
  }, [user]);

  // Sync specific data types commonly used
  const syncProfile = useCallback(async (profileData: any) => {
    return await syncToServer('profile', profileData);
  }, [syncToServer]);

  const syncPreferences = useCallback(async (preferences: any) => {
    return await syncToServer('preferences', preferences);
  }, [syncToServer]);

  const syncWalletState = useCallback(async (walletData: any) => {
    return await syncToServer('wallet_state', walletData);
  }, [syncToServer]);

  const syncInvestments = useCallback(async (investmentData: any) => {
    return await syncToServer('investments', investmentData);
  }, [syncToServer]);

  // Get specific data type
  const getData = useCallback((dataType: string) => {
    const item = syncData.find(item => item.data_type === dataType);
    return item?.data_content || null;
  }, [syncData]);

  // Force sync all data
  const forceSyncAll = useCallback(async () => {
    if (!user) return;

    try {
      setSyncing(true);
      
      // Get latest data from server
      await loadSyncData();
      
      toast({
        title: "Sync Complete",
        description: "All data has been synchronized",
      });
    } catch (error) {
      console.error('Force sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize data",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }, [user, loadSyncData, toast]);

  // Set up real-time sync
  useEffect(() => {
    if (!user || !autoSync) return;

    const interval = setInterval(() => {
      loadSyncData();
    }, syncInterval);

    return () => clearInterval(interval);
  }, [user, autoSync, syncInterval, loadSyncData]);

  // Load initial data
  useEffect(() => {
    if (user) {
      loadSyncData();
    }
  }, [user, loadSyncData]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('app_sync_data')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_sync_data',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Sync data changed:', payload);
          loadSyncData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, loadSyncData]);

  return {
    // State
    syncing,
    lastSync,
    syncData,
    
    // Methods
    syncToServer,
    syncFromServer,
    syncProfile,
    syncPreferences,
    syncWalletState,
    syncInvestments,
    getData,
    forceSyncAll,
    loadSyncData,
    
    // Computed
    isOnline: navigator.onLine,
    hasSyncData: syncData.length > 0
  };
};