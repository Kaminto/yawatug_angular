
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeeStructure {
  id: string;
  transaction_type: string;
  flat_fee: number;
  percentage_fee: number;
  currency: string;
  minimum_fee?: number;
  maximum_fee?: number;
  is_active?: boolean;
  fee_collection_enabled?: boolean;
  fee_type?: string;
  created_at?: string;
  updated_at?: string;
}

export const useTransactionFees = () => {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);

  useEffect(() => {
    loadFeeStructures();
  }, []);

  const loadFeeStructures = async () => {
    try {
      const { data, error } = await supabase
        .from('transaction_fee_settings')
        .select('*');

      if (error) throw error;
      setFeeStructures(data || []);
    } catch (error) {
      console.error('Error loading fee structures:', error);
    }
  };

  const getFeeDetails = (transactionType: string, amount: number, currency: string = 'UGX') => {
    const feeStructure = feeStructures.find(
      f => f.transaction_type === transactionType && f.currency === currency
    );

    if (!feeStructure) {
      return {
        percentage: 0,
        calculatedFee: 0,
        flatFee: 0,
        totalFee: 0
      };
    }

    const calculatedFee = (amount * feeStructure.percentage_fee) / 100;
    const totalFee = calculatedFee + feeStructure.flat_fee;

    let finalFee = totalFee;
    if (feeStructure.minimum_fee && finalFee < feeStructure.minimum_fee) {
      finalFee = feeStructure.minimum_fee;
    }
    if (feeStructure.maximum_fee && finalFee > feeStructure.maximum_fee) {
      finalFee = feeStructure.maximum_fee;
    }

    return {
      percentage: feeStructure.percentage_fee,
      calculatedFee,
      flatFee: feeStructure.flat_fee,
      totalFee: finalFee,
      minFee: feeStructure.minimum_fee,
      maxFee: feeStructure.maximum_fee
    };
  };

  // Legacy method for backward compatibility
  const calculateFee = (transactionType: string, amount: number, currency: string = 'UGX') => {
    return getFeeDetails(transactionType, amount, currency);
  };

  return {
    feeStructures,
    getFeeDetails,
    calculateFee
  };
};
