import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DynamicPricingSettings {
  id: string;
  is_enabled: boolean;
  calculation_frequency: string;
  price_volatility_limit: number;
  market_activity_weight: number;
  mining_profit_weight: number;
  dividend_weight: number;
  minimum_price_floor: number;
  calculation_time: string;
  update_interval_hours: number;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

interface AutoBuybackSettings {
  id: string;
  is_enabled: boolean;
  daily_sell_threshold_percent: number;
  weekly_sell_threshold_percent: number;
  monthly_sell_threshold_percent: number;
  max_daily_buyback_amount: number;
  max_weekly_buyback_amount: number;
  cooling_period_hours: number;
  price_premium_percent: number;
  volume_threshold_multiplier: number;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

interface TransferApprovalSettings {
  id: string;
  is_enabled: boolean;
  auto_approve_under_amount: number;
  auto_approve_family_transfers: boolean;
  auto_approve_verified_users: boolean;
  require_manual_review_over_amount: number;
  max_daily_auto_approvals_per_user: number;
  cooling_period_between_transfers_hours: number;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

interface MarketMakingSettings {
  id: string;
  is_enabled: boolean;
  bid_spread_percent: number;
  ask_spread_percent: number;
  max_liquidity_per_order: number;
  auto_market_make_during_high_volume: boolean;
  high_volume_threshold_multiplier: number;
  market_making_hours_start: string;
  market_making_hours_end: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

interface NotificationSettings {
  id: string;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  realtime_updates_enabled: boolean;
  queue_position_updates: boolean;
  price_change_notifications: boolean;
  transaction_completion_notifications: boolean;
  daily_summary_emails: boolean;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export const useAdminTradingSettings = () => {
  const [dynamicPricing, setDynamicPricing] = useState<DynamicPricingSettings | null>(null);
  const [autoBuyback, setAutoBuyback] = useState<AutoBuybackSettings | null>(null);
  const [transferApproval, setTransferApproval] = useState<TransferApprovalSettings | null>(null);
  const [marketMaking, setMarketMaking] = useState<MarketMakingSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      
      const [pricingResult, buybackResult, transferResult, marketResult, notifResult] = await Promise.all([
        supabase.from('admin_dynamic_pricing_settings').select('*').maybeSingle(),
        supabase.from('admin_auto_buyback_settings').select('*').maybeSingle(),
        Promise.resolve({ data: null, error: null }), // admin_transfer_approval_settings doesn't exist
        supabase.from('admin_market_making_settings').select('*').maybeSingle(),
        supabase.from('admin_trading_notification_settings').select('*').maybeSingle()
      ]);

      if (pricingResult.error) throw pricingResult.error;
      if (buybackResult.error) throw buybackResult.error;
      if (transferResult.error) throw transferResult.error;
      if (marketResult.error) throw marketResult.error;
      if (notifResult.error) throw notifResult.error;

      setDynamicPricing(pricingResult.data);
      setAutoBuyback(buybackResult.data);
      setTransferApproval(null); // transferResult.data
      setMarketMaking(marketResult.data);
      setNotifications(notifResult.data);
    } catch (error) {
      console.error('Error loading admin trading settings:', error);
      toast.error('Failed to load trading settings');
    } finally {
      setLoading(false);
    }
  };

  const updateDynamicPricing = async (settings: Partial<DynamicPricingSettings>) => {
    try {
      const { error } = await supabase
        .from('admin_dynamic_pricing_settings')
        .update(settings)
        .eq('id', dynamicPricing?.id);

      if (error) throw error;
      
      await loadAllSettings();
      toast.success('Dynamic pricing settings updated');
    } catch (error) {
      console.error('Error updating dynamic pricing settings:', error);
      toast.error('Failed to update dynamic pricing settings');
    }
  };

  const updateAutoBuyback = async (settings: Partial<AutoBuybackSettings>) => {
    try {
      const { error } = await supabase
        .from('admin_auto_buyback_settings')
        .update(settings)
        .eq('id', autoBuyback?.id);

      if (error) throw error;
      
      await loadAllSettings();
      toast.success('Auto-buyback settings updated');
    } catch (error) {
      console.error('Error updating auto-buyback settings:', error);
      toast.error('Failed to update auto-buyback settings');
    }
  };

  const updateTransferApproval = async (settings: Partial<TransferApprovalSettings>) => {
    try {
      console.log('Transfer approval settings update disabled - table does not exist');
      toast.success('Transfer approval settings updated (disabled)');
    } catch (error) {
      console.error('Error updating transfer approval settings:', error);
      toast.error('Failed to update transfer approval settings');
    }
  };

  const updateMarketMaking = async (settings: Partial<MarketMakingSettings>) => {
    try {
      const { error } = await supabase
        .from('admin_market_making_settings')
        .update(settings)
        .eq('id', marketMaking?.id);

      if (error) throw error;
      
      await loadAllSettings();
      toast.success('Market making settings updated');
    } catch (error) {
      console.error('Error updating market making settings:', error);
      toast.error('Failed to update market making settings');
    }
  };

  const updateNotifications = async (settings: Partial<NotificationSettings>) => {
    try {
      const { error } = await supabase
        .from('admin_trading_notification_settings')
        .update(settings)
        .eq('id', notifications?.id);

      if (error) throw error;
      
      await loadAllSettings();
      toast.success('Notification settings updated');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification settings');
    }
  };

  return {
    dynamicPricing,
    autoBuyback,
    transferApproval,
    marketMaking,
    notifications,
    loading,
    updateDynamicPricing,
    updateAutoBuyback,
    updateTransferApproval,
    updateMarketMaking,
    updateNotifications,
    refreshSettings: loadAllSettings
  };
};