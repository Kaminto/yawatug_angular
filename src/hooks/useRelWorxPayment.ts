import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

interface PaymentData {
  amount: number;
  currency: string;
  phone: string;
  network?: string;
  transactionType: 'deposit' | 'withdraw';
  description?: string;
}

interface ValidateNumberData {
  phone: string;
}

interface CheckStatusData {
  internal_reference: string;
}

export const useRelWorxPayment = () => {
  const [isLoading, setIsLoading] = useState(false);

  const validatePhoneNumber = async (data: ValidateNumberData) => {
    setIsLoading(true);
    try {
      // Format phone number to E.164
      let formattedPhone = data.phone;
      try {
        const phoneNumber = parsePhoneNumberFromString(data.phone);
        if (phoneNumber && phoneNumber.isValid()) {
          formattedPhone = phoneNumber.format('E.164');
        }
      } catch (error) {
        console.warn('Phone formatting failed, using original:', error);
      }

      const { data: result, error } = await supabase.functions.invoke('relworx-payment-gateway', {
        body: {
          action: 'validate-number',
          msisdn: formattedPhone
        }
      });

      if (error) {
        console.error('Phone validation error:', error);
        toast.error('Failed to validate phone number');
        return { success: false, error: error.message };
      }

      if (result.success) {
        toast.success(`Phone validated: ${result.customer_name || 'Valid number'}`);
        return { 
          success: true, 
          data: { 
            customer_name: result.customer_name,
            validated_phone: formattedPhone
          }
        };
      } else {
        toast.error(result.message || 'Phone validation failed');
        return { success: false, error: result.message };
      }
    } catch (error: any) {
      console.error('Phone validation error:', error);
      toast.error('Phone validation failed');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const checkPaymentStatus = async (data: CheckStatusData) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('relworx-payment-gateway', {
        body: {
          action: 'check-status',
          internal_reference: data.internal_reference
        }
      });

      if (error) {
        console.error('Status check error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Status check error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const processMobileMoneyPayment = async (paymentData: PaymentData) => {
    setIsLoading(true);
    
    // Input validation
    if (!paymentData.amount || paymentData.amount <= 0) {
      toast.error('Invalid amount specified');
      setIsLoading(false);
      return { success: false, error: 'Invalid amount' };
    }
    
    if (!paymentData.phone || paymentData.phone.length < 10) {
      toast.error('Please provide a valid phone number');
      setIsLoading(false);
      return { success: false, error: 'Invalid phone number' };
    }
    
    try {
      console.log('🚀 Initiating RelWorx payment:', {
        amount: paymentData.amount,
        currency: paymentData.currency,
        transactionType: paymentData.transactionType,
        network: paymentData.network
      });

      // Format phone number to E.164 format
      let formattedPhone = paymentData.phone;
      try {
        const phoneNumber = parsePhoneNumberFromString(paymentData.phone);
        if (phoneNumber && phoneNumber.isValid()) {
          formattedPhone = phoneNumber.format('E.164');
        }
      } catch (error) {
        console.warn('Phone formatting failed, using original number');
        // Fallback formatting for Uganda
        if (!formattedPhone.startsWith('+')) {
          if (formattedPhone.startsWith('256')) {
            formattedPhone = '+' + formattedPhone;
          } else if (formattedPhone.startsWith('0')) {
            formattedPhone = '+256' + formattedPhone.substring(1);
          } else {
            formattedPhone = '+256' + formattedPhone;
          }
        }
      }

      const action = paymentData.transactionType === 'deposit' ? 'request-payment' : 'send-payment';
      
      const { data, error } = await supabase.functions.invoke('relworx-payment-gateway', {
        body: {
          action,
          amount: paymentData.amount,
          currency: paymentData.currency,
          msisdn: formattedPhone,
          description: paymentData.description || `${paymentData.transactionType} via mobile money`,
          reference: `YWT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transaction_type: paymentData.transactionType
        }
      });

      if (error) {
        console.error('❌ RelWorx payment error:', error);
        let errorMessage = error.message || 'Payment processing failed';
        
        // Handle specific authentication errors
        if (errorMessage.includes('authentication') || errorMessage.includes('Invalid API key')) {
          errorMessage = 'Payment gateway authentication failed. Please contact support.';
        } else if (errorMessage.includes('configuration')) {
          errorMessage = 'Payment service configuration error. Please contact support.';
        }
        
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (data?.success) {
        const successMessage = data.message || 'Payment initiated successfully';
        toast.success(successMessage);
        console.log('✅ Payment initiated successfully:', {
          transactionId: data.transaction_id,
          internalReference: data.internal_reference
        });
        return { success: true, data };
      } else {
        const errorMessage = data?.error || 'Payment processing failed';
        console.error('❌ Payment failed:', data);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error: any) {
      console.error('❌ Payment processing error:', error);
      const errorMessage = error?.message || 'Failed to process payment';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy method for backward compatibility
  const checkTransactionStatus = async (transactionId: string) => {
    if (!transactionId) {
      console.error('Transaction ID is required for status check');
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          status, 
          gateway_reference,
          amount,
          currency,
          transaction_type,
          created_at,
          updated_at
        `)
        .eq('id', transactionId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error checking payment status:', error);
        return null;
      }

      if (!data) {
        console.warn('⚠️ Transaction not found:', transactionId);
        return null;
      }

      console.log('✅ Payment status retrieved:', {
        transactionId,
        status: data.status,
        amount: data.amount,
        currency: data.currency
      });

      return data;
    } catch (error) {
      console.error('❌ Payment status check error:', error);
      return null;
    }
  };

  const getRelWorxConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('relworx_payment_configs')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching RelWorx config:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('RelWorx config fetch error:', error);
      return null;
    }
  };

  return {
    processMobileMoneyPayment,
    validatePhoneNumber,
    checkPaymentStatus: checkTransactionStatus, // Keep backward compatibility
    checkTransactionStatus,
    getRelWorxConfig,
    isLoading,
    loading: isLoading // Backward compatibility
  };
};