import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTransactionFees } from './useTransactionFees';

interface EnhancedSellingLimit {
  id: string;
  account_type: string;
  limit_type: 'quantity' | 'percentage';
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  is_active: boolean;
}

interface SellingUsage {
  daily: number;
  weekly: number;
  monthly: number;
}

export const useEnhancedSellingLimits = (userId: string, accountType?: string) => {
  const [limits, setLimits] = useState<EnhancedSellingLimit[]>([]);
  const [usage, setUsage] = useState<SellingUsage>({
    daily: 0,
    weekly: 0,
    monthly: 0
  });
  const [loading, setLoading] = useState(true);
  const { getFeeDetails } = useTransactionFees();

  useEffect(() => {
    if (userId) {
      loadLimitsAndUsage();
    }
  }, [userId, accountType]);

  const loadLimitsAndUsage = async () => {
    try {
      setLoading(true);

      // Get user's account type from profile if not provided
      let userAccountType = accountType;
      if (!userAccountType) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        userAccountType = profileData?.account_type || 'individual';
      }

      // Load active selling limits for user's account type
      const { data: limitsData, error: limitsError } = await supabase
        .from('share_selling_limits_by_account')
        .select('*')
        .eq('account_type', userAccountType)
        .eq('is_active', true);

      if (limitsError) throw limitsError;

      // Map and type-cast the data
      const mappedLimits: EnhancedSellingLimit[] = (limitsData || []).map(item => ({
        id: item.id,
        account_type: item.account_type,
        limit_type: item.limit_type as 'quantity' | 'percentage',
        daily_limit: item.daily_limit,
        weekly_limit: item.weekly_limit,
        monthly_limit: item.monthly_limit,
        is_active: item.is_active
      }));
      
      setLimits(mappedLimits);

      // Calculate usage for different periods
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: usageData, error: usageError } = await supabase
        .from('share_buyback_orders')
        .select('quantity, created_at')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (usageError) throw usageError;

      const calculatePeriodUsage = (startDate: Date) => {
        return (usageData || [])
          .filter(order => new Date(order.created_at) >= startDate)
          .reduce((total, order) => total + order.quantity, 0);
      };

      setUsage({
        daily: calculatePeriodUsage(startOfDay),
        weekly: calculatePeriodUsage(startOfWeek),
        monthly: calculatePeriodUsage(startOfMonth)
      });

    } catch (error) {
      console.error('Error loading limits and usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateSelling = (quantity: number, totalHoldings: number) => {
    const violations = [];

    for (const limit of limits) {
      if (limit.limit_type === 'quantity') {
        // Check daily limit
        if (usage.daily + quantity > limit.daily_limit) {
          violations.push(`Cannot sell more than ${limit.daily_limit} shares per day (current usage: ${usage.daily})`);
        }
        // Check weekly limit
        if (usage.weekly + quantity > limit.weekly_limit) {
          violations.push(`Cannot sell more than ${limit.weekly_limit} shares per week (current usage: ${usage.weekly})`);
        }
        // Check monthly limit
        if (usage.monthly + quantity > limit.monthly_limit) {
          violations.push(`Cannot sell more than ${limit.monthly_limit} shares per month (current usage: ${usage.monthly})`);
        }
      }
      
      if (limit.limit_type === 'percentage') {
        const dailyPercentage = ((usage.daily + quantity) / totalHoldings) * 100;
        const weeklyPercentage = ((usage.weekly + quantity) / totalHoldings) * 100;
        const monthlyPercentage = ((usage.monthly + quantity) / totalHoldings) * 100;
        
        if (dailyPercentage > limit.daily_limit) {
          violations.push(`Cannot sell more than ${limit.daily_limit}% of holdings per day`);
        }
        if (weeklyPercentage > limit.weekly_limit) {
          violations.push(`Cannot sell more than ${limit.weekly_limit}% of holdings per week`);
        }
        if (monthlyPercentage > limit.monthly_limit) {
          violations.push(`Cannot sell more than ${limit.monthly_limit}% of holdings per month`);
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  };

  const calculateFees = (quantity: number, sharePrice: number) => {
    const totalAmount = quantity * sharePrice;
    return getFeeDetails('share_sell', totalAmount);
  };

  const getMaxAllowedQuantity = (totalHoldings: number) => {
    let maxQuantity = totalHoldings;

    for (const limit of limits) {
      if (limit.limit_type === 'quantity') {
        // Consider the most restrictive limit (daily, weekly, monthly)
        const dailyAvailable = Math.max(0, limit.daily_limit - usage.daily);
        const weeklyAvailable = Math.max(0, limit.weekly_limit - usage.weekly);
        const monthlyAvailable = Math.max(0, limit.monthly_limit - usage.monthly);
        
        const availableQuantity = Math.min(dailyAvailable, weeklyAvailable, monthlyAvailable);
        maxQuantity = Math.min(maxQuantity, availableQuantity);
      }
      
      if (limit.limit_type === 'percentage') {
        const dailyMaxQuantity = Math.floor((limit.daily_limit / 100) * totalHoldings);
        const weeklyMaxQuantity = Math.floor((limit.weekly_limit / 100) * totalHoldings);
        const monthlyMaxQuantity = Math.floor((limit.monthly_limit / 100) * totalHoldings);
        
        const dailyAvailable = Math.max(0, dailyMaxQuantity - usage.daily);
        const weeklyAvailable = Math.max(0, weeklyMaxQuantity - usage.weekly);
        const monthlyAvailable = Math.max(0, monthlyMaxQuantity - usage.monthly);
        
        const availableQuantity = Math.min(dailyAvailable, weeklyAvailable, monthlyAvailable);
        maxQuantity = Math.min(maxQuantity, availableQuantity);
      }
    }

    return Math.max(0, maxQuantity);
  };

  const getRemainingLimits = (totalHoldings: number) => {
    return limits.flatMap(limit => {
      const dailyResult = {
        id: `${limit.id}-daily`,
        type: `${limit.limit_type} - daily`,
        total: limit.limit_type === 'quantity' ? limit.daily_limit : Math.floor((limit.daily_limit / 100) * totalHoldings),
        used: usage.daily,
        remaining: 0,
        utilization: 0
      };
      
      const weeklyResult = {
        id: `${limit.id}-weekly`,
        type: `${limit.limit_type} - weekly`,
        total: limit.limit_type === 'quantity' ? limit.weekly_limit : Math.floor((limit.weekly_limit / 100) * totalHoldings),
        used: usage.weekly,
        remaining: 0,
        utilization: 0
      };
      
      const monthlyResult = {
        id: `${limit.id}-monthly`,
        type: `${limit.limit_type} - monthly`,
        total: limit.limit_type === 'quantity' ? limit.monthly_limit : Math.floor((limit.monthly_limit / 100) * totalHoldings),
        used: usage.monthly,
        remaining: 0,
        utilization: 0
      };
      
      // Calculate remaining and utilization
      [dailyResult, weeklyResult, monthlyResult].forEach(result => {
        result.remaining = Math.max(0, result.total - result.used);
        result.utilization = result.total > 0 ? Math.min(100, (result.used / result.total) * 100) : 0;
      });
      
      return [dailyResult, weeklyResult, monthlyResult];
    });
  };

  return {
    limits,
    usage,
    loading,
    validateSelling,
    calculateFees,
    getMaxAllowedQuantity,
    getRemainingLimits,
    refreshLimits: loadLimitsAndUsage
  };
};