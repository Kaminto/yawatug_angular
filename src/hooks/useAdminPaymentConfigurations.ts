import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MerchantCode, BankAccount } from '@/types/payment';

interface RelWorxConfig {
  id: string;
  merchant_id: string;
  account_no: string;
  is_sandbox: boolean;
  is_active: boolean;
  supported_currencies?: string[];
  payment_limits?: {
    min_ugx: number;
    max_ugx: number;
    min_kes: number;
    max_kes: number;
    min_tzs: number;
    max_tzs: number;
  };
}

interface AdminMerchantCode {
  id: string;
  provider_name: string;
  merchant_code: string;
  currency: string;
  is_active: boolean;
  environment: string;
  api_endpoint?: string;
  webhook_url?: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  approval_status?: string;
}

interface AdminBankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code?: string;
  swift_code?: string;
  currency: string;
  account_type: string;
  is_active: boolean;
  is_primary: boolean;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  approval_status?: string;
}

interface PaymentConfigurations {
  merchantCodes: AdminMerchantCode[];
  bankAccounts: AdminBankAccount[];
  relworxConfig: RelWorxConfig | null;
}

export const useAdminPaymentConfigurations = () => {
  const [configurations, setConfigurations] = useState<PaymentConfigurations>({
    merchantCodes: [],
    bankAccounts: [],
    relworxConfig: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch merchant codes - include sandbox in dev/preview environments
      const isProduction = window.location.hostname === 'yawatug.com';
      const environmentFilter = isProduction ? 'production' : ['production', 'sandbox'];
      
      let merchantQuery = supabase
        .from('admin_merchant_codes')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      // Add environment filter
      if (isProduction) {
        merchantQuery = merchantQuery.eq('environment', 'production');
      } else {
        merchantQuery = merchantQuery.in('environment', ['production', 'sandbox']);
      }

      const { data: merchantCodes, error: merchantError } = await merchantQuery;

      if (merchantError) {
        console.error('Error fetching merchant codes:', merchantError);
        setError('Failed to load merchant codes');
      }

      // Fetch bank accounts
      const { data: bankAccounts, error: bankError } = await supabase
        .from('admin_bank_accounts')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      if (bankError) {
        console.error('Error fetching bank accounts:', bankError);
      }

      // Fetch RelWorx configuration
      const { data: relworxConfigRaw, error: relworxError } = await supabase
        .from('relworx_payment_configs')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (relworxError && relworxError.code !== 'PGRST116') {
        console.error('Error fetching RelWorx config:', relworxError);
      }

      // Transform RelWorx config to match interface
      let relworxConfig: RelWorxConfig | null = null;
      if (relworxConfigRaw) {
        relworxConfig = {
          id: relworxConfigRaw.id,
          merchant_id: relworxConfigRaw.merchant_id,
          account_no: relworxConfigRaw.account_no,
          is_sandbox: relworxConfigRaw.is_sandbox,
          is_active: relworxConfigRaw.is_active,
          supported_currencies: relworxConfigRaw.supported_currencies as string[] || ['UGX', 'KES', 'TZS'],
          payment_limits: relworxConfigRaw.payment_limits as {
            min_ugx: number;
            max_ugx: number;
            min_kes: number;
            max_kes: number;
            min_tzs: number;
            max_tzs: number;
          } || {
            min_ugx: 1000,
            max_ugx: 10000000,
            min_kes: 100,
            max_kes: 1000000,
            min_tzs: 1000,
            max_tzs: 10000000
          }
        };
      }

      setConfigurations({
        merchantCodes: merchantCodes as AdminMerchantCode[] || [],
        bankAccounts: bankAccounts as AdminBankAccount[] || [],
        relworxConfig
      });
    } catch (err) {
      console.error('Error loading payment configurations:', err);
      setError('Failed to load payment configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigurations();
  }, []);

  const getAvailablePaymentMethods = (currency: string, type: 'deposit' | 'withdraw') => {
    const methods = [];

    // Mobile Money via RelWorx
    if (configurations.relworxConfig?.is_active && 
        configurations.relworxConfig?.supported_currencies?.includes(currency)) {
      methods.push({
        id: 'mobile_money_relworx',
        name: 'Mobile Money (RelWorx)',
        type: 'mobile_money',
        provider: 'relworx',
        supported: ['deposit', 'withdraw'],
        currencies: configurations.relworxConfig.supported_currencies,
        config: configurations.relworxConfig
      });
    }

    // Mobile Money via Merchant Codes  
    const isProduction = window.location.hostname === 'yawatug.com';
    const merchantCodesForCurrency = configurations.merchantCodes.filter(mc => 
      mc.currency === currency && (
        isProduction ? mc.environment === 'production' : 
        ['production', 'sandbox'].includes(mc.environment)
      )
    );
    
    merchantCodesForCurrency.forEach(merchantCode => {
      methods.push({
        id: `mobile_money_${merchantCode.id}`,
        name: `Mobile Money (${merchantCode.provider_name})`,
        type: 'mobile_money',
        provider: merchantCode.provider_name.toLowerCase(),
        supported: ['deposit', 'withdraw'],
        currencies: [merchantCode.currency],
        config: merchantCode
      });
    });

    // Bank Transfer
    const bankAccountsForCurrency = configurations.bankAccounts.filter(ba => 
      ba.currency === currency
    );
    
    if (bankAccountsForCurrency.length > 0) {
      methods.push({
        id: 'bank_transfer',
        name: 'Bank Transfer',
        type: 'bank_transfer',
        supported: ['deposit', 'withdraw'],
        currencies: [currency],
        accounts: bankAccountsForCurrency
      });
    }

    return methods.filter(method => method.supported.includes(type));
  };

  const getPaymentLimits = (currency: string, method: string) => {
    if (method.includes('relworx') && configurations.relworxConfig?.payment_limits) {
      const limits = configurations.relworxConfig.payment_limits;
      switch (currency) {
        case 'UGX':
          return { min: limits.min_ugx, max: limits.max_ugx };
        case 'KES':
          return { min: limits.min_kes, max: limits.max_kes };
        case 'TZS':
          return { min: limits.min_tzs, max: limits.max_tzs };
        default:
          return { min: 1000, max: 10000000 };
      }
    }
    
    // Default limits for other methods
    return { min: 1000, max: 10000000 };
  };

  const getBankAccountsForDeposit = (currency: string) => {
    return configurations.bankAccounts.filter(ba => 
      ba.currency === currency && ba.account_type === 'business'
    );
  };

  return {
    configurations,
    loading,
    error,
    getAvailablePaymentMethods,
    getPaymentLimits,
    getBankAccountsForDeposit,
    refreshConfigurations: loadConfigurations
  };
};