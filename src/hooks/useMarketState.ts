
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MarketStateConfig {
  id: string;
  config_name: string;
  state_type: 'company_primary' | 'mixed_market' | 'full_p2p';
  is_active: boolean;
  schedule_enabled: boolean;
  schedule_rules: any;
  company_priority_percentage: number;
  p2p_enabled: boolean;
  auto_buyback_enabled: boolean;
  large_holder_queue_enabled: boolean;
  price_fluctuation_enabled: boolean;
}

export interface AutoBuybackSettings {
  id: string;
  is_enabled: boolean;
  daily_dump_threshold: number;
  weekly_dump_threshold: number;
  monthly_dump_threshold: number;
  volume_threshold_multiplier: number;
  max_daily_buyback_amount: number;
  max_weekly_buyback_amount: number;
  buyback_price_premium: number;
  cooling_period_hours: number;
}

export interface PriceFluctuationControls {
  id: string;
  is_enabled: boolean;
  daily_max_increase_percent: number;
  daily_max_decrease_percent: number;
  weekly_max_increase_percent: number;
  weekly_max_decrease_percent: number;
  monthly_max_increase_percent: number;
  monthly_max_decrease_percent: number;
  circuit_breaker_enabled: boolean;
  circuit_breaker_threshold: number;
  cooling_period_minutes: number;
  trading_halted: boolean;
  halt_reason?: string;
  halt_started_at?: string;
}

export interface MarketActivityPricingSettings {
  id: string;
  is_enabled: boolean;
  auto_pricing_enabled: boolean;
  daily_calculation_enabled: boolean;
  net_movement_sensitivity: number;
  price_smoothing_factor: number;
  minimum_volume_threshold: number;
  max_daily_price_change: number;
  last_calculation_date?: string;
  calculation_time?: string;
}

export const useMarketState = () => {
  const [currentState, setCurrentState] = useState<MarketStateConfig | null>(null);
  const [allConfigs, setAllConfigs] = useState<MarketStateConfig[]>([]);
  const [autoBuybackSettings, setAutoBuybackSettings] = useState<AutoBuybackSettings | null>(null);
  const [priceControls, setPriceControls] = useState<PriceFluctuationControls | null>(null);
  const [marketActivityPricing, setMarketActivityPricing] = useState<MarketActivityPricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadMarketState = async () => {
    try {
      setLoading(true);
      
      // Load current active state
      const { data: currentData } = await supabase
        .from('market_state_configs')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (currentData) {
        setCurrentState(currentData as MarketStateConfig);
      }
      
      // Load all configurations
      const { data: allConfigsData } = await supabase
        .from('market_state_configs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (allConfigsData) {
        setAllConfigs(allConfigsData as MarketStateConfig[]);
      }
      
      // Load auto-buyback settings
      const { data: buybackData } = await supabase
        .from('admin_auto_buyback_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (buybackData) {
        setAutoBuybackSettings(buybackData as any);
      }
      
      // Load price controls
      const { data: priceData } = await supabase
        .from('price_fluctuation_controls')
        .select('*')
        .limit(1)
        .single();
      
      if (priceData) {
        setPriceControls(priceData);
      }

      // Load market activity pricing settings
      const { data: marketPricingData } = await supabase
        .from('admin_dynamic_pricing_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (marketPricingData) {
        setMarketActivityPricing({
          id: marketPricingData.id,
          is_enabled: marketPricingData.is_enabled,
          auto_pricing_enabled: marketPricingData.is_enabled,
          daily_calculation_enabled: true,
          net_movement_sensitivity: marketPricingData.market_activity_weight || 1.0,
          price_smoothing_factor: 0.1,
          minimum_volume_threshold: 1000,
          max_daily_price_change: marketPricingData.price_volatility_limit || 10,
          last_calculation_date: marketPricingData.updated_at,
          calculation_time: '18:00'
        });
      }
      
    } catch (error) {
      console.error('Error loading market state:', error);
      toast({
        title: "Error",
        description: "Failed to load market state configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMarketState = async (newState: string, reason?: string) => {
    try {
      const { data, error } = await supabase.rpc('update_market_state', {
        p_new_state: newState,
        p_change_reason: reason,
        p_automated: false
      });

      if (error) throw error;

      await loadMarketState();
      
      toast({
        title: "Success",
        description: `Market state changed to ${newState}`,
      });

      return data;
    } catch (error) {
      console.error('Error updating market state:', error);
      toast({
        title: "Error",
        description: "Failed to update market state",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateAutoBuybackSettings = async (settings: Partial<AutoBuybackSettings>) => {
    try {
      if (!autoBuybackSettings?.id) return;

      const { error } = await supabase
        .from('admin_auto_buyback_settings')
        .update(settings)
        .eq('id', autoBuybackSettings.id);

      if (error) throw error;

      await loadMarketState();
      
      toast({
        title: "Success",
        description: "Auto-buyback settings updated",
      });
    } catch (error) {
      console.error('Error updating auto-buyback settings:', error);
      toast({
        title: "Error",
        description: "Failed to update auto-buyback settings",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePriceControls = async (controls: Partial<PriceFluctuationControls>) => {
    try {
      if (!priceControls?.id) return;

      const { error } = await supabase
        .from('price_fluctuation_controls')
        .update(controls)
        .eq('id', priceControls.id);

      if (error) throw error;

      await loadMarketState();
      
      toast({
        title: "Success",
        description: "Price controls updated",
      });
    } catch (error) {
      console.error('Error updating price controls:', error);
      toast({
        title: "Error",
        description: "Failed to update price controls",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateMarketActivityPricing = async (settings: Partial<MarketActivityPricingSettings>) => {
    try {
      if (!marketActivityPricing?.id) return;

      const { error } = await supabase
        .from('admin_dynamic_pricing_settings')
        .update({
          is_enabled: settings.auto_pricing_enabled || settings.is_enabled,
          market_activity_weight: settings.net_movement_sensitivity,
          price_volatility_limit: settings.max_daily_price_change,
          updated_at: new Date().toISOString()
        })
        .eq('id', marketActivityPricing.id);

      if (error) throw error;

      await loadMarketState();
      
      toast({
        title: "Success",
        description: "Market activity pricing updated",
      });
    } catch (error) {
      console.error('Error updating market activity pricing:', error);
      toast({
        title: "Error",
        description: "Failed to update market activity pricing",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    loadMarketState();

    // Set up real-time subscriptions for market state changes
    const marketStateChannel = supabase
      .channel('market-state-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_state_configs'
        },
        (payload) => {
          console.log('Market state config changed:', payload);
          loadMarketState();
        }
      )
      .subscribe();

    const buybackSettingsChannel = supabase
      .channel('buyback-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_auto_buyback_settings'
        },
        (payload) => {
          console.log('Buyback settings changed:', payload);
          loadMarketState();
        }
      )
      .subscribe();

    const priceControlsChannel = supabase
      .channel('price-controls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_fluctuation_controls'
        },
        (payload) => {
          console.log('Price controls changed:', payload);
          loadMarketState();
        }
      )
      .subscribe();

    const dynamicPricingChannel = supabase
      .channel('dynamic-pricing-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_dynamic_pricing_settings'
        },
        (payload) => {
          console.log('Dynamic pricing settings changed:', payload);
          loadMarketState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(marketStateChannel);
      supabase.removeChannel(buybackSettingsChannel);
      supabase.removeChannel(priceControlsChannel);
      supabase.removeChannel(dynamicPricingChannel);
    };
  }, []);

  return {
    currentState,
    allConfigs,
    autoBuybackSettings,
    priceControls,
    marketActivityPricing,
    marketState: currentState,
    loading,
    updateMarketState,
    updateAutoBuybackSettings,
    updatePriceControls,
    updateMarketActivityPricing,
    refresh: loadMarketState
  };
};
