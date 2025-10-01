import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Package, DollarSign, TrendingUp } from 'lucide-react';
import { useContextualData } from '@/hooks/useContextualData';

interface SellOrderInfo {
  queuePosition: number;
  quantity: number;
  totalValue: number;
  filledQuantity: number;
  estimatedWaitDays: number;
  status: string;
}

const QueueStatusIndicator: React.FC = () => {
  const { effectiveUserId } = useContextualData();
  const [sellOrder, setSellOrder] = useState<SellOrderInfo | null>(null);
  const [buybackFunds, setBuybackFunds] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (effectiveUserId) {
      loadUserSellOrder();
      loadBuybackFunds();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        loadUserSellOrder();
        loadBuybackFunds();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [effectiveUserId]);

  const loadUserSellOrder = async () => {
    try {
      // Get user's active sell order
      const { data: userOrder, error: orderError } = await supabase
        .from('share_sell_orders')
        .select('fifo_position, quantity, total_sell_value, remaining_quantity, status')
        .eq('user_id', effectiveUserId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (orderError) throw orderError;

      if (userOrder) {
        // Get queue info to calculate wait time
        const { data: queueOrders, error: queueError } = await supabase
          .from('share_sell_orders')
          .select('total_sell_value, fifo_position')
          .eq('status', 'pending')
          .lt('fifo_position', userOrder.fifo_position)
          .order('fifo_position', { ascending: true });

        if (queueError) throw queueError;

        const ordersAhead = queueOrders || [];
        const totalValueAhead = ordersAhead.reduce((sum, order) => sum + (order.total_sell_value || 0), 0);

        const estimatedDays = calculateSmartWaitTime(totalValueAhead, userOrder.total_sell_value);

        const filledQuantity = userOrder.quantity - (userOrder.remaining_quantity || userOrder.quantity);

        setSellOrder({
          queuePosition: userOrder.fifo_position,
          quantity: userOrder.quantity,
          totalValue: userOrder.total_sell_value,
          filledQuantity: filledQuantity,
          estimatedWaitDays: estimatedDays,
          status: userOrder.status
        });
      } else {
        setSellOrder(null);
      }
    } catch (error) {
      console.error('Error loading sell order:', error);
      setSellOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const loadBuybackFunds = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_sub_wallets')
        .select('balance')
        .eq('wallet_type', 'share_buyback')
        .eq('currency', 'UGX')
        .maybeSingle();

      if (error) throw error;
      setBuybackFunds(data?.balance || 0);
    } catch (error) {
      console.error('Error loading buyback funds:', error);
      setBuybackFunds(0);
    }
  };

  const calculateSmartWaitTime = (totalValueAhead: number, userOrderValue: number): number => {
    // Sensitivity analysis: Dynamic wait time based on fund availability
    const totalRequiredFunds = totalValueAhead + userOrderValue;
    
    if (buybackFunds >= totalRequiredFunds) {
      // Funds fully available: 3 days processing time
      return 3;
    } else if (buybackFunds >= totalValueAhead) {
      // Funds available for orders ahead: 3-7 days
      const partialCoverage = buybackFunds / totalRequiredFunds;
      return Math.round(3 + (7 - 3) * (1 - partialCoverage));
    } else if (buybackFunds > 0) {
      // Partial funds available: 7-30 days based on coverage
      const coverage = buybackFunds / totalRequiredFunds;
      return Math.round(7 + (30 - 7) * (1 - coverage));
    } else {
      // No funds available: 30 days
      return 30;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sellOrder) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">FIFO Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            No active sell orders in queue
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">FIFO Queue Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Queue Position */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Queue Position:</span>
          </div>
          <span className="text-lg font-semibold">#{sellOrder.queuePosition}</span>
        </div>

        {/* Sell Order */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span className="text-sm">Sell Order:</span>
          </div>
          <span className="font-medium">{sellOrder.quantity} shares</span>
        </div>

        {/* Sell Value */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Sell Value:</span>
          </div>
          <span className="font-medium">UGX {sellOrder.totalValue.toLocaleString()}</span>
        </div>

        {/* Sell Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Sell Status:</span>
          </div>
          <span className="font-medium">{sellOrder.filledQuantity}/{sellOrder.quantity} shares</span>
        </div>

        {/* Estimated Wait */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Estimated wait:</span>
          </div>
          <span className="text-lg font-semibold text-primary">
            {sellOrder.estimatedWaitDays} {sellOrder.estimatedWaitDays === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Info Note */}
        <div className="text-xs text-muted-foreground pt-2">
          {buybackFunds >= sellOrder.totalValue 
            ? '✓ Funds available for processing'
            : '⏳ Waiting for fund availability'
          }
        </div>
      </CardContent>
    </Card>
  );
};

export default QueueStatusIndicator;