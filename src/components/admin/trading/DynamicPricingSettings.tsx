import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Play, Pause } from 'lucide-react';

interface DynamicPricingSettingsProps {
  settings: {
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
  };
  onUpdate: (settings: any) => Promise<void>;
}

export const DynamicPricingSettings: React.FC<DynamicPricingSettingsProps> = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [cronStatus, setCronStatus] = useState<any>(null);
  const [loadingCron, setLoadingCron] = useState(false);
  const [testingTrigger, setTestingTrigger] = useState(false);

  useEffect(() => {
    loadCronStatus();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate(formData);
      
      // Update cron job if enabled
      if (formData.is_enabled) {
        await manageCronJob(formData.update_interval_hours, true);
      } else {
        await manageCronJob(0, false);
      }
      
      await loadCronStatus();
    } finally {
      setSaving(false);
    }
  };

  const loadCronStatus = async () => {
    try {
      setLoadingCron(true);
      const { data, error } = await supabase.rpc('get_auto_pricing_cron_status');
      if (error) throw error;
      setCronStatus(data as unknown as any);
    } catch (error: any) {
      console.error('Error loading cron status:', error);
    } finally {
      setLoadingCron(false);
    }
  };

  const manageCronJob = async (intervalHours: number, enabled: boolean) => {
    try {
      const { data, error } = await supabase.rpc('manage_auto_pricing_cron', {
        p_interval_hours: intervalHours,
        p_enabled: enabled
      });
      
      if (error) throw error;
      
      if ((data as any)?.success) {
        toast.success(enabled ? 'Auto-pricing scheduled successfully' : 'Auto-pricing disabled');
      } else {
        throw new Error((data as any)?.error || 'Failed to manage cron job');
      }
    } catch (error: any) {
      console.error('Error managing cron job:', error);
      toast.error(error.message);
    }
  };

  const testTrigger = async () => {
    try {
      setTestingTrigger(true);
      const { data, error } = await supabase.functions.invoke('trigger-auto-pricing', {
        body: { manual_test: true }
      });
      
      if (error) throw error;
      
      toast.success('Auto pricing test triggered successfully');
      await loadCronStatus();
    } catch (error: any) {
      console.error('Error testing trigger:', error);
      toast.error('Failed to test auto pricing trigger');
    } finally {
      setTestingTrigger(false);
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
            <Label className="text-base font-medium">Enable Dynamic Pricing</Label>
            <p className="text-sm text-muted-foreground">
              Automatically adjust share prices based on market activity
            </p>
          </div>
        </div>
        <Badge variant={formData.is_enabled ? "default" : "secondary"}>
          {formData.is_enabled ? "Active" : "Inactive"}
        </Badge>
      </div>

      {formData.is_enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Calculation Schedule</CardTitle>
              <CardDescription>When and how often to update prices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={formData.calculation_frequency}
                  onValueChange={(value) => updateField('calculation_frequency', value)}
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

              <div className="space-y-2">
                <Label>Update Interval (hours)</Label>
                <Select
                  value={formData.update_interval_hours?.toString()}
                  onValueChange={(value) => updateField('update_interval_hours', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Every Hour</SelectItem>
                    <SelectItem value="4">Every 4 Hours</SelectItem>
                    <SelectItem value="6">Every 6 Hours</SelectItem>
                    <SelectItem value="12">Every 12 Hours</SelectItem>
                    <SelectItem value="24">Daily</SelectItem>
                    <SelectItem value="168">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How often to automatically update prices
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price Controls</CardTitle>
              <CardDescription>Limits and safety measures</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Max Price Change (%)</Label>
                <Input
                  type="number"
                  value={formData.price_volatility_limit}
                  onChange={(e) => updateField('price_volatility_limit', Number(e.target.value))}
                  min="0"
                  max="50"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum percentage change allowed per calculation
                </p>
              </div>

              <div className="space-y-2">
                <Label>Minimum Price Floor (UGX)</Label>
                <Input
                  type="number"
                  value={formData.minimum_price_floor}
                  onChange={(e) => updateField('minimum_price_floor', Number(e.target.value))}
                  min="1000"
                />
                <p className="text-xs text-muted-foreground">
                  Share price cannot go below this amount
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Weighting Factors</CardTitle>
              <CardDescription>How much each factor influences price calculations</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Market Activity Weight</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.market_activity_weight}
                  onChange={(e) => updateField('market_activity_weight', Number(e.target.value))}
                  min="0"
                  max="5"
                />
                <p className="text-xs text-muted-foreground">
                  Trading volume impact
                </p>
              </div>

              <div className="space-y-2">
                <Label>Mining Profit Weight</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.mining_profit_weight}
                  onChange={(e) => updateField('mining_profit_weight', Number(e.target.value))}
                  min="0"
                  max="10"
                />
                <p className="text-xs text-muted-foreground">
                  Company performance factor
                </p>
              </div>

              <div className="space-y-2">
                <Label>Dividend Weight</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.dividend_weight}
                  onChange={(e) => updateField('dividend_weight', Number(e.target.value))}
                  min="0"
                  max="10"
                />
                <p className="text-xs text-muted-foreground">
                  Dividend payment influence
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Cron Job Status Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Auto-Pricing Status
              </CardTitle>
              <CardDescription>
                Server-side automated pricing scheduler status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingCron ? (
                <div className="text-center py-4">Loading status...</div>
              ) : cronStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Badge variant={cronStatus.is_active ? "default" : "secondary"}>
                      {cronStatus.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <p className="text-sm text-muted-foreground">
                      {cronStatus.cron_expression || 'Not set'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Last Execution</Label>
                    <p className="text-sm text-muted-foreground">
                      {cronStatus.last_execution 
                        ? new Date(cronStatus.last_execution).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No cron job configured</p>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={testTrigger} 
                  disabled={testingTrigger}
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {testingTrigger ? 'Testing...' : 'Test Now'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={loadCronStatus} 
                  disabled={loadingCron}
                  size="sm"
                >
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};