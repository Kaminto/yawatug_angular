
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Calculator, Activity, Clock, AlertTriangle } from 'lucide-react';
import { useMarketState } from '@/hooks/useMarketState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MarketActivityData {
  date: string;
  sold_shares: number;
  buyback_shares: number;
  net_movement: number;
  previous_net: number;
  net_change_percent: number;
  previous_price: number;
  new_price: number;
  price_change_percent: number;
}

const MarketActivityPricingEngine: React.FC = () => {
  const { marketActivityPricing, updateMarketActivityPricing, loading } = useMarketState();
  const [currentPrice, setCurrentPrice] = useState(20000);
  const [marketData, setMarketData] = useState<MarketActivityData[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculation, setLastCalculation] = useState<string | null>(null);
  const [previewPrice, setPreviewPrice] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [liveActivityData, setLiveActivityData] = useState<{
    currentSold: number;
    currentBuyback: number;
    previousSold: number;
    previousBuyback: number;
    netMovement: number;
    previousNet: number;
    netChangePercent: number;
  } | null>(null);

  useEffect(() => {
    loadCurrentPrice();
    loadMarketActivityData();
  }, [selectedPeriod]);

  const loadCurrentPrice = async () => {
    try {
      const { data, error } = await supabase
        .from('shares')
        .select('price_per_share')
        .single();

      if (error) throw error;
      setCurrentPrice(data.price_per_share || 20000);
    } catch (error) {
      console.error('Error loading current price:', error);
    }
  };

  const loadMarketActivityData = async () => {
    try {
      // Calculate date ranges based on selected period
      const now = new Date();
      let currentStart, previousStart, previousEnd;
      
      switch (selectedPeriod) {
        case 'daily':
          currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          previousStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
          previousEnd = currentStart;
          break;
        case 'weekly':
          currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          previousEnd = currentStart;
          break;
        case 'monthly':
          currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          previousEnd = currentStart;
          break;
        case 'quarterly':
          currentStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          previousStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          previousEnd = currentStart;
          break;
        default:
          currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          previousStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
          previousEnd = currentStart;
      }

      console.log('Loading market activity for period:', selectedPeriod);
      console.log('Date ranges:', {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString()
      });

      // Get current period share purchases from share_transactions table
      const { data: currentSales, error: currentSalesError } = await supabase
        .from('share_transactions')
        .select('quantity')
        .in('transaction_type', ['purchase', 'buy'])
        .eq('status', 'completed')
        .gte('created_at', currentStart.toISOString());

      // Get current period share sales/buybacks from share_transactions table  
      const { data: currentBuybacks, error: currentBuybacksError } = await supabase
        .from('share_transactions')
        .select('quantity')
        .in('transaction_type', ['sale', 'sell'])
        .eq('status', 'completed')
        .gte('created_at', currentStart.toISOString());

      // Get previous period share purchases
      const { data: previousSales, error: previousSalesError } = await supabase
        .from('share_transactions')
        .select('quantity')
        .in('transaction_type', ['purchase', 'buy'])
        .eq('status', 'completed')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString());

      // Get previous period share sales/buybacks
      const { data: previousBuybacks, error: previousBuybacksError } = await supabase
        .from('share_transactions')
        .select('quantity')
        .in('transaction_type', ['sale', 'sell'])
        .eq('status', 'completed')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString());

      if (currentSalesError || currentBuybacksError || previousSalesError || previousBuybacksError) {
        throw currentSalesError || currentBuybacksError || previousSalesError || previousBuybacksError;
      }

      // Sum share quantities directly from share_transactions table
      const currentSold = currentSales?.reduce((sum, record) => sum + record.quantity, 0) || 0;
      const currentBuyback = currentBuybacks?.reduce((sum, record) => sum + record.quantity, 0) || 0;
      const previousSold = previousSales?.reduce((sum, record) => sum + record.quantity, 0) || 0;
      const previousBuyback = previousBuybacks?.reduce((sum, record) => sum + record.quantity, 0) || 0;

      const netMovement = currentSold - currentBuyback;
      const previousNet = previousSold - previousBuyback;
      const netChangePercent = previousNet !== 0 ? ((netMovement - previousNet) / Math.abs(previousNet)) * 100 : 0;

      const liveData = {
        currentSold,
        currentBuyback,
        previousSold,
        previousBuyback,
        netMovement,
        previousNet,
        netChangePercent
      };

      setLiveActivityData(liveData);
      console.log('Live market activity data:', liveData);

      // Load recent price calculations for history
      const { data: priceHistory, error: historyError } = await supabase
        .from('share_price_calculations')
        .select('*')
        .order('calculation_date', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;

      const activityData: MarketActivityData[] = priceHistory?.map(calc => ({
        date: calc.calculation_date,
        sold_shares: calc.market_activity_adjustment || 0,
        buyback_shares: calc.dividend_paid || 0,
        net_movement: (calc.market_activity_adjustment || 0) - (calc.dividend_paid || 0),
        previous_net: 0,
        net_change_percent: 0,
        previous_price: calc.previous_price,
        new_price: calc.new_price,
        price_change_percent: ((calc.new_price - calc.previous_price) / calc.previous_price) * 100
      })) || [];

      setMarketData(activityData);
      if (priceHistory && priceHistory.length > 0) {
        setLastCalculation(priceHistory[0].calculation_date);
      }
    } catch (error) {
      console.error('Error loading market activity data:', error);
    }
  };

  const calculatePricePreview = async () => {
    setIsCalculating(true);
    try {
      // Calculate date ranges based on selected period
      const now = new Date();
      let currentStart, previousStart, previousEnd;
      
      switch (selectedPeriod) {
        case 'daily':
          currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          previousStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
          previousEnd = currentStart;
          break;
        case 'weekly':
          currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          previousEnd = currentStart;
          break;
        case 'monthly':
          currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          previousEnd = currentStart;
          break;
        case 'quarterly':
          currentStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          previousStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          previousEnd = currentStart;
          break;
        default:
          currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          previousStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
          previousEnd = currentStart;
      }

      console.log('Calculating price preview for period:', selectedPeriod);
      console.log('Date ranges:', {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString()
      });

      // Get actual sales and buybacks for current period
      const { data: sales } = await supabase
        .from('share_transactions')
        .select('quantity')
        .in('transaction_type', ['purchase', 'buy'])
        .eq('status', 'completed')
        .gte('created_at', currentStart.toISOString());

      const { data: buybacks } = await supabase
        .from('share_transactions')
        .select('quantity')
        .in('transaction_type', ['sale', 'sell'])
        .eq('status', 'completed')
        .gte('created_at', currentStart.toISOString());

      // Get previous period for comparison
      const { data: prevSales } = await supabase
        .from('share_transactions')
        .select('quantity')
        .in('transaction_type', ['purchase', 'buy'])
        .eq('status', 'completed')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString());

      const { data: prevBuybacks } = await supabase
        .from('share_transactions')
        .select('quantity')
        .in('transaction_type', ['sale', 'sell'])
        .eq('status', 'completed')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString());

      // Sum share quantities directly
      const soldShares = sales?.reduce((sum, record) => sum + record.quantity, 0) || 0;
      const buybackShares = buybacks?.reduce((sum, record) => sum + record.quantity, 0) || 0;
      const previousSold = prevSales?.reduce((sum, record) => sum + record.quantity, 0) || 0;
      const previousBuyback = prevBuybacks?.reduce((sum, record) => sum + record.quantity, 0) || 0;
      
      const netMovement = soldShares - buybackShares;
      const previousNet = previousSold - previousBuyback;

      console.log('Market activity calculation:', {
        selectedPeriod,
        soldShares,
        buybackShares,
        netMovement,
        previousSold,
        previousBuyback,
        previousNet
      });
      
      const netChangePercent = previousNet !== 0 ? ((netMovement - previousNet) / Math.abs(previousNet)) * 100 : 0;
      
      // Apply the formula with sensitivity scaling
      const rawPriceChange = netChangePercent / 100;
      const sensitivityMultiplier = marketActivityPricing?.net_movement_sensitivity || 1.0;
      const smoothedChange = rawPriceChange * sensitivityMultiplier;
      
      // Apply max daily change limits
      const maxDailyChange = (marketActivityPricing?.max_daily_price_change || 10) / 100;
      const limitedChange = Math.max(-maxDailyChange, Math.min(maxDailyChange, smoothedChange));
      
      let newPrice = currentPrice * (1 + limitedChange);
      
      // Apply minimum price floor (prevent price from going below minimum)
      const minimumPrice = 10000; // Minimum price floor
      newPrice = Math.max(newPrice, minimumPrice);
      
      setPreviewPrice(newPrice);
      toast.success(`Price preview calculated: UGX ${currentPrice.toLocaleString()} → UGX ${newPrice.toLocaleString()}`);
      
    } catch (error: any) {
      console.error('Error calculating price preview:', error);
      toast.error(`Failed to calculate price preview: ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateAndSavePrice = async () => {
    setIsCalculating(true);
    try {
      // First calculate the preview
      await calculatePricePreview();
      
      if (previewPrice) {
        // Record the calculation
        const { data: { user } } = await supabase.auth.getUser();
        const { error: calculationError } = await supabase
          .from('share_price_calculations')
          .insert({
            previous_price: currentPrice,
            new_price: previewPrice,
            mining_profit: 0,
            dividend_paid: 0,
            market_activity_adjustment: 0,
            calculation_method: 'manual_market_activity',
            admin_notes: `Manual calculation with market activity pricing`,
            created_by: user?.id
          });

        if (calculationError) throw calculationError;

        // Update share price
        const { error: updateError } = await supabase
          .from('shares')
          .update({ 
            price_per_share: previewPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', (await supabase.from('shares').select('id').single()).data?.id);

        if (updateError) throw updateError;

        toast.success(`Price updated and saved: UGX ${currentPrice.toLocaleString()} → UGX ${previewPrice.toLocaleString()}`);
        
        setCurrentPrice(previewPrice);
        setPreviewPrice(null);
        loadMarketActivityData();
      }
    } catch (error: any) {
      console.error('Error calculating and saving price:', error);
      toast.error(`Failed to calculate and save price: ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const updateSettings = async (field: string, value: any) => {
    if (!marketActivityPricing) return;
    
    try {
      await updateMarketActivityPricing({
        ...marketActivityPricing,
        [field]: value
      });
      console.log(`Setting ${field} updated to:`, value);
    } catch (error) {
      console.error(`Error updating setting ${field}:`, error);
      toast.error(`Failed to update ${field} setting`);
    }
  };

  const saveAllSettings = async () => {
    if (!marketActivityPricing) return;
    
    setIsSaving(true);
    try {
      // Save all current settings
      await updateMarketActivityPricing(marketActivityPricing);
      
      // Calculate and update price if auto pricing is enabled
      if (marketActivityPricing.auto_pricing_enabled) {
        await calculateAndSavePrice();
      }
      
      toast.success('Settings saved and price updated successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !marketActivityPricing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading market activity pricing...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Price & Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              <CardTitle>Market Activity Pricing Engine</CardTitle>
            </div>
            <Badge variant={marketActivityPricing.auto_pricing_enabled ? 'default' : 'secondary'}>
              {marketActivityPricing.auto_pricing_enabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <CardDescription>
            Automatic price calculation based on net market activity (Sold - Buyback volumes)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-2xl font-bold text-primary">UGX {currentPrice.toLocaleString()}</p>
              {previewPrice && (
                <p className="text-sm text-muted-foreground mt-1">
                  Preview: UGX {previewPrice.toLocaleString()}
                </p>
              )}
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Last Calculation</p>
              <p className="text-sm">{lastCalculation ? new Date(lastCalculation).toLocaleDateString() : 'Never'}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Next Calculation</p>
              <p className="text-sm">{marketActivityPricing.calculation_time || '18:00'} Daily</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pricing Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Auto Market Activity Pricing</Label>
              <p className="text-sm text-muted-foreground">
                Automatically adjust prices based on daily trading volumes
              </p>
            </div>
            <Switch
              checked={marketActivityPricing.auto_pricing_enabled}
              onCheckedChange={(checked) => updateSettings('auto_pricing_enabled', checked)}
            />
          </div>

          {marketActivityPricing.auto_pricing_enabled && (
            <>
              {/* Sensitivity Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sensitivity">Net Movement Sensitivity</Label>
                  <Input
                    id="sensitivity"
                    type="number"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={marketActivityPricing.net_movement_sensitivity}
                    onChange={(e) => updateSettings('net_movement_sensitivity', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    How sensitive price is to market activity (0.1 = less sensitive, 2.0 = more sensitive)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-change">Max Daily Price Change (%)</Label>
                  <Input
                    id="max-change"
                    type="number"
                    min="0.01"
                    max="50.00"
                    step="0.01"
                    value={marketActivityPricing.max_daily_price_change?.toFixed(2) || '10.00'}
                    onChange={(e) => updateSettings('max_daily_price_change', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum allowed price change per day (e.g., 10.00%)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-volume">Minimum Volume Threshold</Label>
                  <Input
                    id="min-volume"
                    type="number"
                    min="100"
                    step="100"
                    value={marketActivityPricing.minimum_volume_threshold}
                    onChange={(e) => updateSettings('minimum_volume_threshold', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum trading volume required for price calculation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calculation-time">Daily Calculation Time</Label>
                  <Input
                    id="calculation-time"
                    type="time"
                    value={marketActivityPricing.calculation_time}
                    onChange={(e) => updateSettings('calculation_time', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Time of day to run automatic calculations
                  </p>
                </div>
              </div>

              {/* Period Selection */}
              <div className="space-y-2">
                <Label htmlFor="period">Market Activity Period</Label>
                <select
                  id="period"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Time period for analyzing market activity
                </p>
              </div>

              {/* Manual Calculation */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">Price Calculation</h4>
                    <p className="text-sm text-muted-foreground">
                      Calculate price preview or save all settings with price update
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline"
                    onClick={calculatePricePreview} 
                    disabled={isCalculating}
                    className="flex items-center gap-2"
                  >
                    {isCalculating ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4" />
                        Calculate Price Now
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={saveAllSettings} 
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Current Period Market Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Current {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Market Activity</CardTitle>
          <CardDescription>
            Live market activity data for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {liveActivityData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Shares Sold</p>
                  <p className="text-2xl font-bold text-green-600">{liveActivityData.currentSold.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Current Period</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Shares Bought Back</p>
                  <p className="text-2xl font-bold text-red-600">{liveActivityData.currentBuyback.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Current Period</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Net Movement</p>
                  <p className={`text-2xl font-bold ${liveActivityData.netMovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {liveActivityData.netMovement >= 0 ? '+' : ''}{liveActivityData.netMovement.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Current vs Previous</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Change from Previous</p>
                  <p className={`text-2xl font-bold ${liveActivityData.netChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {liveActivityData.netChangePercent >= 0 ? '+' : ''}{liveActivityData.netChangePercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Net Activity Change</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Loading market activity data...</p>
                <p className="text-sm">Please wait while data is being fetched</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Price Calculations History */}
      <Card>
        <CardHeader>
          <CardTitle>Price Calculation History</CardTitle>
          <CardDescription>
            Historical price adjustments and calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketData.length > 0 ? (
              marketData.map((data, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium">{new Date(data.date).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">Date</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">UGX {data.previous_price.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Previous</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.price_change_percent > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <div className="text-center">
                        <p className="text-sm font-medium">UGX {data.new_price.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {data.price_change_percent > 0 ? '+' : ''}{data.price_change_percent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Net: {data.net_movement.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Sold: {data.sold_shares.toLocaleString()} | Buyback: {data.buyback_shares.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>No calculation history available</p>
                <p className="text-sm">Price calculations will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketActivityPricingEngine;
