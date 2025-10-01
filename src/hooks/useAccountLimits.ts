
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShareBuyingLimits } from '@/interfaces/ShareInterfaces';

export const useAccountLimits = (accountType?: string) => {
  const [limits, setLimits] = useState<ShareBuyingLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountType) {
      loadLimits();
    } else {
      // Load default limits for individual if no account type
      loadLimits('individual');
    }
  }, [accountType]);

  const loadLimits = async (fallbackAccountType?: string) => {
    try {
      setLoading(true);
      
      const typeToQuery = accountType || fallbackAccountType || 'individual';
      console.log('useAccountLimits: Loading limits for account type:', typeToQuery);
      
      const { data, error } = await supabase
        .from('share_buying_limits')
        .select('*')
        .eq('account_type', typeToQuery)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('useAccountLimits: Error fetching limits:', error);
        throw error;
      }
      
      if (data) {
        console.log('useAccountLimits: Fetched limits:', data);
        setLimits(data as ShareBuyingLimits);
      } else {
        console.log('useAccountLimits: No limits found, using defaults');
        // Default limits if none found
        setLimits({
          id: 'default',
          account_type: typeToQuery,
          min_buy_amount: 1,
          max_buy_amount: typeToQuery === 'business' ? 50000 : typeToQuery === 'organisation' ? 25000 : 10000,
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
        max_buy_amount: 10000,
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
    refreshLimits: loadLimits
  };
};
