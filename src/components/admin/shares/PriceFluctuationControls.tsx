
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Shield, Activity } from 'lucide-react';
import { useMarketState } from '@/hooks/useMarketState';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import MarketActivityPricingEngine from './MarketActivityPricingEngine';

const PriceFluctuationControls: React.FC = () => {
  const { priceControls, loading, updatePriceControls } = useMarketState();
  const [controls, setControls] = useState(priceControls);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (priceControls) {
      setControls(priceControls);
    }
  }, [priceControls]);

  const handleSave = async () => {
    if (!controls) return;
    
    try {
      setIsSaving(true);
      await updatePriceControls(controls);
    } finally {
      setIsSaving(false);
    }
  };

  const updateControl = (field: keyof typeof controls, value: any) => {
    if (!controls) return;
    setControls({ ...controls, [field]: value });
  };

  const handleHaltToggle = async (halt: boolean) => {
    if (!controls) return;
    
    const updates = {
      trading_halted: halt,
      halt_reason: halt ? 'Manual trading halt by admin' : null,
      halt_started_at: halt ? new Date().toISOString() : null
    };
    
    await updatePriceControls(updates);
  };

  if (loading || !controls) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="price-limits" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="price-limits" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Price Limits
          </TabsTrigger>
          <TabsTrigger value="market-activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Market Activity Pricing
          </TabsTrigger>
          <TabsTrigger value="trading-status" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trading Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="price-limits" className="space-y-6">
          {/* Price Fluctuation Limits */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                <CardTitle>Price Fluctuation Limits</CardTitle>
              </div>
              <CardDescription>
                Set maximum allowed price changes to prevent market manipulation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Enable Price Controls</Label>
                  <p className="text-sm text-muted-foreground">
                    Apply automatic price fluctuation limits
                  </p>
                </div>
                <Switch
                  checked={controls.is_enabled}
                  onCheckedChange={(checked) => updateControl('is_enabled', checked)}
                />
              </div>

              {controls.is_enabled && (
                <>
                  {/* Daily Limits */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Daily Limits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="daily-increase">Max Daily Increase (%)</Label>
                        <Input
                          id="daily-increase"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={controls.daily_max_increase_percent}
                          onChange={(e) => updateControl('daily_max_increase_percent', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="daily-decrease">Max Daily Decrease (%)</Label>
                        <Input
                          id="daily-decrease"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={controls.daily_max_decrease_percent}
                          onChange={(e) => updateControl('daily_max_decrease_percent', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Weekly Limits */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Weekly Limits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="weekly-increase">Max Weekly Increase (%)</Label>
                        <Input
                          id="weekly-increase"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={controls.weekly_max_increase_percent}
                          onChange={(e) => updateControl('weekly_max_increase_percent', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weekly-decrease">Max Weekly Decrease (%)</Label>
                        <Input
                          id="weekly-decrease"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={controls.weekly_max_decrease_percent}
                          onChange={(e) => updateControl('weekly_max_decrease_percent', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Monthly Limits */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Monthly Limits</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthly-increase">Max Monthly Increase (%)</Label>
                        <Input
                          id="monthly-increase"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={controls.monthly_max_increase_percent}
                          onChange={(e) => updateControl('monthly_max_increase_percent', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="monthly-decrease">Max Monthly Decrease (%)</Label>
                        <Input
                          id="monthly-decrease"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={controls.monthly_max_decrease_percent}
                          onChange={(e) => updateControl('monthly_max_decrease_percent', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Circuit Breaker */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-base font-medium">Circuit Breaker</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically halt trading during extreme price movements
                        </p>
                      </div>
                      <Switch
                        checked={controls.circuit_breaker_enabled}
                        onCheckedChange={(checked) => updateControl('circuit_breaker_enabled', checked)}
                      />
                    </div>

                    {controls.circuit_breaker_enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="circuit-threshold">Circuit Breaker Threshold (%)</Label>
                          <Input
                            id="circuit-threshold"
                            type="number"
                            min="1"
                            max="50"
                            step="0.1"
                            value={controls.circuit_breaker_threshold}
                            onChange={(e) => updateControl('circuit_breaker_threshold', parseFloat(e.target.value))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Halt trading if price moves more than this % at once
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cooling-period" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Cooling Period (Minutes)
                          </Label>
                          <Input
                            id="cooling-period"
                            type="number"
                            min="1"
                            step="1"
                            value={controls.cooling_period_minutes}
                            onChange={(e) => updateControl('cooling_period_minutes', parseInt(e.target.value))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum time to wait before resuming after circuit breaker
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? 'Saving...' : 'Save Price Controls'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market-activity" className="space-y-6">
          <MarketActivityPricingEngine />
        </TabsContent>

        <TabsContent value="trading-status" className="space-y-6">
          {/* Trading Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <CardTitle>Trading Status</CardTitle>
                </div>
                <Badge variant={controls.trading_halted ? 'destructive' : 'default'}>
                  {controls.trading_halted ? 'Trading Halted' : 'Trading Active'}
                </Badge>
              </div>
              <CardDescription>
                Current trading status and circuit breaker information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {controls.trading_halted && (
                <div className="flex items-start gap-3 p-4 border border-red-200 rounded-lg bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-800">Trading Currently Halted</p>
                    <p className="text-sm text-red-700">
                      Reason: {controls.halt_reason || 'No reason specified'}
                    </p>
                    {controls.halt_started_at && (
                      <p className="text-sm text-red-700">
                        Started: {new Date(controls.halt_started_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant={controls.trading_halted ? 'default' : 'destructive'}>
                      {controls.trading_halted ? 'Resume Trading' : 'Halt Trading'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {controls.trading_halted ? 'Resume Trading' : 'Halt Trading'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {controls.trading_halted 
                          ? 'This will resume all trading activities immediately.' 
                          : 'This will immediately halt all trading activities. Only admin actions will be allowed.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleHaltToggle(!controls.trading_halted)}>
                        Confirm
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PriceFluctuationControls;
