
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContextualData } from './useContextualData';

export const useRealTimeShareData = () => {
  const [shareData, setShareData] = useState<any>(null);
  const [marketActivity, setMarketActivity] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { effectiveUserId, isAdminMode } = useContextualData();

  useEffect(() => {
    if (!effectiveUserId) return;

    const setupRealTimeConnections = () => {
      // Share data updates
      const shareChannel = supabase
        .channel('share-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shares'
          },
          (payload) => {
            console.log('Real-time share update:', payload);
            handleShareUpdate(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'share_transactions'
          },
          (payload) => {
            console.log('Real-time transaction update:', payload);
            handleTransactionUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log('Share channel status:', status);
          setIsConnected(status === 'SUBSCRIBED');
        });

      // Market activity updates
      const marketChannel = supabase
        .channel('market-activity')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'market_activity_log'
          },
          (payload) => {
            console.log('Real-time market activity:', payload);
            handleMarketActivity(payload);
          }
        )
        .subscribe();

      return { shareChannel, marketChannel };
    };

    const channels = setupRealTimeConnections();

    return () => {
      supabase.removeChannel(channels.shareChannel);
      supabase.removeChannel(channels.marketChannel);
      setIsConnected(false);
    };
  }, [effectiveUserId, isAdminMode]);

  const handleShareUpdate = (payload: any) => {
    setShareData((prev: any) => {
      if (!prev) return payload.new;
      
      if (payload.eventType === 'UPDATE' && payload.new.id === prev.id) {
        return { ...prev, ...payload.new };
      }
      return prev;
    });
  };

  const handleTransactionUpdate = (payload: any) => {
    // Update share data based on transaction
    if (payload.eventType === 'INSERT' && payload.new.status === 'completed') {
      const transaction = payload.new;
      
      setShareData((prev: any) => {
        if (!prev || prev.id !== transaction.share_id) return prev;
        
        const quantityChange = transaction.transaction_type === 'purchase' 
          ? -transaction.quantity 
          : transaction.quantity;
          
        return {
          ...prev,
          available_shares: prev.available_shares + quantityChange
        };
      });
    }
  };

  const handleMarketActivity = (payload: any) => {
    setMarketActivity(payload.new);
  };

  const getConnectionStatus = () => ({
    isConnected,
    lastUpdate: shareData?.updated_at || null,
    marketActivity: marketActivity?.activity_date || null
  });

  return {
    shareData,
    marketActivity,
    isConnected,
    getConnectionStatus
  };
};
