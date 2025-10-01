
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Activity, BarChart3, AlertCircle } from 'lucide-react';

interface MarketActivityControllerProps {
  marketActivity: any;
  onUpdate: () => void;
}

const MarketActivityController: React.FC<MarketActivityControllerProps> = ({ 
  marketActivity, 
  onUpdate 
}) => {
  const [loading, setLoading] = useState(false);
  const [activityData, setActivityData] = useState({
    total_buy_orders: 0,
    total_sell_orders: 0,
    buy_volume: 0,
    sell_volume: 0,
  });

  useEffect(() => {
    if (marketActivity) {
      setActivityData({
        total_buy_orders: marketActivity.total_buy_orders || 0,
        total_sell_orders: marketActivity.total_sell_orders || 0,
        buy_volume: marketActivity.buy_volume || 0,
        sell_volume: marketActivity.sell_volume || 0,
      });
    }
  }, [marketActivity]);

  const calculateBuySellRatio = () => {
    if (activityData.sell_volume === 0) return activityData.buy_volume > 0 ? 99 : 1;
    return (activityData.buy_volume / activityData.sell_volume);
  };

  const getMarketSentiment = () => {
    const ratio = calculateBuySellRatio();
    if (ratio > 1.5) return 'bullish';
    if (ratio < 0.67) return 'bearish';
    return 'neutral';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-600';
      case 'bearish': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  const handleUpdateActivity = async () => {
    try {
      setLoading(true);
      
      const buySellRatio = calculateBuySellRatio();
      const sentiment = getMarketSentiment();
      
      // Use type assertion for new table
      const { error } = await (supabase as any)
        .from('market_activity_log')
        .upsert({
          activity_date: new Date().toISOString().split('T')[0],
          total_buy_orders: activityData.total_buy_orders,
          total_sell_orders: activityData.total_sell_orders,
          buy_volume: activityData.buy_volume,
          sell_volume: activityData.sell_volume,
          buy_sell_ratio: buySellRatio,
          price_volatility: 0,
          average_trade_size: activityData.buy_volume > 0 ? activityData.buy_volume / Math.max(activityData.total_buy_orders, 1) : 0,
        }, {
          onConflict: 'activity_date'
        });

      if (error) throw error;

      toast.success('Market activity updated successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Error updating market activity:', error);
      toast.error('Failed to update market activity');
    } finally {
      setLoading(false);
    }
  };

  const sentiment = getMarketSentiment();
  const ratio = calculateBuySellRatio();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Activity Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Market Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {activityData.total_buy_orders}
              </div>
              <div className="text-sm text-muted-foreground">Buy Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {activityData.total_sell_orders}
              </div>
              <div className="text-sm text-muted-foreground">Sell Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {activityData.buy_volume.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Buy Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {activityData.sell_volume.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Sell Volume</div>
            </div>
          </div>

          {/* Market Sentiment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Buy/Sell Ratio</p>
                    <p className="text-2xl font-bold">{ratio.toFixed(2)}</p>
                  </div>
                  {ratio > 1 ? (
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Market Sentiment</p>
                    <Badge className={getSentimentColor(sentiment)}>
                      {sentiment.toUpperCase()}
                    </Badge>
                  </div>
                  <BarChart3 className={`h-8 w-8 ${getSentimentColor(sentiment)}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Manual Activity Input */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Update Market Activity</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Buy Orders</Label>
                <Input
                  type="number"
                  value={activityData.total_buy_orders}
                  onChange={(e) => setActivityData(prev => ({
                    ...prev,
                    total_buy_orders: parseInt(e.target.value) || 0
                  }))}
                />
              </div>
              <div>
                <Label>Sell Orders</Label>
                <Input
                  type="number"
                  value={activityData.total_sell_orders}
                  onChange={(e) => setActivityData(prev => ({
                    ...prev,
                    total_sell_orders: parseInt(e.target.value) || 0
                  }))}
                />
              </div>
              <div>
                <Label>Buy Volume</Label>
                <Input
                  type="number"
                  value={activityData.buy_volume}
                  onChange={(e) => setActivityData(prev => ({
                    ...prev,
                    buy_volume: parseInt(e.target.value) || 0
                  }))}
                />
              </div>
              <div>
                <Label>Sell Volume</Label>
                <Input
                  type="number"
                  value={activityData.sell_volume}
                  onChange={(e) => setActivityData(prev => ({
                    ...prev,
                    sell_volume: parseInt(e.target.value) || 0
                  }))}
                />
              </div>
            </div>
            
            <Button 
              onClick={handleUpdateActivity} 
              disabled={loading}
              className="mt-4"
            >
              {loading ? 'Updating...' : 'Update Market Activity'}
            </Button>
          </div>

          {/* Price Impact Alert */}
          {ratio > 2 || ratio < 0.5 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {ratio > 2 
                  ? 'High buy pressure detected. Consider increasing share price.'
                  : 'High sell pressure detected. Monitor for potential price adjustment.'
                }
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketActivityController;
