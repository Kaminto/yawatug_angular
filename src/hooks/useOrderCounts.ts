import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OrderCounts {
  buyingOrders: number;
  sellingOrders: number;
  transferRequests: number;
  loading: boolean;
}

export const useOrderCounts = () => {
  const [counts, setCounts] = useState<OrderCounts>({
    buyingOrders: 0,
    sellingOrders: 0,
    transferRequests: 0,
    loading: true
  });

  const loadCounts = async () => {
    try {
      // Get buying orders count (pending + partial)
      const { count: buyingCount } = await supabase
        .from('share_purchase_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'partial']);

      // Get selling orders count (pending + partial) 
      const { count: sellingCount } = await supabase
        .from('share_sell_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'partial']);

      // Get transfer requests count (pending)
      const { count: transferCount } = await supabase
        .from('share_transfer_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setCounts({
        buyingOrders: buyingCount || 0,
        sellingOrders: sellingCount || 0,
        transferRequests: transferCount || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error loading order counts:', error);
      setCounts(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadCounts();

    // Set up real-time subscriptions for automatic updates
    const buyingChannel = supabase
      .channel('buying-orders-count')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'share_purchase_orders' },
        () => loadCounts()
      )
      .subscribe();

    const sellingChannel = supabase
      .channel('selling-orders-count')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'share_sell_orders' },
        () => loadCounts()
      )
      .subscribe();

    const transferChannel = supabase
      .channel('transfer-requests-count')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'share_transfer_requests' },
        () => loadCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(buyingChannel);
      supabase.removeChannel(sellingChannel);
      supabase.removeChannel(transferChannel);
    };
  }, []);

  return { ...counts, refresh: loadCounts };
};