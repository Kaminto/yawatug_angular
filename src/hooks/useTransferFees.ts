import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TransferFeeSettings {
  basePercentage: number;
  flatFee: number;
  minimumFee: number;
  maximumFee?: number;
  currency: string;
}

export const useTransferFees = () => {
  const [feeSettings, setFeeSettings] = useState<TransferFeeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFeeSettings = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('share_transfer_fee_settings')
        .select('*')
        .eq('is_active', true)
        .eq('currency', 'UGX')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setFeeSettings(data ? {
        basePercentage: data.base_percentage,
        flatFee: data.flat_fee,
        minimumFee: data.minimum_fee,
        maximumFee: data.maximum_fee,
        currency: data.currency
      } : {
        basePercentage: 1.0,
        flatFee: 5000,
        minimumFee: 5000,
        currency: 'UGX'
      });
    } catch (error) {
      console.error('Error loading fee settings:', error);
      // Default settings
      setFeeSettings({
        basePercentage: 1.0,
        flatFee: 5000,
        minimumFee: 5000,
        currency: 'UGX'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeeSettings();
  }, [loadFeeSettings]);

  const calculateTransferFee = useCallback((quantity: number, sharePrice: number) => {
    if (!feeSettings) return { fee: 0, breakdown: null };

    const transferValue = quantity * sharePrice;
    const percentageFee = (transferValue * feeSettings.basePercentage) / 100;
    let totalFee = percentageFee + feeSettings.flatFee;

    // Apply minimum fee
    if (totalFee < feeSettings.minimumFee) {
      totalFee = feeSettings.minimumFee;
    }

    // Apply maximum fee if set
    if (feeSettings.maximumFee && totalFee > feeSettings.maximumFee) {
      totalFee = feeSettings.maximumFee;
    }

    return {
      fee: totalFee,
      breakdown: {
        transferValue,
        percentageFee,
        flatFee: feeSettings.flatFee,
        percentageRate: feeSettings.basePercentage,
        totalFee,
        minimumFee: feeSettings.minimumFee,
        maximumFee: feeSettings.maximumFee
      }
    };
  }, [feeSettings]);

  return {
    feeSettings,
    loading,
    calculateTransferFee,
    refreshSettings: loadFeeSettings
  };
};