import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp } from 'lucide-react';

interface MarketMakingSettingsProps {
  settings: {
    id: string;
    is_enabled: boolean;
    bid_spread_percent: number;
    ask_spread_percent: number;
    max_liquidity_per_order: number;
    auto_market_make_during_high_volume: boolean;
    high_volume_threshold_multiplier: number;
    market_making_hours_start: string;
    market_making_hours_end: string;
  };
  onUpdate: (settings: any) => Promise<void>;
}

export const MarketMakingSettings: React.FC<MarketMakingSettingsProps> = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate(formData);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Switch
            checked={formData.is_enabled}
            onCheckedChange={(checked) => updateField('is_enabled', checked)}
          />
          <div>
            <Label className="text-base font-medium">Enable Market Making</Label>
            <p className="text-sm text-muted-foreground">
              Provide instant liquidity by automatically creating buy/sell orders
            </p>
          </div>
        </div>
        <Badge variant={formData.is_enabled ? "default" : "secondary"}>
          {formData.is_enabled ? "Active" : "Inactive"}
        </Badge>
      </div>

      {formData.is_enabled && (
        <>
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              Market making provides instant liquidity but requires sufficient balance in admin wallets. Monitor spreads to ensure profitability.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spread Configuration</CardTitle>
                <CardDescription>Buy and sell price spreads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bid Spread (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.bid_spread_percent}
                    onChange={(e) => updateField('bid_spread_percent', Number(e.target.value))}
                    min="0.1"
                    max="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    % below current price for buy orders
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Ask Spread (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.ask_spread_percent}
                    onChange={(e) => updateField('ask_spread_percent', Number(e.target.value))}
                    min="0.1"
                    max="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    % above current price for sell orders
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Liquidity per Order (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.max_liquidity_per_order}
                    onChange={(e) => updateField('max_liquidity_per_order', Number(e.target.value))}
                    min="10000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum value per market making order
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Operating Hours</CardTitle>
                <CardDescription>When market making is active</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.market_making_hours_start}
                    onChange={(e) => updateField('market_making_hours_start', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.market_making_hours_end}
                    onChange={(e) => updateField('market_making_hours_end', e.target.value)}
                  />
                </div>

                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Market making will only create orders during these hours. 
                    Use 24-hour format (00:00 to 23:59).
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">High Volume Settings</CardTitle>
                <CardDescription>Automatic activation during busy periods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Activate During High Volume</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically increase market making during high volume periods
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_market_make_during_high_volume}
                    onCheckedChange={(checked) => updateField('auto_market_make_during_high_volume', checked)}
                  />
                </div>

                {formData.auto_market_make_during_high_volume && (
                  <div className="space-y-2">
                    <Label>High Volume Threshold Multiplier</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.high_volume_threshold_multiplier}
                      onChange={(e) => updateField('high_volume_threshold_multiplier', Number(e.target.value))}
                      min="1.5"
                      max="10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Volume must be X times higher than average to trigger high-volume mode
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};