
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContextualData } from './useContextualData';

interface BuyingLimits {
  min_buy_amount: number;
  max_buy_amount: number;
  required_down_payment_percentage: number;
  credit_period_days: number;
  account_type: string;
}

export const useContextualBuyingLimits = (accountType?: string) => {
  const [limits, setLimits] = useState<BuyingLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdminMode, effectiveUserId } = useContextualData();

  useEffect(() => {
    if (effectiveUserId) {
      loadBuyingLimits(accountType);
    }
  }, [accountType, effectiveUserId, isAdminMode]);

  const loadBuyingLimits = async (fallbackAccountType?: string) => {
    try {
      setLoading(true);
      
      // Get user's account type if not provided
      let userAccountType = fallbackAccountType;
      if (!userAccountType && effectiveUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', effectiveUserId)
          .single();
        
        userAccountType = profile?.account_type || 'individual';
      }
      
      console.log('useContextualBuyingLimits: Loading limits for account type:', userAccountType, 'Admin mode:', isAdminMode);
      
      const { data, error } = await supabase
        .from('share_buying_limits')
        .select('*')
        .eq('account_type', userAccountType || 'individual')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('useContextualBuyingLimits: Error fetching limits:', error);
        throw error;
      }
      
      if (data) {
        console.log('useContextualBuyingLimits: Fetched limits:', data);
        setLimits({
          min_buy_amount: data.min_buy_amount,
          max_buy_amount: data.max_buy_amount,
          required_down_payment_percentage: data.required_down_payment_percentage,
          credit_period_days: data.credit_period_days,
          account_type: data.account_type
        });
      } else {
        console.log('useContextualBuyingLimits: No limits found, using defaults');
        // Default limits based on account type
        const defaultLimits = {
          individual: { min: 1, max: 10000, downPayment: 30, creditDays: 30 },
          business: { min: 1, max: 50000, downPayment: 20, creditDays: 45 },
          organisation: { min: 1, max: 25000, downPayment: 25, creditDays: 30 }
        };
        
        const typeConfig = defaultLimits[userAccountType as keyof typeof defaultLimits] || defaultLimits.individual;
        
        setLimits({
          min_buy_amount: typeConfig.min,
          max_buy_amount: isAdminMode ? typeConfig.max * 2 : typeConfig.max, // Admins get higher limits
          required_down_payment_percentage: typeConfig.downPayment,
          credit_period_days: typeConfig.creditDays,
          account_type: userAccountType || 'individual'
        });
      }
    } catch (error) {
      console.error('Error loading buying limits:', error);
      // Use safe fallback defaults
      setLimits({
        min_buy_amount: 1,
        max_buy_amount: isAdminMode ? 20000 : 10000,
        required_down_payment_percentage: 30,
        credit_period_days: 30,
        account_type: accountType || 'individual'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    limits,
    loading,
    refreshLimits: () => loadBuyingLimits(accountType)
  };
};
