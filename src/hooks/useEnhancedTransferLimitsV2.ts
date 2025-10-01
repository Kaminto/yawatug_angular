import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TransferLimits {
  account_type: string;
  daily_limit_shares: number;
  weekly_limit_shares: number;
  monthly_limit_shares: number;
  minimum_transfer_value: number;
  is_active: boolean;
}

export interface TransferUsage {
  daily_used: number;
  weekly_used: number;
  monthly_used: number;
}

export const useEnhancedTransferLimitsV2 = (userId?: string, accountType?: string) => {
  const [limits, setLimits] = useState<TransferLimits | null>(null);
  const [usage, setUsage] = useState<TransferUsage>({ daily_used: 0, weekly_used: 0, monthly_used: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && accountType) {
      loadLimitsAndUsage();
    }
  }, [userId, accountType]);

  const loadLimitsAndUsage = async () => {
    try {
      setLoading(true);

      // Load account-based transfer limits
      const { data: limitsData, error: limitsError } = await supabase
        .from('share_transfer_limits_by_account')
        .select('*')
        .eq('account_type', accountType)
        .eq('is_active', true)
        .single();

      if (limitsError && limitsError.code !== 'PGRST116') {
        console.error('Error loading transfer limits:', limitsError);
      }

      if (limitsData) {
        setLimits(limitsData);
      } else {
        // Set default limits based on account type
        const defaultLimits = {
          individual: { daily: 500, weekly: 2500, monthly: 10000, minValue: 50000 },
          business: { daily: 2500, weekly: 12500, monthly: 50000, minValue: 100000 },
          organisation: { daily: 1500, weekly: 7500, monthly: 30000, minValue: 75000 }
        };
        
        const typeConfig = defaultLimits[accountType as keyof typeof defaultLimits] || defaultLimits.individual;
        
        setLimits({
          account_type: accountType || 'individual',
          daily_limit_shares: typeConfig.daily,
          weekly_limit_shares: typeConfig.weekly,
          monthly_limit_shares: typeConfig.monthly,
          minimum_transfer_value: typeConfig.minValue,
          is_active: true
        });
      }

      // Calculate current usage from completed transfers
      if (userId) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(todayStart.getDate() - todayStart.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // For now, use mock usage data until proper transaction tracking is implemented
        setUsage({ daily_used: 0, weekly_used: 0, monthly_used: 0 });
      }
    } catch (error) {
      console.error('Error loading transfer limits and usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateTransfer = (shareQuantity: number, userHoldings: number, sharePrice: number) => {
    if (!limits) {
      return { isValid: false, reason: 'Transfer limits not loaded' };
    }

    if (shareQuantity <= 0) {
      return { isValid: false, reason: 'Transfer quantity must be greater than zero' };
    }

    if (shareQuantity > userHoldings) {
      return { isValid: false, reason: 'Cannot transfer more shares than you own' };
    }

    // Check minimum transfer value
    const transferValue = shareQuantity * sharePrice;
    if (transferValue < limits.minimum_transfer_value) {
      return {
        isValid: false,
        reason: `Minimum transfer value is UGX ${limits.minimum_transfer_value.toLocaleString()}`
      };
    }

    // Check daily limit
    if (usage.daily_used + shareQuantity > limits.daily_limit_shares) {
      return {
        isValid: false,
        reason: `Daily transfer limit exceeded. Remaining: ${limits.daily_limit_shares - usage.daily_used} shares`
      };
    }

    // Check weekly limit
    if (usage.weekly_used + shareQuantity > limits.weekly_limit_shares) {
      return {
        isValid: false,
        reason: `Weekly transfer limit exceeded. Remaining: ${limits.weekly_limit_shares - usage.weekly_used} shares`
      };
    }

    // Check monthly limit
    if (usage.monthly_used + shareQuantity > limits.monthly_limit_shares) {
      return {
        isValid: false,
        reason: `Monthly transfer limit exceeded. Remaining: ${limits.monthly_limit_shares - usage.monthly_used} shares`
      };
    }

    return { isValid: true, reason: null };
  };

  const calculateTransferFee = (shareQuantity: number, sharePrice: number) => {
    const transferValue = shareQuantity * sharePrice;
    const percentageFee = (transferValue * 1.0) / 100; // 1% fee
    const flatFee = 5000; // UGX 5,000 flat fee
    const totalFee = percentageFee + flatFee;

    return {
      fee: totalFee,
      breakdown: {
        transfer_value: transferValue,
        percentage_fee: percentageFee,
        flat_fee: flatFee,
        percentage_rate: 1.0,
        total_fee: totalFee
      }
    };
  };

  return {
    limits,
    usage,
    loading,
    validateTransfer,
    calculateTransferFee,
    refreshLimits: loadLimitsAndUsage
  };
};