
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShareBuyingLimits } from '@/interfaces/ShareInterfaces';
import { useContextualData } from './useContextualData';

export const useContextualAccountLimits = (accountType?: string) => {
  const [limits, setLimits] = useState<ShareBuyingLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdminMode, effectiveUserId } = useContextualData();

  useEffect(() => {
    if (effectiveUserId) {
      loadLimits(accountType);
    }
  }, [accountType, effectiveUserId, isAdminMode]);

  const loadLimits = async (fallbackAccountType?: string) => {
    try {
      setLoading(true);
      
      // In admin mode, we might need different limits or override capabilities
      const typeToQuery = accountType || fallbackAccountType || 'individual';
      console.log('useContextualAccountLimits: Loading limits for account type:', typeToQuery, 'Admin mode:', isAdminMode);
      
      const { data, error } = await supabase
        .from('share_buying_limits')
        .select('*')
        .eq('account_type', typeToQuery)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('useContextualAccountLimits: Error fetching limits:', error);
        throw error;
      }
      
      if (data) {
        console.log('useContextualAccountLimits: Fetched limits:', data);
        setLimits(data as ShareBuyingLimits);
      } else {
        console.log('useContextualAccountLimits: No limits found, using defaults');
        // Default limits if none found - admins get higher limits
        const maxAmount = isAdminMode ? 
          (typeToQuery === 'business' ? 100000 : typeToQuery === 'organisation' ? 50000 : 25000) :
          (typeToQuery === 'business' ? 50000 : typeToQuery === 'organisation' ? 25000 : 10000);
          
        setLimits({
          id: 'default',
          account_type: typeToQuery,
          min_buy_amount: 1,
          max_buy_amount: maxAmount,
          required_down_payment_percentage: 30,
          credit_period_days: 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading account limits:', error);
      // Use fallback defaults
      setLimits({
        id: 'default',
        account_type: accountType || 'individual',
        min_buy_amount: 1,
        max_buy_amount: isAdminMode ? 25000 : 10000,
        required_down_payment_percentage: 30,
        credit_period_days: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    limits,
    loading,
    refreshLimits: () => loadLimits(accountType)
  };
};
