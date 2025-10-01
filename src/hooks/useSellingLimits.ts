
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SellingLimit {
  id: string;
  limit_type: 'quantity' | 'percentage';
  period_type: 'day' | 'week' | 'month' | 'quarter' | 'year';
  limit_value: number;
  is_active: boolean;
}

export const useSellingLimits = () => {
  const [limits, setLimits] = useState<SellingLimit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSellingLimits();
  }, []);

  const loadSellingLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('share_selling_limits')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      
      // Map the data to ensure type safety
      const mappedLimits: SellingLimit[] = (data || []).map(item => ({
        id: item.id,
        limit_type: item.limit_type as 'quantity' | 'percentage',
        period_type: item.period_type as 'day' | 'week' | 'month' | 'quarter' | 'year',
        limit_value: item.limit_value,
        is_active: item.is_active
      }));
      
      setLimits(mappedLimits);
    } catch (error) {
      console.error('Error loading selling limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateSelling = (quantity: number, totalHoldings: number) => {
    const violations = [];

    for (const limit of limits) {
      if (limit.limit_type === 'quantity' && quantity > limit.limit_value) {
        violations.push(`Cannot sell more than ${limit.limit_value} shares per ${limit.period_type}`);
      }
      
      if (limit.limit_type === 'percentage') {
        const percentage = (quantity / totalHoldings) * 100;
        if (percentage > limit.limit_value) {
          violations.push(`Cannot sell more than ${limit.limit_value}% of holdings per ${limit.period_type}`);
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  };

  const getMaxAllowedQuantity = (totalHoldings: number) => {
    let maxQuantity = totalHoldings;

    for (const limit of limits) {
      if (limit.limit_type === 'quantity') {
        maxQuantity = Math.min(maxQuantity, limit.limit_value);
      }
      
      if (limit.limit_type === 'percentage') {
        const percentageQuantity = Math.floor((limit.limit_value / 100) * totalHoldings);
        maxQuantity = Math.min(maxQuantity, percentageQuantity);
      }
    }

    return maxQuantity;
  };

  return {
    limits,
    loading,
    validateSelling,
    getMaxAllowedQuantity,
    loadSellingLimits
  };
};
