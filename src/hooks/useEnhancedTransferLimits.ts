import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TransferFeeSettings {
  percentage_fee: number;
  flat_fee: number;
  minimum_fee?: number;
  maximum_fee?: number;
  currency: string;
}

export const useEnhancedTransferLimits = () => {
  const [feeSettings, setFeeSettings] = useState<TransferFeeSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransferSettings();
  }, []);

  const loadTransferSettings = async () => {
    try {
      setLoading(true);

      // Load transfer fee settings
      const { data: transferFees, error: feeError } = await supabase
        .from('transaction_fee_settings')
        .select('*')
        .eq('transaction_type', 'share_transfer')
        .eq('currency', 'UGX')
        .single();

      if (feeError && feeError.code !== 'PGRST116') {
        throw feeError;
      }

      setFeeSettings(transferFees || {
        percentage_fee: 1.0,
        flat_fee: 5000,
        currency: 'UGX'
      });

    } catch (error) {
      console.error('Error loading transfer settings:', error);
      // Set default settings
      setFeeSettings({
        percentage_fee: 1.0,
        flat_fee: 5000,
        currency: 'UGX'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTransferFee = (shareQuantity: number, sharePrice: number) => {
    if (!feeSettings) return { fee: 0, breakdown: null };

    const transferValue = shareQuantity * sharePrice;
    const percentageFee = (transferValue * feeSettings.percentage_fee) / 100;
    let totalFee = percentageFee + feeSettings.flat_fee;

    if (feeSettings.minimum_fee && totalFee < feeSettings.minimum_fee) {
      totalFee = feeSettings.minimum_fee;
    }
    if (feeSettings.maximum_fee && totalFee > feeSettings.maximum_fee) {
      totalFee = feeSettings.maximum_fee;
    }

    return {
      fee: totalFee,
      breakdown: {
        transfer_value: transferValue,
        percentage_fee: percentageFee,
        flat_fee: feeSettings.flat_fee,
        percentage_rate: feeSettings.percentage_fee,
        total_fee: totalFee
      }
    };
  };

  const validateTransfer = (shareQuantity: number, userHoldings: number, sharePrice: number, userAccountType: string = 'individual') => {
    if (shareQuantity <= 0) {
      return { isValid: false, reason: 'Transfer quantity must be greater than zero' };
    }

    if (shareQuantity > userHoldings) {
      return { isValid: false, reason: 'Cannot transfer more shares than you own' };
    }

    // Check if user has minimum threshold for transfers (optional business rule)
    const minTransferValue = 10000; // UGX 10,000 minimum
    const transferValue = shareQuantity * sharePrice;
    
    if (transferValue < minTransferValue) {
      return {
        isValid: false,
        reason: `Minimum transfer value is UGX ${minTransferValue.toLocaleString()}`
      };
    }

    return { isValid: true, reason: null };
  };

  return {
    feeSettings,
    loading,
    calculateTransferFee,
    validateTransfer,
    refreshSettings: loadTransferSettings
  };
};