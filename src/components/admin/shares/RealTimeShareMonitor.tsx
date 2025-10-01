
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShareData } from '@/types/custom';

interface RealTimeShareMonitorProps {
  shareData: ShareData;
  onUpdate: () => void;
}

const RealTimeShareMonitor: React.FC<RealTimeShareMonitorProps> = ({ shareData, onUpdate }) => {
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [marketActivity, setMarketActivity] = useState<any>({});
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMarketData();
    
    if (isMonitoring) {
      const interval = setInterval(loadMarketData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const loadMarketData = async () => {
    try {
      // Load recent price history
      const { data: priceData, error: priceError } = await supabase
        .from('share_price_history')
        .select('*')
        .order('date', { ascending: false })
        .limit(5);
        
      if (priceError) throw priceError;
      setPriceHistory(priceData || []);

      // Load today's market activity
      const { data: activityData, error: activityError } = await supabase
        .from('market_activity_log')
        .select('*')
        .eq('activity_date', new Date().toISOString().split('T')[0])
        .maybeSingle();
        
      if (activityError && activityError.code !== 'PGRST116') throw activityError;
      setMarketActivity(activityData || {});

    } catch (error) {
      console.error('Error loading market data:', error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadMarketData();
    onUpdate();
    setLoading(false);
    toast.success('Market data refreshed');
  };

  const getPriceChange = () => {
    if (priceHistory.length < 2) return { change: 0, percentage: 0 };
    
    const current = priceHistory[0]?.price_per_share || shareData.price_per_share;
    const previous = priceHistory[1]?.price_per_share || current;
    const change = current - previous;
    const percentage = previous !== 0 ? (change / previous) * 100 : 0;
    
    return { change, percentage };
  };

  const priceChange = getPriceChange();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-Time Share Monitor
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isMonitoring ? "default" : "secondary"}>
                {isMonitoring ? "Live" : "Paused"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {shareData.currency} {shareData.price_per_share.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Current Price</div>
              {priceChange.change !== 0 && (
                <div className={`flex items-center justify-center gap-1 mt-1 ${
                  priceChange.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {priceChange.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span className="text-xs">
                    {priceChange.percentage.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {shareData.available_shares.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {marketActivity.total_buy_orders || 0}
              </div>
              <div className="text-sm text-muted-foreground">Buy Orders Today</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {marketActivity.total_sell_orders || 0}
              </div>
              <div className="text-sm text-muted-foreground">Sell Orders Today</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Market Activity</span>
              <div className="flex gap-4 text-sm">
                <span>Volume: {(marketActivity.buy_volume || 0).toLocaleString()}</span>
                <span>Volatility: {((marketActivity.price_volatility || 0) * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeShareMonitor;
