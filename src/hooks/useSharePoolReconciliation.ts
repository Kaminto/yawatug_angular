import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSharePoolReconciliation = () => {
  const [loading, setLoading] = useState(false);

  const reconcileSharePools = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('reconcile_share_pools');

      if (error) throw error;

      const result = data as { success: boolean; message: string; pools_updated: number };
      if (result.success) {
        toast.success(`${result.message} - ${result.pools_updated} pools updated`);
        return { success: true, data: result };
      } else {
        toast.error('Failed to reconcile share pools');
        return { success: false, error: 'Reconciliation failed' };
      }
    } catch (error: any) {
      console.error('Error reconciling share pools:', error);
      toast.error(error.message || 'Failed to reconcile share pools');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const validateSharePurchase = async (shareId: string, quantity: number) => {
    try {
      const { data, error } = await supabase
        .rpc('validate_share_purchase', {
          p_share_id: shareId,
          p_quantity: quantity
        });

      if (error) throw error;

      const validation = data as { valid: boolean; available_shares: number; error?: string };
      return {
        valid: validation.valid,
        availableShares: validation.available_shares,
        error: validation.error
      };
    } catch (error: any) {
      console.error('Error validating share purchase:', error);
      return {
        valid: false,
        availableShares: 0,
        error: error.message || 'Validation failed'
      };
    }
  };

  const calculateAvailableShares = async (shareId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('calculate_available_shares', {
          p_share_id: shareId
        });

      if (error) throw error;

      return {
        success: true,
        availableShares: data as number
      };
    } catch (error: any) {
      console.error('Error calculating available shares:', error);
      return {
        success: false,
        availableShares: 0,
        error: error.message
      };
    }
  };

  return {
    loading,
    reconcileSharePools,
    validateSharePurchase,
    calculateAvailableShares
  };
};