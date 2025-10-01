import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OrderAction } from '@/types/custom';

export const useOrderActions = () => {
  const [loading, setLoading] = useState(false);

  const executeOrderAction = async (
    orderId: string, 
    action: OrderAction['action'], 
    additionalData?: Record<string, any>
  ) => {
    try {
      setLoading(true);
      
      switch (action) {
        case 'approve':
          if (additionalData?.orderType === 'transfer') {
            await supabase
              .from('share_transfer_requests')
              .update({ 
                status: 'approved',
                completed_at: new Date().toISOString() 
              })
              .eq('id', orderId);
            toast.success('Transfer approved successfully');
          }
          break;
          
        case 'reject':
          if (additionalData?.orderType === 'transfer') {
            await supabase
              .from('share_transfer_requests')
              .update({ 
                status: 'rejected',
                completed_at: new Date().toISOString(),
                reason: additionalData?.reason || 'Admin rejection'
              })
              .eq('id', orderId);
            toast.success('Transfer rejected');
          }
          break;
          
        case 'cancel':
          if (additionalData?.orderType === 'buy') {
            await supabase
              .from('share_purchase_orders')
              .update({ 
                status: 'cancelled', 
                cancelled_at: new Date().toISOString() 
              })
              .eq('id', orderId);
            toast.success('Buy order cancelled');
          } else if (additionalData?.orderType === 'sell') {
            await supabase.rpc('cancel_sell_order', {
              p_order_id: orderId,
              p_user_id: additionalData?.userId,
              p_reason: 'Cancellation request'
            });
            toast.success('Sell order cancelled');
          }
          break;
          
        case 'extend_grace':
          const newGraceDate = new Date();
          newGraceDate.setDate(newGraceDate.getDate() + (additionalData?.days || 7));
          
          await supabase
            .from('share_purchase_orders')
            .update({
              grace_period_deadline: newGraceDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);
          toast.success(`Grace period extended by ${additionalData?.days || 7} days`);
          break;
          
        case 'modify_quantity':
          if (additionalData?.orderType === 'buy') {
            const newTotal = (additionalData?.quantity || 0) * (additionalData?.pricePerShare || 0);
            
            await supabase
              .from('share_purchase_orders')
              .update({ 
                quantity: additionalData?.quantity,
                total_amount: newTotal,
                updated_at: new Date().toISOString()
              })
              .eq('id', orderId);
            toast.success('Order quantity updated');
          }
          break;
          
        default:
          throw new Error('Unsupported action');
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error executing order action:', error);
      toast.error(error.message || 'Failed to execute action');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const batchExecuteActions = async (actions: Array<{
    orderId: string;
    action: OrderAction['action'];
    additionalData?: Record<string, any>;
  }>) => {
    try {
      setLoading(true);
      const results = await Promise.all(
        actions.map(({ orderId, action, additionalData }) => 
          executeOrderAction(orderId, action, additionalData)
        )
      );
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (failCount === 0) {
        toast.success(`All ${results.length} actions completed successfully`);
      } else {
        toast.warning(`${successCount} actions completed, ${failCount} failed`);
      }
      
      return results;
    } catch (error: any) {
      toast.error('Batch operation failed');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    executeOrderAction,
    batchExecuteActions
  };
};