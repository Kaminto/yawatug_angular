import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Percent, TrendingUp, Lock } from 'lucide-react';
import { ShareData } from '@/types/custom';

interface ReserveSettingsManagerProps {
  shareData: ShareData;
  onUpdate: () => void;
}

const ReserveSettingsManager: React.FC<ReserveSettingsManagerProps> = ({ 
  shareData, 
  onUpdate 
}) => {
  const [loading, setLoading] = useState(false);
  const [reserveSettings, setReserveSettings] = useState({
    reserve_rate_percent: shareData.reserve_rate_percent || 10,
    reserve_allocated_shares: shareData.reserve_allocated_shares || 0,
    reserve_issued_shares: shareData.reserve_issued_shares || 0
  });

  const calculateReserveMetrics = () => {
    const totalReserveShares = Math.floor((shareData.total_shares * reserveSettings.reserve_rate_percent) / 100);
    const availableReserveShares = totalReserveShares - reserveSettings.reserve_issued_shares;
    const utilizationPercent = totalReserveShares > 0 ? (reserveSettings.reserve_issued_shares / totalReserveShares) * 100 : 0;

    return {
      totalReserveShares,
      availableReserveShares,
      utilizationPercent
    };
  };

  const metrics = calculateReserveMetrics();

  const handleUpdateReserveRate = async () => {
    if (reserveSettings.reserve_rate_percent < 0 || reserveSettings.reserve_rate_percent > 50) {
      toast.error('Reserve rate must be between 0% and 50%');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shares')
        .update({
          reserve_rate_percent: reserveSettings.reserve_rate_percent,
          reserve_allocated_shares: metrics.totalReserveShares
        })
        .eq('id', shareData.id);

      if (error) throw error;

      toast.success('Reserve settings updated successfully');
      
      // Notify other settings tabs of the update
      const event = new CustomEvent('settingsUpdate', { detail: { source: 'reserve' } });
      window.dispatchEvent(event);
      
      onUpdate();
    } catch (error) {
      console.error('Error updating reserve settings:', error);
      toast.error('Failed to update reserve settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Reserve Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{reserveSettings.reserve_rate_percent}%</p>
                <p className="text-xs text-muted-foreground">Reserve Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{metrics.totalReserveShares.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Reserve</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{reserveSettings.reserve_issued_shares.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{metrics.availableReserveShares.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reserve Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Reserve Utilization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Utilization Rate</span>
              <span>{metrics.utilizationPercent.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.utilizationPercent} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Total Reserve:</span>
              <span>{metrics.totalReserveShares.toLocaleString()} shares</span>
            </div>
            <div className="flex justify-between">
              <span>Available:</span>
              <span>{metrics.availableReserveShares.toLocaleString()} shares</span>
            </div>
          </div>

          {metrics.utilizationPercent > 80 && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                ⚠️ Reserve utilization is high ({metrics.utilizationPercent.toFixed(1)}%). 
                Consider increasing reserve rate or issuing fewer reserved shares.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reserve Settings Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Reserve Rate Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Reserve Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={reserveSettings.reserve_rate_percent}
                onChange={(e) => setReserveSettings(prev => ({
                  ...prev,
                  reserve_rate_percent: Number(e.target.value)
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of total shares allocated to reserve (0-50%)
              </p>
            </div>
            
            <div>
              <Label>Calculated Reserve Shares</Label>
              <Input
                value={metrics.totalReserveShares.toLocaleString()}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-calculated based on reserve rate
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium">Impact Analysis</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current Market Shares:</span>
                <span className="ml-2 font-medium">
                  {(shareData.total_shares - metrics.totalReserveShares).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Reserve Value:</span>
                <span className="ml-2 font-medium">
                  {shareData.currency} {(metrics.totalReserveShares * shareData.price_per_share).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleUpdateReserveRate}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Updating...' : 'Update Reserve Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReserveSettingsManager;