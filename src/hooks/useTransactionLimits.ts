
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TransactionLimit {
  id: string;
  transaction_type: string;
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  min_amount: number;
  max_amount: number;
  currency: string;
  account_type?: string;
}

export interface TransactionUsage {
  daily_used: number;
  weekly_used: number;
  monthly_used: number;
}

export const useTransactionLimits = (userId: string | null) => {
  const [limits, setLimits] = useState<TransactionLimit[]>([]);
  const [usage, setUsage] = useState<Record<string, TransactionUsage>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadLimitsAndUsage();
    }
  }, [userId]);

  const loadLimitsAndUsage = async () => {
    try {
      setLoading(true);
      
      // For now, we'll use default limits since transaction_limits table doesn't exist
      const defaultLimits: TransactionLimit[] = [
        {
          id: '1',
          transaction_type: 'share_purchase',
          daily_limit: 1000000,
          weekly_limit: 5000000,
          monthly_limit: 20000000,
          min_amount: 1000,
          max_amount: 10000000,
          currency: 'UGX'
        },
        {
          id: '2',
          transaction_type: 'share_selling',
          daily_limit: 500000,
          weekly_limit: 2500000,
          monthly_limit: 10000000,
          min_amount: 1000,
          max_amount: 5000000,
          currency: 'UGX'
        },
        {
          id: '3',
          transaction_type: 'transfer',
          daily_limit: 2000000,
          weekly_limit: 10000000,
          monthly_limit: 40000000,
          min_amount: 1000,
          max_amount: 20000000,
          currency: 'UGX'
        }
      ];

      setLimits(defaultLimits);

      // Calculate usage for the current user from share_transactions
      if (userId) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const { data: transactions, error: transError } = await supabase
          .from('share_transactions')
          .select('transaction_type, total_amount, created_at')
          .eq('user_id', userId)
          .gte('created_at', startOfMonth.toISOString());

        if (transError) throw transError;

        const usageMap: Record<string, TransactionUsage> = {};
        
        (transactions || []).forEach(tx => {
          const txDate = new Date(tx.created_at);
          const txAmount = Math.abs(tx.total_amount || 0);
          
          if (!usageMap[tx.transaction_type]) {
            usageMap[tx.transaction_type] = {
              daily_used: 0,
              weekly_used: 0,
              monthly_used: 0
            };
          }

          usageMap[tx.transaction_type].monthly_used += txAmount;
          
          if (txDate >= startOfWeek) {
            usageMap[tx.transaction_type].weekly_used += txAmount;
          }
          
          if (txDate >= startOfDay) {
            usageMap[tx.transaction_type].daily_used += txAmount;
          }
        });

        setUsage(usageMap);
      }
    } catch (error) {
      console.error('Error loading limits and usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTransactionLimit = (transactionType: string, amount: number) => {
    const limit = limits.find(l => l.transaction_type === transactionType);
    const currentUsage = usage[transactionType] || { daily_used: 0, weekly_used: 0, monthly_used: 0 };

    if (!limit) {
      return { allowed: true };
    }

    if (amount < limit.min_amount || amount > limit.max_amount) {
      return { 
        allowed: false, 
        reason: `Amount must be between ${limit.min_amount.toLocaleString()} and ${limit.max_amount.toLocaleString()}` 
      };
    }

    if (currentUsage.daily_used + amount > limit.daily_limit) {
      return { 
        allowed: false, 
        reason: `Daily limit exceeded. Remaining: ${(limit.daily_limit - currentUsage.daily_used).toLocaleString()}` 
      };
    }

    if (currentUsage.weekly_used + amount > limit.weekly_limit) {
      return { 
        allowed: false, 
        reason: `Weekly limit exceeded. Remaining: ${(limit.weekly_limit - currentUsage.weekly_used).toLocaleString()}` 
      };
    }

    if (currentUsage.monthly_used + amount > limit.monthly_limit) {
      return { 
        allowed: false, 
        reason: `Monthly limit exceeded. Remaining: ${(limit.monthly_limit - currentUsage.monthly_used).toLocaleString()}` 
      };
    }

    return { allowed: true };
  };

  return {
    limits,
    usage,
    loading,
    checkTransactionLimit
  };
};
