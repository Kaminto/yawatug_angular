
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemSettings {
  walletLimits: boolean;
  securitySettings: boolean;
  feeSettings: boolean;
  adminWallets: boolean;
  paymentMethods: boolean;
}

export const useSystemInitialization = () => {
  const [initialized, setInitialized] = useState<SystemSettings>({
    walletLimits: false,
    securitySettings: false,
    feeSettings: false,
    adminWallets: false,
    paymentMethods: false
  });
  const [loading, setLoading] = useState(true);

  const checkSystemInitialization = async () => {
    try {
      // Check wallet limits
      const { data: walletLimits } = await supabase
        .from('wallet_global_settings')
        .select('id')
        .limit(1);

      // Check security settings  
      const { data: securitySettings } = await supabase
        .from('wallet_global_settings')
        .select('id')
        .eq('setting_key', 'security_enabled')
        .limit(1);

      // Check fee settings
      const { data: feeSettings } = await supabase
        .from('transaction_fee_settings')
        .select('id')
        .limit(1);

      // Check admin wallets
      const { data: adminWallets } = await supabase
        .from('admin_sub_wallets')
        .select('id')
        .limit(1);

      // Check payment methods
      const { data: paymentMethods } = await supabase
        .from('payment_methods')
        .select('id')
        .limit(1);

      setInitialized({
        walletLimits: (walletLimits?.length || 0) > 0,
        securitySettings: (securitySettings?.length || 0) > 0,
        feeSettings: (feeSettings?.length || 0) > 0,
        adminWallets: (adminWallets?.length || 0) > 0,
        paymentMethods: (paymentMethods?.length || 0) > 0
      });
    } catch (error) {
      console.error('Error checking system initialization:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = async () => {
    try {
      setLoading(true);

      // Initialize wallet limits if not set
      if (!initialized.walletLimits) {
        await supabase.from('wallet_global_settings').upsert([
          { setting_key: 'daily_withdrawal_limit', setting_value: '5000000', currency: 'UGX' },
          { setting_key: 'monthly_withdrawal_limit', setting_value: '50000000', currency: 'UGX' },
          { setting_key: 'daily_deposit_limit', setting_value: '10000000', currency: 'UGX' },
          { setting_key: 'monthly_deposit_limit', setting_value: '100000000', currency: 'UGX' },
          { setting_key: 'daily_withdrawal_limit', setting_value: '2000', currency: 'USD' },
          { setting_key: 'monthly_withdrawal_limit', setting_value: '20000', currency: 'USD' },
          { setting_key: 'daily_deposit_limit', setting_value: '4000', currency: 'USD' },
          { setting_key: 'monthly_deposit_limit', setting_value: '40000', currency: 'USD' }
        ]);
      }

      // Initialize security settings if not set
      if (!initialized.securitySettings) {
        await supabase.from('wallet_global_settings').upsert([
          { setting_key: 'security_enabled', setting_value: 'true' },
          { setting_key: 'otp_required', setting_value: 'true' },
          { setting_key: 'transaction_approval_required', setting_value: 'false' },
          { setting_key: 'fee_collection_enabled', setting_value: 'true' }
        ]);
      }

      // Initialize fee settings if not set
      if (!initialized.feeSettings) {
        await supabase.from('transaction_fee_settings').upsert([
          {
            transaction_type: 'deposit',
            percentage_fee: 0,
            flat_fee: 1000,
            minimum_fee: 1000,
            maximum_fee: 50000,
            fee_type: 'flat',
            is_active: true
          },
          {
            transaction_type: 'withdraw',
            percentage_fee: 1,
            flat_fee: 2000,
            minimum_fee: 2000,
            maximum_fee: 100000,
            fee_type: 'percentage',
            is_active: true
          },
          {
            transaction_type: 'share_purchase',
            percentage_fee: 0.5,
            flat_fee: 0,
            minimum_fee: 1000,
            maximum_fee: 50000,
            fee_type: 'percentage',
            is_active: true
          }
        ]);
      }

      // Initialize admin wallets if not set
      if (!initialized.adminWallets) {
        await supabase.from('admin_sub_wallets').upsert([
          {
            wallet_name: 'Admin Fund',
            wallet_type: 'admin_fund',
            currency: 'UGX',
            balance: 0,
            description: 'Administrative expenses and operations'
          },
          {
            wallet_name: 'Project Funding',
            wallet_type: 'project_funding',
            currency: 'UGX',
            balance: 0,
            description: 'Mining project investments'
          },
          {
            wallet_name: 'Share Buyback',
            wallet_type: 'share_buyback',
            currency: 'UGX',
            balance: 0,
            description: 'Company share buyback fund'
          }
        ]);
      }

      // Initialize payment methods if not set
      if (!initialized.paymentMethods) {
        await supabase.from('payment_methods').upsert([
          {
            name: 'Mobile Money (MTN)',
            type: 'mobile_money',
            currency: 'UGX',
            is_active: true,
            details: 'MTN Mobile Money payments'
          },
          {
            name: 'Mobile Money (Airtel)',
            type: 'mobile_money', 
            currency: 'UGX',
            is_active: true,
            details: 'Airtel Money payments'
          },
          {
            name: 'Bank Transfer',
            type: 'bank_transfer',
            currency: 'UGX',
            is_active: true,
            details: 'Direct bank transfers'
          }
        ]);
      }

      await checkSystemInitialization();
      toast.success('System defaults initialized successfully');
    } catch (error) {
      console.error('Error initializing defaults:', error);
      toast.error('Failed to initialize system defaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSystemInitialization();
  }, []);

  const needsInitialization = Object.values(initialized).some(value => !value);

  return {
    initialized,
    loading,
    needsInitialization,
    initializeDefaults,
    checkSystemInitialization
  };
};
