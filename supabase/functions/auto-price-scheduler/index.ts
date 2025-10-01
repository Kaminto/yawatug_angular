import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoPricingSettings {
  is_enabled: boolean;
  update_interval_hours: number;
  market_activity_period: string;
  sensitivity_scale: number;
  price_volatility_limit: number;
  minimum_price_floor: number;
  market_activity_weight: number;
}

interface ShareData {
  id: string;
  price_per_share: number;
  currency: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { triggered_by = 'manual', test_mode = false } = await req.json().catch(() => ({}));
    
    console.log('🤖 Auto Price Scheduler started', { triggered_by, test_mode });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get latest auto pricing settings (most recent record)
    const { data: settingsArray, error: settingsError } = await supabaseClient
      .from('admin_dynamic_pricing_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (settingsError) {
      console.error('❌ Error fetching pricing settings:', settingsError);
      throw settingsError;
    }

    const settings = settingsArray?.[0];

    if (!settings || !settings.is_enabled) {
      console.log('⏸️ Auto pricing is disabled, skipping execution');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Auto pricing is disabled',
          executed: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('⚙️ Auto pricing is enabled, checking if update is needed');
    
    // Get all shares
    const { data: shares, error: sharesError } = await supabaseClient
      .from('shares')
      .select('*')
      .eq('price_calculation_mode', 'automatic');

    if (sharesError) {
      console.error('❌ Error fetching shares:', sharesError);
      throw sharesError;
    }

    if (!shares || shares.length === 0) {
      console.log('📊 No shares in automatic mode found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No shares in automatic mode',
          executed: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const results = [];

    for (const share of shares) {
      console.log(`💰 Processing share: ${share.id}`);

      // Check if enough time has passed since last update
      const { data: lastUpdate } = await supabaseClient
        .from('share_price_history')
        .select('created_at')
        .eq('share_id', share.id)
        .eq('calculation_method', 'auto_market_activity')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      const intervalMs = settings.update_interval_hours * 60 * 60 * 1000;

      if (lastUpdate) {
        const lastUpdateTime = new Date(lastUpdate.created_at);
        const timeSinceLastUpdate = now.getTime() - lastUpdateTime.getTime();
        
        if (timeSinceLastUpdate < intervalMs) {
          console.log(`⏰ Share ${share.id}: Too soon for update (${Math.round(timeSinceLastUpdate / 1000 / 60)} minutes ago)`);
          continue;
        }
      }

      console.log(`🔄 Share ${share.id}: Running auto price calculation`);

      // Calculate market activity based pricing
      const newPrice = await calculateMarketActivityPrice(supabaseClient, share, settings);
      
      if (newPrice && newPrice !== share.price_per_share) {
        console.log(`📈 Share ${share.id}: Price calculated - ${share.currency} ${newPrice.toLocaleString()}`);
        results.push({
          shareId: share.id,
          oldPrice: share.price_per_share,
          newPrice: newPrice,
          change: ((newPrice - share.price_per_share) / share.price_per_share * 100).toFixed(2),
          currency: share.currency
        });
      } else {
        console.log(`➡️ Share ${share.id}: No price change needed`);
      }
    }

    console.log('✅ Auto pricing scheduler completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${shares.length} shares`,
        results: results,
        executed: true,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Auto pricing scheduler error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message,
        executed: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function calculateMarketActivityPrice(
  supabaseClient: any, 
  shareData: ShareData, 
  settings: AutoPricingSettings
): Promise<number | null> {
  try {
    // Calculate date ranges based on settings
    const getPeriodDates = () => {
      const now = new Date();
      const currentPeriodStart = new Date();
      const previousPeriodStart = new Date();
      const previousPeriodEnd = new Date();
      
      switch (settings.market_activity_period) {
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

    // Get market activity data
    const { data: currentSold } = await supabaseClient
      .from('share_transactions')
      .select('quantity')
      .in('transaction_type', ['purchase', 'buy'])
      .eq('status', 'completed')
      .gte('created_at', currentStart);

    const { data: currentBuyback } = await supabaseClient
      .from('share_transactions')
      .select('quantity')
      .in('transaction_type', ['sale', 'sell'])
      .eq('status', 'completed')
      .gte('created_at', currentStart);

    const { data: previousSold } = await supabaseClient
      .from('share_transactions')
      .select('quantity')
      .in('transaction_type', ['purchase', 'buy'])
      .eq('status', 'completed')
      .gte('created_at', previousStart)
      .lt('created_at', previousEnd);

    const { data: previousBuyback } = await supabaseClient
      .from('share_transactions')
      .select('quantity')
      .in('transaction_type', ['sale', 'sell'])
      .eq('status', 'completed')
      .gte('created_at', previousStart)
      .lt('created_at', previousEnd);

    // Calculate quantities
    const currentSoldShares = currentSold?.reduce((total: number, t: any) => total + (t.quantity || 0), 0) || 0;
    const currentBuybackShares = currentBuyback?.reduce((total: number, t: any) => total + (t.quantity || 0), 0) || 0;
    const previousSoldShares = previousSold?.reduce((total: number, t: any) => total + (t.quantity || 0), 0) || 0;
    const previousBuybackShares = previousBuyback?.reduce((total: number, t: any) => total + (t.quantity || 0), 0) || 0;

    const currentNet = currentSoldShares - currentBuybackShares;
    const previousNet = previousSoldShares - previousBuybackShares;

    let percentChange = 0;
    
    if (previousNet !== 0) {
      percentChange = ((currentNet - previousNet) / Math.abs(previousNet)) * 100;
    } else if (currentNet > 0) {
      percentChange = 5;
    } else if (currentNet < 0) {
      percentChange = -5;
    }

    // Apply sensitivity
    const sensitivityMultiplier = settings.sensitivity_scale * 0.2;
    const weightedChange = percentChange * sensitivityMultiplier;
    
    // Apply volatility limits
    const cappedChange = Math.max(
      -settings.price_volatility_limit,
      Math.min(weightedChange, settings.price_volatility_limit)
    );

    // Calculate new price
    const newPrice = Math.max(
      settings.minimum_price_floor,
      shareData.price_per_share * (1 + cappedChange / 100)
    );

    const actualChange = ((newPrice - shareData.price_per_share) / shareData.price_per_share) * 100;

    // Only update if there's a significant change (> 0.1%)
    if (Math.abs(actualChange) < 0.1) {
      console.log(`📊 Share ${shareData.id}: Change too small (${actualChange.toFixed(3)}%), skipping update`);
      return null;
    }

    // Save to share_price_history
    const { error: historyError } = await supabaseClient
      .from('share_price_history')
      .insert({
        share_id: shareData.id,
        price_per_share: newPrice,
        previous_price: shareData.price_per_share,
        price_change_percent: actualChange,
        calculation_method: 'auto_market_activity',
        currency: shareData.currency,
        admin_notes: `Scheduled auto-calculation: Net movement ${currentNet} vs ${previousNet}`,
        calculation_factors: {
          sold_shares: currentSoldShares,
          buyback_shares: currentBuybackShares,
          current_net_movement: currentNet,
          previous_net_movement: previousNet,
          raw_percent_change: percentChange,
          weighted_change: weightedChange,
          capped_change: cappedChange,
          market_activity_weight: settings.market_activity_weight,
          scheduled_execution: true
        }
      });

    if (historyError) {
      console.error('❌ Error saving price history:', historyError);
      throw historyError;
    }

    // Update shares table
    const { error: shareError } = await supabaseClient
      .from('shares')
      .update({ 
        price_per_share: newPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', shareData.id);

    if (shareError) {
      console.error('❌ Error updating share price:', shareError);
      throw shareError;
    }

    console.log(`✅ Share ${shareData.id}: Price updated from ${shareData.price_per_share} to ${newPrice} (${actualChange.toFixed(2)}%)`);
    
    return newPrice;

  } catch (error) {
    console.error(`❌ Error calculating price for share ${shareData.id}:`, error);
    return null;
  }
}