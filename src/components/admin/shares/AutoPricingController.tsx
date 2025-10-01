
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, Settings, AlertCircle, Calculator } from 'lucide-react';

interface AutoPricingControllerProps {
  shareData: any;
  onUpdate: () => void;
  marketActivity?: any;
}

const AutoPricingController: React.FC<AutoPricingControllerProps> = ({ 
  shareData, 
  onUpdate,
  marketActivity 
}) => {
  const [settings, setSettings] = useState({
    is_enabled: false,
    update_frequency: 'monthly',
    mining_profit_weight: 1.0,
    dividend_weight: 1.0,
    market_activity_weight: 0.02,
    max_price_increase_percent: 10,
    max_price_decrease_percent: 10,
    minimum_price_floor: 20000
  });
  const [loading, setLoading] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [previewPrice, setPreviewPrice] = useState<number | null>(null);

  useEffect(() => {
    loadPricingSettings();
    loadPriceHistory();
  }, []);

  const loadPricingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_dynamic_pricing_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          is_enabled: data.is_enabled,
          update_frequency: 'monthly', // Map from calculation_frequency
          mining_profit_weight: data.mining_profit_weight,
          dividend_weight: data.dividend_weight,
          market_activity_weight: data.market_activity_weight,
          max_price_increase_percent: data.price_volatility_limit,
          max_price_decrease_percent: data.price_volatility_limit,
          minimum_price_floor: data.minimum_price_floor
        });
      }
    } catch (error) {
      console.error('Error loading pricing settings:', error);
    }
  };

  const loadPriceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('enhanced_share_price_calculations')
        .select('*')
        .order('calculation_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPriceHistory(data || []);
    } catch (error) {
      console.error('Error loading price history:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Save settings to database
      const { error } = await supabase
        .from('admin_dynamic_pricing_settings')
        .upsert({
          is_enabled: settings.is_enabled,
          calculation_frequency: 'daily', // Map from update_frequency
          mining_profit_weight: settings.mining_profit_weight,
          dividend_weight: settings.dividend_weight,
          market_activity_weight: settings.market_activity_weight,
          price_volatility_limit: settings.max_price_increase_percent,
          minimum_price_floor: settings.minimum_price_floor,
          id: '00000000-0000-0000-0000-000000000001' // Use fixed UUID
        });

      if (error) throw error;

      toast.success('Auto pricing settings saved successfully');
      onUpdate(); // Refresh parent component data
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save auto pricing settings');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewPrice = () => {
    if (!shareData) return 0;

    const currentPrice = shareData.price_per_share;
    const miningProfit = 5000; // This would come from actual mining data
    const dividendPaid = 2000; // This would come from dividend data
    const marketActivityAdjustment = marketActivity?.buy_sell_ratio ? 
      (marketActivity.buy_sell_ratio - 1) * currentPrice * settings.market_activity_weight : 0;

    const totalAdjustment = 
      (miningProfit * settings.mining_profit_weight) +
      (dividendPaid * settings.dividend_weight) +
      marketActivityAdjustment;

    let newPrice = currentPrice + totalAdjustment;

    // Apply limits
    const maxIncrease = currentPrice * (settings.max_price_increase_percent / 100);
    const maxDecrease = currentPrice * (settings.max_price_decrease_percent / 100);

    if (newPrice > currentPrice + maxIncrease) {
      newPrice = currentPrice + maxIncrease;
    } else if (newPrice < currentPrice - maxDecrease) {
      newPrice = currentPrice - maxDecrease;
    }

    // Apply minimum floor
    if (newPrice < settings.minimum_price_floor) {
      newPrice = settings.minimum_price_floor;
    }

    return Math.round(newPrice);
  };

  const updateSharePrice = async (newPrice: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const currentPrice = shareData.price_per_share;

    // Record the calculation
    const calculationData = {
      calculation_date: new Date().toISOString().split('T')[0],
      previous_price: currentPrice,
      mining_profit: 5000,
      dividend_paid: 2000,
      market_activity_adjustment: marketActivity?.buy_sell_ratio ? 
        (marketActivity.buy_sell_ratio - 1) * currentPrice * settings.market_activity_weight : 0,
      buy_sell_ratio: marketActivity?.buy_sell_ratio || 1,
      new_price: newPrice,
      calculation_method: 'manual',
      admin_notes: 'Price updated via auto pricing controller',
      created_by: user.id
    };

    // Record the calculation
    const { error: calcError } = await supabase
      .from('enhanced_share_price_calculations')
      .insert({
        share_id: shareData.id,
        calculation_method: 'auto',
        previous_price: currentPrice,
        calculated_price: newPrice,
        mining_profit_factor: 5000,
        dividend_impact_factor: 2000,
        market_activity_factor: marketActivity?.buy_sell_ratio ? 
          (marketActivity.buy_sell_ratio - 1) * currentPrice * settings.market_activity_weight : 0,
        admin_notes: 'Price updated via auto pricing controller',
        calculation_inputs: {
          buy_sell_ratio: marketActivity?.buy_sell_ratio || 1,
          timestamp: new Date().toISOString()
        }
      });

    if (calcError) throw calcError;

    // Update share price
    const { error: updateError } = await supabase
      .from('shares')
      .update({
        price_per_share: newPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', shareData.id);

    if (updateError) throw updateError;

    toast.success(`Price updated from ${currentPrice.toLocaleString()} to ${newPrice.toLocaleString()}`);
    onUpdate();
    loadPriceHistory();
  };

  const handlePreviewCalculation = () => {
    const calculatedPrice = calculateNewPrice();
    setPreviewPrice(calculatedPrice);
    toast.success(`Price preview calculated: ${shareData.currency} ${calculatedPrice.toLocaleString()}`);
  };

  const displayPrice = previewPrice || calculateNewPrice();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Auto Pricing Controller
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Auto Pricing */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Auto Pricing</Label>
              <p className="text-sm text-muted-foreground">
                Automatically calculate share prices based on configured factors
              </p>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
            />
          </div>

          {/* Pricing Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Update Frequency</Label>
              <Select
                value={settings.update_frequency}
                onValueChange={(value) => setSettings({ ...settings, update_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mining Profit Weight</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.mining_profit_weight}
                onChange={(e) => setSettings({ ...settings, mining_profit_weight: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Dividend Weight</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.dividend_weight}
                onChange={(e) => setSettings({ ...settings, dividend_weight: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Market Sensitivity Scale (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={(settings.market_activity_weight * 100).toFixed(2)}
                onChange={(e) => setSettings({ ...settings, market_activity_weight: parseFloat(e.target.value) / 100 || 0 })}
                placeholder="0.00 - 1.00"
              />
              <p className="text-xs text-muted-foreground mt-1">Range: 0.00% - 1.00%</p>
            </div>

            <div>
              <Label>Max Price Increase (%)</Label>
              <Input
                type="text"
                value={settings.max_price_increase_percent.toFixed(2)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= 100) {
                    setSettings({ ...settings, max_price_increase_percent: value });
                  }
                }}
                onBlur={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setSettings({ ...settings, max_price_increase_percent: Math.min(Math.max(value, 0), 100) });
                }}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Max Price Decrease (%)</Label>
              <Input
                type="text"
                value={settings.max_price_decrease_percent.toFixed(2)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= 100) {
                    setSettings({ ...settings, max_price_decrease_percent: value });
                  }
                }}
                onBlur={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setSettings({ ...settings, max_price_decrease_percent: Math.min(Math.max(value, 0), 100) });
                }}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Minimum Price Floor</Label>
              <Input
                type="number"
                value={settings.minimum_price_floor}
                onChange={(e) => setSettings({ ...settings, minimum_price_floor: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Price Preview */}
          {shareData && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Price Calculation Preview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Current Price</div>
                  <div className="text-lg font-bold">{shareData.currency} {shareData.price_per_share.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    {previewPrice ? 'Preview Price' : 'Calculated New Price'}
                  </div>
                  <div className={`text-lg font-bold ${previewPrice ? 'text-blue-600' : 'text-green-600'}`}>
                    {shareData.currency} {displayPrice.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Change: {displayPrice > shareData.price_per_share ? '+' : ''}{((displayPrice - shareData.price_per_share) / shareData.price_per_share * 100).toFixed(2)}%
                {previewPrice && <span className="ml-2 text-blue-600">(Preview)</span>}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={handleSaveSettings}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button 
              onClick={handlePreviewCalculation}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Calculate Price Now
            </Button>
          </div>

          {settings.is_enabled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Auto pricing is enabled. Prices will be automatically updated {settings.update_frequency}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Price History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Price Calculations</CardTitle>
        </CardHeader>
        <CardContent>
          {priceHistory.length > 0 ? (
            <div className="space-y-2">
              {priceHistory.map((calc: any, index) => (
                <div key={calc.id} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <div className="font-medium">{calc.calculation_date}</div>
                    <div className="text-sm text-muted-foreground">
                      {calc.calculation_method === 'auto' ? 'Automatic' : 'Manual'} calculation
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {shareData?.currency} {calc.previous_price.toLocaleString()} → {calc.new_price.toLocaleString()}
                    </div>
                    <Badge variant={calc.new_price > calc.previous_price ? 'default' : 'secondary'}>
                      {calc.new_price > calc.previous_price ? '+' : ''}{((calc.new_price - calc.previous_price) / calc.previous_price * 100).toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No price calculations recorded yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoPricingController;
