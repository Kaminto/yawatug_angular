import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSellOrderManagement = () => {
  const [loading, setLoading] = useState(false);

  const submitSellOrder = useCallback(async (
    userId: string,
    shareId: string,
    quantity: number,
    orderType: string = 'market',
    requestedPrice: number | null = null
  ) => {
    setLoading(true);
    try {
      const { data: orderId, error } = await supabase.rpc('submit_sell_order', {
        p_user_id: userId,
        p_share_id: shareId,
        p_quantity: quantity,
        p_order_type: orderType,
        p_requested_price: requestedPrice
      });

      if (error) throw error;
      
      return { success: true, orderId };
    } catch (error: any) {
      console.error('Error submitting sell order:', error);
      toast.error(`Failed to submit sell order: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const modifyOrderQuantity = useCallback(async (
    orderId: string,
    userId: string,
    newQuantity: number,
    reason: string = 'User modification'
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('modify_sell_order_quantity', {
        p_order_id: orderId,
        p_user_id: userId,
        p_new_quantity: newQuantity,
        p_reason: reason
      });

      if (error) throw error;
      
      toast.success('Order modified successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error modifying order:', error);
      toast.error(`Failed to modify order: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelOrder = useCallback(async (
    orderId: string,
    userId: string,
    reason: string = 'User cancellation'
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('cancel_sell_order', {
        p_order_id: orderId,
        p_user_id: userId,
        p_reason: reason
      });

      if (error) throw error;
      
      toast.success('Order cancelled successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(`Failed to cancel order: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const processBatch = useCallback(async (
    orderIds: string[],
    adminId: string,
    processingType: string = 'manual'
  ) => {
    setLoading(true);
    try {
      const { data: batchId, error } = await supabase.rpc('process_sell_orders_batch', {
        p_order_ids: orderIds,
        p_admin_id: adminId,
        p_processing_type: processingType
      });

      if (error) throw error;
      
      toast.success(`Successfully processed ${orderIds.length} order(s)`);
      return { success: true, batchId };
    } catch (error: any) {
      console.error('Error processing batch:', error);
      toast.error(`Failed to process batch: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getSellOrders = useCallback(async (filters: {
    userId?: string;
    status?: string;
    limit?: number;
  } = {}) => {
    try {
      let query = supabase
        .from('share_sell_orders')
        .select(`
          *,
          profiles!share_sell_orders_user_id_fkey(full_name, email),
          shares(name, price_per_share)
        `);

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      query = query.order('fifo_position', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      
      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching sell orders:', error);
      return { success: false, error: error.message, data: [] };
    }
  }, []);

  const getQueueStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('share_sell_orders')
        .select('fifo_position, status, created_at')
        .eq('status', 'pending')
        .order('fifo_position', { ascending: true });

      if (error) throw error;

      const stats = {
        totalInQueue: data?.length || 0,
        averageProcessingTime: '2-3 days', // This would be calculated from historical data
        nextInLine: data?.[0]?.fifo_position || 1
      };

      return { success: true, stats };
    } catch (error: any) {
      console.error('Error fetching queue stats:', error);
      return { success: false, error: error.message, stats: null };
    }
  }, []);

  return {
    loading,
    submitSellOrder,
    modifyOrderQuantity,
    cancelOrder,
    processBatch,
    getSellOrders,
    getQueueStats
  };
};