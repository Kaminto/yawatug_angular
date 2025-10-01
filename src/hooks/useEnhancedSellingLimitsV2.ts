import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SellingLimits {
  account_type: string;
  limit_type: string;
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  is_active: boolean;
}

export interface SellingUsage {
  daily_used: number;
  weekly_used: number;
  monthly_used: number;
}

export const useEnhancedSellingLimitsV2 = (userId?: string, accountType?: string) => {
  const [limits, setLimits] = useState<SellingLimits[]>([]);
  const [usage, setUsage] = useState<SellingUsage>({ daily_used: 0, weekly_used: 0, monthly_used: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && accountType) {
      loadLimitsAndUsage();
    }
  }, [userId, accountType]);

  const loadLimitsAndUsage = async () => {
    try {
      setLoading(true);

      // Load account-based selling limits
      const { data: limitsData, error: limitsError } = await supabase
        .from('share_selling_limits_by_account')
        .select('*')
        .eq('account_type', accountType)
        .eq('is_active', true);

      if (limitsError) {
        console.error('Error loading selling limits:', limitsError);
      }

      if (limitsData && limitsData.length > 0) {
        setLimits(limitsData);
      } else {
        // Set default limits based on account type
        const defaultLimits = {
          individual: { quantityDaily: 1000, quantityWeekly: 5000, quantityMonthly: 15000, percentDaily: 10, percentWeekly: 25, percentMonthly: 50 },
          business: { quantityDaily: 5000, quantityWeekly: 25000, quantityMonthly: 75000, percentDaily: 15, percentWeekly: 35, percentMonthly: 70 },
          organisation: { quantityDaily: 2500, quantityWeekly: 12500, quantityMonthly: 40000, percentDaily: 12, percentWeekly: 30, percentMonthly: 60 }
        };
        
        const typeConfig = defaultLimits[accountType as keyof typeof defaultLimits] || defaultLimits.individual;
        
        setLimits([
          {
            account_type: accountType || 'individual',
            limit_type: 'quantity',
            daily_limit: typeConfig.quantityDaily,
            weekly_limit: typeConfig.quantityWeekly,
            monthly_limit: typeConfig.quantityMonthly,
            is_active: true
          },
          {
            account_type: accountType || 'individual',
            limit_type: 'percentage',
            daily_limit: typeConfig.percentDaily,
            weekly_limit: typeConfig.percentWeekly,
            monthly_limit: typeConfig.percentMonthly,
            is_active: true
          }
        ]);
      }

      // Calculate current usage from completed sales
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
      console.error('Error loading selling limits and usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateSelling = (shareQuantity: number, totalHoldings: number) => {
    if (!limits.length) {
      return { isValid: false, reason: 'Selling limits not loaded' };
    }

    if (shareQuantity <= 0) {
      return { isValid: false, reason: 'Selling quantity must be greater than zero' };
    }

    if (shareQuantity > totalHoldings) {
      return { isValid: false, reason: 'Cannot sell more shares than you own' };
    }

    // Check all active limits
    for (const limit of limits) {
      if (!limit.is_active) continue;

      let currentLimit: number;
      let currentUsed: number;
      let limitType: string;

      if (limit.limit_type === 'quantity') {
        // Check daily quantity limit
        if (usage.daily_used + shareQuantity > limit.daily_limit) {
          return {
            isValid: false,
            reason: `Daily quantity limit exceeded. Remaining: ${limit.daily_limit - usage.daily_used} shares`
          };
        }

        // Check weekly quantity limit
        if (usage.weekly_used + shareQuantity > limit.weekly_limit) {
          return {
            isValid: false,
            reason: `Weekly quantity limit exceeded. Remaining: ${limit.weekly_limit - usage.weekly_used} shares`
          };
        }

        // Check monthly quantity limit
        if (usage.monthly_used + shareQuantity > limit.monthly_limit) {
          return {
            isValid: false,
            reason: `Monthly quantity limit exceeded. Remaining: ${limit.monthly_limit - usage.monthly_used} shares`
          };
        }
      } else if (limit.limit_type === 'percentage') {
        const percentageOfHoldings = (shareQuantity / totalHoldings) * 100;
        
        // Check percentage limits
        if (percentageOfHoldings > limit.daily_limit) {
          return {
            isValid: false,
            reason: `Daily percentage limit exceeded. Maximum: ${limit.daily_limit}% of holdings`
          };
        }
      }
    }

    return { isValid: true, reason: null };
  };

  const getMaxAllowedQuantity = (totalHoldings: number) => {
    if (!limits.length) return 0;

    let maxQuantity = totalHoldings;

    // Apply all active limits
    for (const limit of limits) {
      if (!limit.is_active) continue;

      if (limit.limit_type === 'quantity') {
        const dailyRemaining = Math.max(0, limit.daily_limit - usage.daily_used);
        const weeklyRemaining = Math.max(0, limit.weekly_limit - usage.weekly_used);
        const monthlyRemaining = Math.max(0, limit.monthly_limit - usage.monthly_used);
        
        const quantityLimit = Math.min(dailyRemaining, weeklyRemaining, monthlyRemaining);
        maxQuantity = Math.min(maxQuantity, quantityLimit);
      } else if (limit.limit_type === 'percentage') {
        const percentageLimit = Math.floor((limit.daily_limit / 100) * totalHoldings);
        maxQuantity = Math.min(maxQuantity, percentageLimit);
      }
    }

    return Math.max(0, maxQuantity);
  };

  return {
    limits,
    usage,
    loading,
    validateSelling,
    getMaxAllowedQuantity,
    refreshLimits: loadLimitsAndUsage
  };
};