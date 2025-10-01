import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, DollarSign } from 'lucide-react';
import { useMarketState } from '@/hooks/useMarketState';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const AutoBuybackSettings: React.FC = () => {
  const { autoBuybackSettings, loading, updateAutoBuybackSettings } = useMarketState();
  const [settings, setSettings] = useState(autoBuybackSettings);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (autoBuybackSettings) {
      setSettings(autoBuybackSettings);
    }
  }, [autoBuybackSettings]);

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setIsSaving(true);
      await updateAutoBuybackSettings(settings);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (field: keyof typeof settings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (loading || !settings) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Auto-Buyback Protection</CardTitle>
          </div>
          <CardDescription>
            Automatically trigger company buybacks when market dump thresholds are exceeded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Auto-Buyback</Label>
              <p className="text-sm text-muted-foreground">
                Automatically buy back shares during market dumps
              </p>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(checked) => updateSetting('is_enabled', checked)}
            />
          </div>

          {settings.is_enabled && (
            <>
              {/* Dump Thresholds */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-threshold">Daily Dump Threshold (%)</Label>
                  <Input
                    id="daily-threshold"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.daily_dump_threshold}
                    onChange={(e) => updateSetting('daily_dump_threshold', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Trigger if price drops this % in a day
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekly-threshold">Weekly Dump Threshold (%)</Label>
                  <Input
                    id="weekly-threshold"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.weekly_dump_threshold}
                    onChange={(e) => updateSetting('weekly_dump_threshold', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Trigger if price drops this % in a week
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly-threshold">Monthly Dump Threshold (%)</Label>
                  <Input
                    id="monthly-threshold"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.monthly_dump_threshold}
                    onChange={(e) => updateSetting('monthly_dump_threshold', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Trigger if price drops this % in a month
                  </p>
                </div>
              </div>

              {/* Volume Multiplier */}
              <div className="space-y-2">
                <Label htmlFor="volume-multiplier">Volume Threshold Multiplier</Label>
                <Input
                  id="volume-multiplier"
                  type="number"
                  min="1"
                  step="0.1"
                  value={settings.volume_threshold_multiplier}
                  onChange={(e) => updateSetting('volume_threshold_multiplier', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Multiply normal volume by this factor to trigger buyback
                </p>
              </div>

              {/* Buyback Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-limit" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Max Daily Buyback Amount
                  </Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    min="0"
                    step="1000"
                    value={settings.max_daily_buyback_amount}
                    onChange={(e) => updateSetting('max_daily_buyback_amount', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum amount to spend on buybacks per day
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekly-limit">Max Weekly Buyback Amount</Label>
                  <Input
                    id="weekly-limit"
                    type="number"
                    min="0"
                    step="1000"
                    value={settings.max_weekly_buyback_amount}
                    onChange={(e) => updateSetting('max_weekly_buyback_amount', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum amount to spend on buybacks per week
                  </p>
                </div>
              </div>

              {/* Price Premium and Cooling Period */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price-premium">Buyback Price Premium (%)</Label>
                  <Input
                    id="price-premium"
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.buyback_price_premium}
                    onChange={(e) => updateSetting('buyback_price_premium', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Premium above market price for buybacks
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cooling-period">Cooling Period (Hours)</Label>
                  <Input
                    id="cooling-period"
                    type="number"
                    min="1"
                    step="1"
                    value={settings.cooling_period_hours}
                    onChange={(e) => updateSetting('cooling_period_hours', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Wait time between buyback triggers
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 border border-amber-200 rounded-lg bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800">
                    Auto-Buyback Warning
                  </p>
                  <p className="text-sm text-amber-700">
                    Auto-buyback will use company funds to purchase shares automatically when dump conditions are met. 
                    Ensure sufficient funds are available in the share buyback wallet.
                  </p>
                </div>
              </div>
            </>
          )}

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? 'Saving...' : 'Save Auto-Buyback Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoBuybackSettings;