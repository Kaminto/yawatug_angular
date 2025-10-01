import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Users, Clock } from 'lucide-react';
interface MarketDepthIndicatorProps {
  shareId?: string;
}
const MarketDepthIndicator: React.FC<MarketDepthIndicatorProps> = ({
  shareId
}) => {
  const [marketData, setMarketData] = useState({
    totalBuyOrders: 0,
    totalSellOrders: 0,
    avgOrderSize: 0,
    marketActivity: 'low' as 'low' | 'medium' | 'high',
    pendingVolume: 0,
    processingTime: '2-3 hours'
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadMarketDepth();
    // Set up real-time updates
    const interval = setInterval(loadMarketDepth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [shareId]);
  const loadMarketDepth = async () => {
    try {
      setLoading(true);

      // Load pending buy orders (purchase orders)
      let buyQuery = supabase
        .from('share_purchase_orders')
        .select('quantity, total_amount, share_id')
        .in('status', ['pending', 'partial']);
      if (shareId) buyQuery = buyQuery.eq('share_id', shareId);
      const { data: buyOrders, error: buyError } = await buyQuery;
      if (buyError) throw buyError;

      // Load pending sell orders (user sell orders)
      let sellQuery = supabase
        .from('share_sell_orders')
        .select('quantity, remaining_quantity, requested_price, share_id')
        .in('status', ['pending', 'partial']);
      if (shareId) sellQuery = sellQuery.eq('share_id', shareId);
      const { data: sellOrders, error: sellError } = await sellQuery;
      if (sellError) throw sellError;

      // Calculate metrics
      const totalBuyOrders = buyOrders?.length || 0;
      const totalSellOrders = sellOrders?.length || 0;
      const totalOrders = totalBuyOrders + totalSellOrders;
      const buyVolume = buyOrders?.reduce((sum, order) => sum + order.quantity, 0) || 0;
      const sellVolume = sellOrders?.reduce((sum, order: any) => sum + (order.remaining_quantity ?? order.quantity ?? 0), 0) || 0;
      const totalVolume = buyVolume + sellVolume;
      const avgOrderSize = totalOrders > 0 ? Math.round(totalVolume / totalOrders) : 0;

      // Determine market activity level
      let activityLevel: 'low' | 'medium' | 'high' = 'low';
      if (totalOrders > 10) activityLevel = 'high';else if (totalOrders > 5) activityLevel = 'medium';

      // Estimate processing time based on queue
      let processingTime = '2-3 hours';
      if (totalOrders > 20) processingTime = '4-6 hours';else if (totalOrders > 10) processingTime = '3-4 hours';else if (totalOrders < 3) processingTime = '1-2 hours';
      setMarketData({
        totalBuyOrders,
        totalSellOrders,
        avgOrderSize,
        marketActivity: activityLevel,
        pendingVolume: totalVolume,
        processingTime
      });
    } catch (error) {
      console.error('Error loading market depth:', error);
    } finally {
      setLoading(false);
    }
  };
  const getActivityColor = (activity: string) => {
    switch (activity) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  const buyPercentage = marketData.totalBuyOrders + marketData.totalSellOrders > 0 ? marketData.totalBuyOrders / (marketData.totalBuyOrders + marketData.totalSellOrders) * 100 : 50;
  if (loading) {
    return <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading market data...</div>
        </CardContent>
      </Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Market Depth</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Activity</span>
          </div>
          <Badge className={getActivityColor(marketData.marketActivity)}>
            {marketData.marketActivity.toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Buy Orders</span>
            <span>{marketData.totalBuyOrders}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Sell Orders</span>
            <span>{marketData.totalSellOrders}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Pending Volume</span>
            <span>{marketData.pendingVolume.toLocaleString()} shares</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Avg Order Size</span>
            <span>{marketData.avgOrderSize.toLocaleString()} shares</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Buy vs Sell</span>
            <span>{Math.round(buyPercentage)}% Buy</span>
          </div>
          <Progress value={buyPercentage} />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Estimated processing time: {marketData.processingTime}</span>
        </div>
      </CardContent>
    </Card>
  );
};
export default MarketDepthIndicator;