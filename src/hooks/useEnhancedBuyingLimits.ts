import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContextualData } from '@/hooks/useContextualData';

export interface EnhancedBuyingLimits {
  min_buy_amount: number;
  max_buy_amount: number;
  required_down_payment_percentage: number;
  credit_period_days: number;
  account_type: string;
  fee_percentage: number;
  fee_flat: number;
  fee_minimum?: number;
  fee_maximum?: number;
}

export const useEnhancedBuyingLimits = (accountType?: string) => {
  const [limits, setLimits] = useState<EnhancedBuyingLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdminMode, effectiveUserId } = useContextualData();

  useEffect(() => {
    if (effectiveUserId) {
      loadEnhancedLimits(accountType);
    }
  }, [accountType, effectiveUserId, isAdminMode]);

  const loadEnhancedLimits = async (fallbackAccountType?: string) => {
    try {
      setLoading(true);

      // Get user's account type if not provided
      let userAccountType = fallbackAccountType;
      if (!userAccountType) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', effectiveUserId)
          .single();

        if (profileError) throw profileError;
        userAccountType = profile?.account_type || 'individual';
      }

      // Load buying limits based on account type
      console.log('useEnhancedBuyingLimits: Loading limits for account type:', userAccountType);
      const { data: buyingLimits, error: buyingError } = await supabase
        .from('share_buying_limits')
        .select('*')
        .eq('account_type', userAccountType)
        .maybeSingle();

      if (buyingError) {
        console.warn('No buying limits found for account type:', userAccountType, 'Error:', buyingError);
      } else {
        console.log('useEnhancedBuyingLimits: Found limits data:', buyingLimits);
      }

      // Load transaction fees for share purchases
      const { data: feeSettings, error: feeError } = await supabase
        .from('transaction_fee_settings')
        .select('*')
        .eq('transaction_type', 'share_purchase')
        .eq('currency', 'UGX')
        .eq('fee_collection_enabled', true)
        .single();

      if (feeError) {
        console.warn('No fee settings found for share purchases');
      }

      // Combine limits with default fallbacks
      const combinedLimits: EnhancedBuyingLimits = {
        min_buy_amount: buyingLimits?.min_buy_amount || 1,
        max_buy_amount: buyingLimits?.max_buy_amount || 10000,
        required_down_payment_percentage: buyingLimits?.required_down_payment_percentage || 30,
        credit_period_days: buyingLimits?.credit_period_days || 30,
        account_type: userAccountType,
        fee_percentage: feeSettings?.percentage_fee || 2.5,
        fee_flat: feeSettings?.flat_fee || 0,
        fee_minimum: feeSettings?.minimum_fee,
        fee_maximum: feeSettings?.maximum_fee
      };

      // Note: Admin mode no longer multiplies limits - using database values directly

      setLimits(combinedLimits);
    } catch (error) {
      console.error('Error loading enhanced buying limits:', error);
      // Set default limits in case of error
      setLimits({
        min_buy_amount: 1,
        max_buy_amount: 10000,
        required_down_payment_percentage: 30,
        credit_period_days: 30,
        account_type: accountType || 'individual',
        fee_percentage: 2.5,
        fee_flat: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePurchase = (quantity: number, ownedShares: number = 0) => {
    if (!limits) return { isValid: false, reason: 'Limits not loaded' };

    // Calculate min order: min_limit - shares_held (for first buy/booking)
    const effectiveMinOrder = Math.max(1, limits.min_buy_amount - ownedShares);
    
    if (quantity < effectiveMinOrder) {
      return {
        isValid: false,
        reason: `Minimum purchase is ${effectiveMinOrder} shares (${limits.min_buy_amount} - ${ownedShares} owned)`
      };
    }

    if (quantity > limits.max_buy_amount) {
      return {
        isValid: false,
        reason: `Maximum purchase limit is ${limits.max_buy_amount} shares`
      };
    }

    return { isValid: true, reason: null };
  };

  const calculateFees = (amount: number) => {
    if (!limits) return { percentage: 0, flat: 0, total: 0 };

    const percentageFee = (amount * limits.fee_percentage) / 100;
    let totalFee = percentageFee + limits.fee_flat;

    if (limits.fee_minimum && totalFee < limits.fee_minimum) {
      totalFee = limits.fee_minimum;
    }
    if (limits.fee_maximum && totalFee > limits.fee_maximum) {
      totalFee = limits.fee_maximum;
    }

    return {
      percentage: limits.fee_percentage,
      flat: limits.fee_flat,
      total: totalFee
    };
  };

  return {
    limits,
    loading,
    validatePurchase,
    calculateFees,
    refreshLimits: () => loadEnhancedLimits()
  };
};