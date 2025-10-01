import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useTransferValidation = () => {
  const [loading, setLoading] = useState(false);

  const validateRecipient = useCallback(async (contact: string) => {
    try {
      const isEmail = contact.includes('@');
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone, status');

      if (isEmail) {
        query = query.eq('email', contact.trim());
      } else {
        query = query.eq('phone', contact.trim());
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return { found: false, recipient: null };
      }

      return { found: true, recipient: data };
    } catch (error) {
      return { found: false, recipient: null };
    }
  }, []);

  const validateTransfer = useCallback(async (
    userId: string,
    recipientId: string,
    shareId: string,
    quantity: number,
    transferValue: number
  ): Promise<ValidationResult> => {
    setLoading(true);
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validations
      if (!shareId || !quantity || quantity <= 0) {
        errors.push('Please select a share and specify a valid quantity');
      }

      if (!recipientId) {
        errors.push('Please specify a valid recipient');
      }

      if (userId === recipientId) {
        errors.push('Cannot transfer shares to yourself');
      }

      // Check user's share holdings
      const { data: holding } = await supabase
        .from('user_share_holdings')
        .select('quantity')
        .eq('user_id', userId)
        .eq('share_id', shareId)
        .single();

      if (!holding || holding.quantity < quantity) {
        errors.push('Insufficient shares available for transfer');
      }

      // Check daily transfer limits
      const { data: dailyTransfers } = await supabase
        .from('share_transfer_requests')
        .select('id')
        .eq('sender_id', userId)
        .gte('created_at', new Date().toISOString().split('T')[0])
        .in('status', ['pending', 'approved', 'completed']);

      if (dailyTransfers && dailyTransfers.length >= 3) {
        errors.push('Daily transfer limit exceeded (3 transfers per day)');
      }

      // Check transfer value thresholds
      const minTransferValue = 10000; // UGX 10,000
      if (transferValue < minTransferValue) {
        errors.push(`Minimum transfer value is UGX ${minTransferValue.toLocaleString()}`);
      }

      // Add warnings for high-value transfers
      if (transferValue > 100000) {
        warnings.push('High-value transfers may require admin approval');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: ['Failed to validate transfer request'],
        warnings: []
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    validateRecipient,
    validateTransfer
  };
};