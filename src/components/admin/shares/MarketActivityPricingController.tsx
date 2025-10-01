import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, Settings, DollarSign, Activity, Clock, BarChart3 } from 'lucide-react';
import { triggerGlobalPriceUpdate } from '@/hooks/usePriceUpdateCoordinator';

interface MarketActivityPricingControllerProps {
  shareData: any;
  onUpdate: () => void;
}

const MarketActivityPricingController: React.FC<MarketActivityPricingControllerProps> = ({ 
  shareData, 
  onUpdate 
}) => {
  const [isAutoEnabled, setIsAutoEnabled] = useState(false);
  const [manualPrice, setManualPrice] = useState('');
  const [marketSettings, setMarketSettings] = useState({
    market_activity_weight: 1.0, // Sensitivity multiplier for net movement
    max_price_increase_percent: 10,
    max_price_decrease_percent: 10,
    minimum_price_floor: 20000,
    calculation_frequency: 'daily',
    market_activity_period: 'daily',
    update_interval_hours: 24,
    sensitivity_scale: 5 // 1-10 scale
  });
  const [loading, setLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [previewPrice, setPreviewPrice] = useState<number | null>(null);
  const [marketActivity, setMarketActivity] = useState({
    currentNetMovement: 0,
    previousNetMovement: 0,
    soldShares: 0,
    buybackShares: 0
  });
  const autoPricingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPricingSettings();
    loadCurrentPrice();
    loadMarketActivity();
    
    // Set up auto pricing interval when enabled
    setupAutoPricingInterval();
  }, [shareData]);

  // Auto pricing interval effect
  useEffect(() => {
    setupAutoPricingInterval();
  }, [isAutoEnabled, marketSettings.update_interval_hours]);

  const setupAutoPricingInterval = () => {
    // Clear any existing interval
    if (autoPricingIntervalRef.current) {
      clearInterval(autoPricingIntervalRef.current);
      autoPricingIntervalRef.current = null;
    }

    // Only set up interval if auto pricing is enabled
    if (isAutoEnabled && marketSettings.update_interval_hours > 0) {
      const intervalMs = marketSettings.update_interval_hours * 60 * 60 * 1000;
      console.log(`🤖 Setting up auto pricing interval: ${marketSettings.update_interval_hours} hours`);
      
      autoPricingIntervalRef.current = setInterval(async () => {
        console.log('⏰ Auto pricing interval triggered');
        await triggerAutoPricing();
      }, intervalMs);
    }
  };

  const triggerAutoPricing = async () => {
    try {
      console.log('🚀 Triggering automatic pricing update...');
      
      const { data, error } = await supabase.functions.invoke('auto-price-scheduler', {
        body: { 
          trigger: 'scheduled',
          timestamp: new Date().toISOString()
        }
      });

      if (error) throw error;

      if (data?.results && data.results.length > 0) {
        const totalChanges = data.results.length;
        toast.success(`Auto pricing executed: ${totalChanges} price updates applied`);
        // Refresh current data
        loadCurrentPrice();
        loadMarketActivity();
        
        // Trigger global price update for all pricing hooks
        triggerGlobalPriceUpdate();
        
        // Notify other settings tabs of the update
        const event = new CustomEvent('settingsUpdate', { detail: { source: 'pricing' } });
        window.dispatchEvent(event);
        
        // Refresh parent component to update price history
        onUpdate();
      } else {
        console.log('🔄 Auto pricing executed but no changes needed');
        // Still trigger global update in case other components need to refresh
        triggerGlobalPriceUpdate();
        // Still refresh parent component to update timestamp
        onUpdate();
      }

    } catch (error) {
      console.error('❌ Error triggering auto pricing:', error);
      toast.error('Auto pricing execution failed');
    }
  };

  // Reload market activity when period changes  
  useEffect(() => {
    if (shareData?.id) {
      loadMarketActivity();
    }
  }, [marketSettings.market_activity_period, shareData?.id]);

  const loadPricingSettings = async () => {
    try {
      console.log('🔍 Loading pricing settings...');
      // Get the latest settings ordered by creation date to handle multiple rows
      const { data, error } = await supabase
        .from('admin_dynamic_pricing_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error loading pricing settings:', error);
        throw error;
      }
      
      if (data) {
        console.log('✅ Loaded existing pricing settings:', data);
        
        // Check share's calculation mode as primary source of truth for auto state
        const shareInAutoMode = shareData?.price_calculation_mode === 'automatic';
        console.log('🎯 Share calculation mode:', shareData?.price_calculation_mode, 'Auto enabled:', shareInAutoMode);
        
        setIsAutoEnabled(shareInAutoMode);
        setMarketSettings({
          market_activity_weight: data.market_activity_weight,
          max_price_increase_percent: data.price_volatility_limit,
          max_price_decrease_percent: data.price_volatility_limit,
          minimum_price_floor: data.minimum_price_floor,
          calculation_frequency: data.calculation_frequency,
          market_activity_period: data.market_activity_period || 'daily',
          update_interval_hours: data.update_interval_hours || 24,
          sensitivity_scale: data.sensitivity_scale || 5
        });
      } else {
        console.log('⚙️ No pricing settings found, creating defaults...');
        // Create default settings if none exist
        const { data: newData, error: createError } = await supabase
          .from('admin_dynamic_pricing_settings')
          .insert({
            is_enabled: false,
            market_activity_weight: 1.0,
            price_volatility_limit: 10,
            minimum_price_floor: 20000,
            calculation_frequency: 'daily',
            market_activity_period: 'daily',
            update_interval_hours: 24,
            sensitivity_scale: 5
          })
          .select()
          .single();
          
        if (createError) {
          console.error('❌ Error creating default settings:', createError);
          throw createError;
        } else {
          console.log('✅ Created default settings:', newData);
        }
        
        // Set based on share mode, not default settings
        setIsAutoEnabled(shareData?.price_calculation_mode === 'automatic');
      }
    } catch (error) {
      console.error('❌ Error in loadPricingSettings:', error);
      toast.error('Failed to load pricing settings');
      
      // Set reasonable defaults on error but maintain share mode
      setIsAutoEnabled(shareData?.price_calculation_mode === 'automatic');
    }
  };

  const loadCurrentPrice = async () => {
    try {
      // Get current price from latest share_price_history record
      const { data, error } = await supabase
        .from('share_price_history')
        .select('*')
        .eq('share_id', shareData?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        console.log('Loading current price from history:', data.price_per_share, 'Method:', data.calculation_method);
        setCurrentPrice(data.price_per_share);
        setLastPriceUpdate(data);
      } else {
        // Fallback to share table price if no history
        console.log('No price history found, using share table price:', shareData?.price_per_share);
        setCurrentPrice(shareData?.price_per_share || 0);
      }
    } catch (error) {
      console.error('Error loading current price:', error);
      setCurrentPrice(shareData?.price_per_share || 0);
    }
  };

  const getModeTransitionPrice = async (newMode: 'auto' | 'manual'): Promise<number> => {
    try {
      // When switching modes, get the last price from the CURRENT mode as baseline
      const currentMode = isAutoEnabled ? 'auto' : 'manual';
      
      console.log(`Mode transition: ${currentMode} → ${newMode}`);
      
      // Get the most recent price from the current mode
      const methodFilter = currentMode === 'auto' 
        ? ['auto_market_activity', 'automatic'] 
        : ['manual'];
      
      const { data, error } = await supabase
        .from('share_price_history')
        .select('price_per_share, calculation_method, created_at')
        .eq('share_id', shareData?.id)
        .in('calculation_method', methodFilter)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        console.log(`Using last ${currentMode} price as baseline:`, data.price_per_share);
        return data.price_per_share;
      } else {
        // Fallback to current price if no history from current mode
        console.log('No history from current mode, using current price:', currentPrice);
        return currentPrice;
      }
    } catch (error) {
      console.error('Error getting mode transition price:', error);
      return currentPrice; // Fallback to current price
    }
  };

  const loadMarketActivity = async () => {
    try {
      if (!shareData?.id) return;
      
      // Calculate date ranges based on selected period
      const getPeriodDates = () => {
        const now = new Date();
        const currentPeriodStart = new Date();
        const previousPeriodStart = new Date();
        const previousPeriodEnd = new Date();
        
        switch (marketSettings.market_activity_period) {
          case 'weekly':
            currentPeriodStart.setDate(now.getDate() - 7);
            previousPeriodStart.setDate(now.getDate() - 14);
            previousPeriodEnd.setDate(now.getDate() - 7);
            break;
          case 'monthly':
            currentPeriodStart.setMonth(now.getMonth() - 1);
            previousPeriodStart.setMonth(now.getMonth() - 2);
            previousPeriodEnd.setMonth(now.getMonth() - 1);
            break;
          case 'quarterly':
            currentPeriodStart.setMonth(now.getMonth() - 3);
            previousPeriodStart.setMonth(now.getMonth() - 6);
            previousPeriodEnd.setMonth(now.getMonth() - 3);
            break;
          case 'yearly':
            currentPeriodStart.setFullYear(now.getFullYear() - 1);
            previousPeriodStart.setFullYear(now.getFullYear() - 2);
            previousPeriodEnd.setFullYear(now.getFullYear() - 1);
            break;
          default: // daily
            currentPeriodStart.setDate(now.getDate() - 1);
            previousPeriodStart.setDate(now.getDate() - 2);
            previousPeriodEnd.setDate(now.getDate() - 1);
        }
        
        return {
          currentStart: currentPeriodStart.toISOString(),
          previousStart: previousPeriodStart.toISOString(),
          previousEnd: previousPeriodEnd.toISOString()
        };
      };
      
      const { currentStart, previousStart, previousEnd } = getPeriodDates();

      console.log('Loading market activity for period:', marketSettings.market_activity_period);
      console.log('Date ranges:', { currentStart, previousStart, previousEnd });

      // Get current period sold shares (actual share quantities from share_transactions)
      const { data: currentSold, error: soldError } = await supabase
        .from('share_transactions')
        .select('quantity, created_at')
        .in('transaction_type', ['purchase', 'buy'])
        .eq('status', 'completed')
        .gte('created_at', currentStart);

      // Get current period buyback shares (actual share quantities from share_transactions)
      const { data: currentBuyback, error: buybackError } = await supabase
        .from('share_transactions')
        .select('quantity, created_at') 
        .in('transaction_type', ['sale', 'sell'])
        .eq('status', 'completed')
        .gte('created_at', currentStart);

      // Get previous period sold shares (actual share quantities from share_transactions)
      const { data: previousSold, error: pSoldError } = await supabase
        .from('share_transactions')
        .select('quantity, created_at')
        .in('transaction_type', ['purchase', 'buy'])
        .eq('status', 'completed')
        .gte('created_at', previousStart)
        .lt('created_at', previousEnd);

      // Get previous period buyback shares (actual share quantities from share_transactions)
      const { data: previousBuyback, error: pBuybackError } = await supabase
        .from('share_transactions')
        .select('quantity, created_at')
        .in('transaction_type', ['sale', 'sell'])
        .eq('status', 'completed')
        .gte('created_at', previousStart)
        .lt('created_at', previousEnd);

      if (soldError || buybackError || pSoldError || pBuybackError) {
        console.error('Database errors:', { soldError, buybackError, pSoldError, pBuybackError });
        throw new Error('Error loading market activity');
      }

      // Calculate actual share quantities (whole numbers)
      const currentSoldShares = currentSold?.reduce((total, t) => {
        return total + Math.round(t.quantity || 0);
      }, 0) || 0;
      
      const currentBuybackShares = currentBuyback?.reduce((total, t) => {
        return total + Math.round(t.quantity || 0);
      }, 0) || 0;
      
      const previousSoldShares = previousSold?.reduce((total, t) => {
        return total + Math.round(t.quantity || 0);
      }, 0) || 0;
      
      const previousBuybackShares = previousBuyback?.reduce((total, t) => {
        return total + Math.round(t.quantity || 0);
      }, 0) || 0;

      console.log('Market activity data:', {
        currentSold: currentSoldShares,
        currentBuyback: currentBuybackShares,
        previousSold: previousSoldShares,
        previousBuyback: previousBuybackShares,
        currentSoldRecords: currentSold?.length || 0,
        currentBuybackRecords: currentBuyback?.length || 0
      });

      // Ensure all values are finite numbers
      const currentNet = currentSoldShares - currentBuybackShares;
      const previousNet = previousSoldShares - previousBuybackShares;
      
      setMarketActivity({
        currentNetMovement: isFinite(currentNet) ? currentNet : 0,
        previousNetMovement: isFinite(previousNet) ? previousNet : 0,
        soldShares: isFinite(currentSoldShares) ? currentSoldShares : 0,
        buybackShares: isFinite(currentBuybackShares) ? currentBuybackShares : 0
      });

    } catch (error) {
      console.error('Error loading market activity:', error);
    }
  };

  const handleToggleAuto = async (enabled: boolean) => {
    setLoading(true);
    try {
      console.log('🔄 Toggling auto pricing to:', enabled);
      
      // Get the baseline price for the new mode BEFORE switching
      const baselinePrice = await getModeTransitionPrice(enabled ? 'auto' : 'manual');
      console.log('📊 Using baseline price:', baselinePrice);
      
      // First, update the pricing settings - remove manual ID and use proper upsert
      console.log('💾 Updating pricing settings...');
      const { data: settingsData, error: settingsError } = await supabase
        .from('admin_dynamic_pricing_settings')
        .upsert({
          is_enabled: enabled,
          market_activity_weight: marketSettings.sensitivity_scale * 0.2,
          price_volatility_limit: marketSettings.max_price_increase_percent,
          minimum_price_floor: marketSettings.minimum_price_floor,
          calculation_frequency: marketSettings.calculation_frequency,
          market_activity_period: marketSettings.market_activity_period,
          update_interval_hours: marketSettings.update_interval_hours,
          sensitivity_scale: marketSettings.sensitivity_scale,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (settingsError) {
        console.error('❌ Settings update error:', settingsError);
        throw new Error(`Settings update failed: ${settingsError.message}`);
      }
      
      console.log('✅ Settings updated successfully:', settingsData);

      // Record the mode transition in price history
      const transitionMethod = enabled ? 'mode_switch_to_auto' : 'mode_switch_to_manual';
      console.log('📝 Recording mode transition...');
      const { error: transitionError } = await supabase
        .from('share_price_history')
        .insert({
          share_id: shareData.id,
          price_per_share: baselinePrice,
          previous_price: currentPrice,
          price_change_percent: 0,
          calculation_method: transitionMethod,
          currency: shareData.currency,
          admin_notes: `Mode switched from ${isAutoEnabled ? 'auto' : 'manual'} to ${enabled ? 'auto' : 'manual'}. Using baseline price: ${baselinePrice}`,
          calculation_factors: {
            mode_transition: true,
            from_mode: isAutoEnabled ? 'auto' : 'manual',
            to_mode: enabled ? 'auto' : 'manual',
            baseline_price: baselinePrice,
            transition_timestamp: new Date().toISOString()
          }
        });

      if (transitionError) {
        console.warn('⚠️ Failed to record mode transition:', transitionError);
      } else {
        console.log('✅ Mode transition recorded');
      }

      // Update the shares table with the baseline price and new mode
      console.log('🔄 Updating shares table...');
      const { error: shareError } = await supabase
        .from('shares')
        .update({ 
          price_per_share: baselinePrice,
          price_calculation_mode: enabled ? 'automatic' : 'manual',
          updated_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      if (shareError) {
        console.error('❌ Share update error:', shareError);
        throw new Error(`Share update failed: ${shareError.message}`);
      }
      
      console.log('✅ Share table updated successfully');
      
      // Update local state ONLY after all database operations succeed
      setIsAutoEnabled(enabled);
      setCurrentPrice(baselinePrice);
      
      // Handle mode-specific actions
      if (enabled) {
        console.log('🤖 Enabling auto-pricing mode...');
        toast.success(`Auto-pricing enabled with baseline price: ${shareData.currency} ${baselinePrice.toLocaleString()}. Configure settings before running calculations.`);
        
        // Set up interval but don't run initial calculation immediately
        // This gives admin time to configure settings first
        setupAutoPricingInterval();
        
        // Show info message about next steps
        setTimeout(() => {
          toast.info('Auto-pricing is enabled. Configure your settings and use "Run Now" to start calculations.', {
            duration: 5000
          });
        }, 2000);
      } else {
        console.log('👤 Switching to manual mode...');
        toast.success(`Manual mode enabled with baseline price: ${shareData.currency} ${baselinePrice.toLocaleString()}`);
        
        // Clear the interval when disabled
        if (autoPricingIntervalRef.current) {
          clearInterval(autoPricingIntervalRef.current);
          autoPricingIntervalRef.current = null;
          console.log('⏹️ Auto-pricing interval cleared');
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error toggling auto pricing:', error);
      toast.error(error.message || 'Failed to update auto-pricing setting');
      
      // Revert local state on failure
      setIsAutoEnabled(!enabled);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPriceUpdate = async () => {
    if (!manualPrice || parseFloat(manualPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      const newPrice = parseFloat(manualPrice);
      const priceChangePercent = ((newPrice - currentPrice) / currentPrice) * 100;

      // Save to share_price_history (single source of truth)
      const { error: historyError } = await supabase
        .from('share_price_history')
        .insert({
          share_id: shareData.id,
          price_per_share: newPrice,
          previous_price: currentPrice,
          price_change_percent: priceChangePercent,
          calculation_method: 'manual',
          currency: shareData.currency,
          admin_notes: 'Manual price update by admin',
          calculation_factors: {
            manual_update: true,
            previous_price: currentPrice,
            new_price: newPrice
          }
        });

      if (historyError) throw historyError;

      // Update shares table for compatibility
      const { error: shareError } = await supabase
        .from('shares')
        .update({ 
          price_per_share: newPrice,
          price_calculation_mode: 'manual'
        })
        .eq('id', shareData.id);

      if (shareError) throw shareError;

      toast.success('Share price updated manually');
      setManualPrice('');
      setCurrentPrice(newPrice);
      onUpdate();
      loadCurrentPrice();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update price');
    } finally {
      setLoading(false);
    }
  };

  const calculatePricePreview = () => {
    // Market Activity Pricing Formula - Preview Only
    const currentNet = marketActivity.currentNetMovement;
    const previousNet = marketActivity.previousNetMovement;
    
    let percentChange = 0;
    
    if (previousNet !== 0) {
      percentChange = ((currentNet - previousNet) / Math.abs(previousNet)) * 100;
    } else if (currentNet > 0) {
      percentChange = 5;
    } else if (currentNet < 0) {
      percentChange = -5;
    }

    const sensitivityMultiplier = marketSettings.sensitivity_scale * 0.2;
    const weightedChange = percentChange * sensitivityMultiplier;
    
    const cappedChange = Math.max(
      -marketSettings.max_price_decrease_percent,
      Math.min(weightedChange, marketSettings.max_price_increase_percent)
    );

    const newPrice = Math.max(
      marketSettings.minimum_price_floor,
      currentPrice * (1 + cappedChange / 100)
    );

    setPreviewPrice(newPrice);
    toast.success(`Price preview calculated: ${shareData.currency} ${newPrice.toLocaleString()}`);
  };

  const handleAutoCalculation = async () => {
    setLoading(true);
    try {
      // Market Activity Pricing Formula:
      // Net Market Movement = Sold Shares - Buyback Shares
      // % Change = (Current Net - Previous Net) / Previous Net
      // New Price = Last Price × (1 + % Change × Weight)

      const currentNet = marketActivity.currentNetMovement;
      const previousNet = marketActivity.previousNetMovement;
      
      let percentChange = 0;
      
      if (previousNet !== 0) {
        percentChange = ((currentNet - previousNet) / Math.abs(previousNet)) * 100;
      } else if (currentNet > 0) {
        // If no previous movement but current positive, apply small increase
        percentChange = 5;
      } else if (currentNet < 0) {
        // If no previous movement but current negative, apply small decrease
        percentChange = -5;
      }

      // Apply market activity weight (sensitivity) - Convert scale to multiplier
      const sensitivityMultiplier = marketSettings.sensitivity_scale * 0.2; // 1-10 becomes 0.2-2.0
      const weightedChange = percentChange * sensitivityMultiplier;
      
      // Apply volatility limits
      const cappedChange = Math.max(
        -marketSettings.max_price_decrease_percent,
        Math.min(weightedChange, marketSettings.max_price_increase_percent)
      );

      // Calculate new price
      const newPrice = Math.max(
        marketSettings.minimum_price_floor,
        currentPrice * (1 + cappedChange / 100)
      );

      const actualChange = ((newPrice - currentPrice) / currentPrice) * 100;

      // Only update if there's a significant change (> 0.1%)
      if (Math.abs(actualChange) < 0.1) {
        console.log(`📊 Price change too small (${actualChange.toFixed(3)}%), skipping update but keeping auto mode enabled`);
        toast.info(`Auto calculation completed: Change too small (${actualChange.toFixed(3)}%) - no price update needed`);
        return; // Don't update price but stay in auto mode
      }
      const { error: historyError } = await supabase
        .from('share_price_history')
        .insert({
          share_id: shareData.id,
          price_per_share: newPrice,
          previous_price: currentPrice,
          price_change_percent: actualChange,
          calculation_method: 'auto_market_activity',
          currency: shareData.currency,
          admin_notes: `Auto-calculation: Net movement ${currentNet} vs ${previousNet}`,
          calculation_factors: {
            sold_shares: marketActivity.soldShares,
            buyback_shares: marketActivity.buybackShares,
            current_net_movement: currentNet,
            previous_net_movement: previousNet,
            raw_percent_change: percentChange,
            weighted_change: weightedChange,
            capped_change: cappedChange,
            market_activity_weight: marketSettings.market_activity_weight
          }
        });

      if (historyError) throw historyError;

      // Update shares table and maintain auto mode
      const { error: shareError } = await supabase
        .from('shares')
        .update({ 
          price_per_share: newPrice,
          price_calculation_mode: 'automatic', // Ensure it stays in auto mode
          updated_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      if (shareError) throw shareError;

      toast.success(`Price updated: ${actualChange.toFixed(2)}% change based on market activity (staying in auto mode)`);
      setCurrentPrice(newPrice);
      
      // Refresh data but maintain auto mode state
      await Promise.all([
        loadCurrentPrice(),
        loadMarketActivity(),
        onUpdate()
      ]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to calculate price');
    } finally {
      setLoading(false);
    }
  };

  const updateMarketSettings = async () => {
    setLoading(true);
    try {
      console.log('💾 Saving market settings...', {
        isAutoEnabled,
        marketSettings
      });
      
      // Insert new settings record (no upsert to avoid conflict issues)
      const { data: settingsData, error } = await supabase
        .from('admin_dynamic_pricing_settings')
        .insert({
          is_enabled: isAutoEnabled,
          market_activity_weight: marketSettings.market_activity_weight,
          price_volatility_limit: marketSettings.max_price_increase_percent,
          minimum_price_floor: marketSettings.minimum_price_floor,
          calculation_frequency: marketSettings.calculation_frequency,
          market_activity_period: marketSettings.market_activity_period,
          update_interval_hours: marketSettings.update_interval_hours,
          sensitivity_scale: marketSettings.sensitivity_scale,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Settings save error:', error);
        throw error;
      }
      
      console.log('✅ Settings saved successfully:', settingsData);
      
      // Also update the share's calculation mode to maintain consistency
      if (shareData?.id) {
        console.log('🔄 Updating share calculation mode to:', isAutoEnabled ? 'automatic' : 'manual');
        const { error: shareError } = await supabase
          .from('shares')
          .update({ 
            price_calculation_mode: isAutoEnabled ? 'automatic' : 'manual',
            updated_at: new Date().toISOString()
          })
          .eq('id', shareData.id);
          
        if (shareError) {
          console.error('❌ Share update error:', shareError);
          throw shareError;
        }
        
        console.log('✅ Share calculation mode updated successfully');
      }
      
      toast.success('Market settings saved successfully');
      
      // Refresh parent component and reload settings to confirm persistence
      onUpdate();
      setTimeout(() => {
        loadPricingSettings();
      }, 500);
      
    } catch (error: any) {
      console.error('Settings save error:', error);
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pricing Mode Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Share Pricing Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Auto-Pricing Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable automatic price calculation based on market activity
              </p>
            </div>
            <Switch
              checked={isAutoEnabled}
              onCheckedChange={handleToggleAuto}
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Current Price:</span>
              <Badge variant="outline">
                {shareData.currency} {currentPrice.toLocaleString()}
              </Badge>
            </div>
            <Badge variant={isAutoEnabled ? "default" : "secondary"}>
              {isAutoEnabled ? "Auto Mode" : "Manual Mode"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Manual Price Setting */}
      {!isAutoEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Manual Price Setting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>New Share Price ({shareData.currency})</Label>
                <Input
                  type="number"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder="Enter new price"
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleManualPriceUpdate}
                  disabled={loading || !manualPrice}
                >
                  Update Price
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-Pricing Settings */}
      {isAutoEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Auto-Pricing Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Market Activity Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {marketActivity.soldShares}
                </div>
                <p className="text-sm text-muted-foreground">
                  Shares Sold ({marketSettings.market_activity_period})
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {marketActivity.buybackShares}
                </div>
                <p className="text-sm text-muted-foreground">
                  Shares Bought Back ({marketSettings.market_activity_period})
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {isFinite(marketActivity.currentNetMovement) 
                    ? marketActivity.currentNetMovement.toFixed(2) 
                    : '0.00'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Net Movement (Current {marketSettings.market_activity_period})
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {isFinite(marketActivity.previousNetMovement) 
                    ? marketActivity.previousNetMovement.toFixed(2) 
                    : '0.00'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Net Movement (Previous {marketSettings.market_activity_period})
                </p>
              </div>
            </div>

            <Separator />

            {/* Enhanced Settings */}
            <div className="space-y-6">
              {/* Time Period and Update Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Market Activity Period
                  </Label>
                  <Select
                    value={marketSettings.market_activity_period}
                    onValueChange={(value) => setMarketSettings(prev => ({
                      ...prev,
                      market_activity_period: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Time frame for analyzing market activity
                  </p>
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Update Interval (Hours)
                  </Label>
                  <Select
                    value={marketSettings.update_interval_hours.toString()}
                    onValueChange={(value) => setMarketSettings(prev => ({
                      ...prev,
                      update_interval_hours: parseInt(value)
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Every Hour</SelectItem>
                      <SelectItem value="4">Every 4 Hours</SelectItem>
                      <SelectItem value="12">Twice Daily</SelectItem>
                      <SelectItem value="24">Daily</SelectItem>
                      <SelectItem value="168">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How often to recalculate prices automatically
                  </p>
                </div>
              </div>

              {/* Market Sensitivity Scale */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4" />
                  Market Sensitivity Scale
                </Label>
                <div className="space-y-3">
                  <div className="px-3">
                    <Slider
                      value={[marketSettings.sensitivity_scale]}
                      onValueChange={(value) => setMarketSettings(prev => ({
                        ...prev,
                        sensitivity_scale: value[0]
                      }))}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <span className="text-xs text-muted-foreground">Low (1)</span>
                    <Badge variant="outline" className="text-sm">
                      Level {marketSettings.sensitivity_scale} - {
                        marketSettings.sensitivity_scale <= 3 ? 'Conservative' :
                        marketSettings.sensitivity_scale <= 6 ? 'Moderate' :
                        marketSettings.sensitivity_scale <= 8 ? 'Aggressive' : 'Very Aggressive'
                      }
                    </Badge>
                    <span className="text-xs text-muted-foreground">High (10)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Higher sensitivity means price responds more to market activity changes
                  </p>
                </div>
              </div>

              {/* Price Controls */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Minimum Price Floor ({shareData.currency})</Label>
                  <Input
                    type="number"
                    value={marketSettings.minimum_price_floor}
                    onChange={(e) => setMarketSettings(prev => ({
                      ...prev,
                      minimum_price_floor: parseInt(e.target.value) || 0
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum price the share can fall to
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Max Price Increase (%)</Label>
                    <Input
                      type="text"
                      value={marketSettings.max_price_increase_percent.toFixed(2)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0 && value <= 100) {
                          setMarketSettings(prev => ({
                            ...prev,
                            max_price_increase_percent: value
                          }));
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setMarketSettings(prev => ({
                          ...prev,
                          max_price_increase_percent: Math.min(Math.max(value, 0), 100)
                        }));
                      }}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum percentage price can increase per period
                    </p>
                  </div>
                  <div>
                    <Label>Max Price Decrease (%)</Label>
                    <Input
                      type="text"
                      value={marketSettings.max_price_decrease_percent.toFixed(2)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0 && value <= 100) {
                          setMarketSettings(prev => ({
                            ...prev,
                            max_price_decrease_percent: value
                          }));
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setMarketSettings(prev => ({
                          ...prev,
                          max_price_decrease_percent: Math.min(Math.max(value, 0), 100)
                        }));
                      }}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum percentage price can decrease per period
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Price Preview */}
            {previewPrice && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-medium mb-2">Price Preview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Current Price</div>
                    <div className="text-lg font-bold">{shareData.currency} {currentPrice.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Preview Price</div>
                    <div className="text-lg font-bold text-blue-600">{shareData.currency} {previewPrice.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Change: {previewPrice > currentPrice ? '+' : ''}{((previewPrice - currentPrice) / currentPrice * 100).toFixed(2)}%
                  <span className="ml-2 text-blue-600">(Preview Only)</span>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={updateMarketSettings} disabled={loading}>
                Save Settings
              </Button>
            <div className="flex gap-2">
              {isAutoEnabled && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={calculatePricePreview}
                  disabled={loading}
                  className="flex items-center"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Preview Price
                </Button>
              )}
              {isAutoEnabled && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={triggerAutoPricing}
                  disabled={loading}
                  className="flex items-center"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Run Now
                </Button>
              )}
              <Button onClick={handleAutoCalculation} disabled={loading}>
                {loading ? 'Calculating...' : 'Calculate & Apply'}
              </Button>
            </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Price Update */}
      {lastPriceUpdate && (
        <Card>
          <CardHeader>
            <CardTitle>Last Price Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Method:</span>
                <Badge variant="outline" className="ml-2">
                  {lastPriceUpdate.calculation_method}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <span className="ml-2">
                  {new Date(lastPriceUpdate.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Previous Price:</span>
                <span className="ml-2">{shareData.currency} {lastPriceUpdate.previous_price?.toLocaleString() || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">New Price:</span>
                <span className="ml-2">{shareData.currency} {lastPriceUpdate.price_per_share?.toLocaleString() || 'N/A'}</span>
              </div>
              {lastPriceUpdate.price_change_percent && (
                <div>
                  <span className="text-muted-foreground">Price Change:</span>
                  <Badge variant={lastPriceUpdate.price_change_percent > 0 ? "default" : "destructive"} className="ml-2">
                    {lastPriceUpdate.price_change_percent > 0 ? '+' : ''}{lastPriceUpdate.price_change_percent.toFixed(2)}%
                  </Badge>
                </div>
              )}
            </div>
            {lastPriceUpdate.admin_notes && (
              <div className="mt-2 text-sm text-muted-foreground">
                {lastPriceUpdate.admin_notes}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MarketActivityPricingController;