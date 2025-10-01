import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface AutoBuybackSettingsProps {
  settings: {
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
  };
  onUpdate: (settings: any) => Promise<void>;
}

export const AutoBuybackSettings: React.FC<AutoBuybackSettingsProps> = ({ settings, onUpdate }) => {
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
            <Label className="text-base font-medium">Enable Auto-Buyback</Label>
            <p className="text-sm text-muted-foreground">
              Automatically buyback shares when selling volume thresholds are reached
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
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Auto-buyback will use funds from the share buyback admin wallet. Ensure sufficient balance before enabling.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trigger Thresholds</CardTitle>
                <CardDescription>Selling volume percentages that trigger buyback</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Daily Threshold (%)</Label>
                  <Input
                    type="number"
                    value={formData.daily_sell_threshold_percent}
                    onChange={(e) => updateField('daily_sell_threshold_percent', Number(e.target.value))}
                    min="1"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Trigger when daily sells exceed this % of daily volume
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Weekly Threshold (%)</Label>
                  <Input
                    type="number"
                    value={formData.weekly_sell_threshold_percent}
                    onChange={(e) => updateField('weekly_sell_threshold_percent', Number(e.target.value))}
                    min="1"
                    max="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Monthly Threshold (%)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_sell_threshold_percent}
                    onChange={(e) => updateField('monthly_sell_threshold_percent', Number(e.target.value))}
                    min="1"
                    max="100"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Buyback Limits</CardTitle>
                <CardDescription>Maximum amounts per period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Max Daily Buyback (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.max_daily_buyback_amount}
                    onChange={(e) => updateField('max_daily_buyback_amount', Number(e.target.value))}
                    min="10000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Weekly Buyback (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.max_weekly_buyback_amount}
                    onChange={(e) => updateField('max_weekly_buyback_amount', Number(e.target.value))}
                    min="50000"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Advanced Settings</CardTitle>
                <CardDescription>Fine-tune buyback behavior</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cooling Period (Hours)</Label>
                  <Input
                    type="number"
                    value={formData.cooling_period_hours}
                    onChange={(e) => updateField('cooling_period_hours', Number(e.target.value))}
                    min="1"
                    max="168"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wait time between buyback sessions
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Price Premium (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.price_premium_percent}
                    onChange={(e) => updateField('price_premium_percent', Number(e.target.value))}
                    min="0"
                    max="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Extra % above current price
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Volume Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.volume_threshold_multiplier}
                    onChange={(e) => updateField('volume_threshold_multiplier', Number(e.target.value))}
                    min="1"
                    max="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Volume spike detection multiplier
                  </p>
                </div>
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