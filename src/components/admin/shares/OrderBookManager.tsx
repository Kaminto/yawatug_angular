import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Clock, DollarSign, Users, Activity } from 'lucide-react';
import { ShareOrderBook, MarketPriceToleranceSettings } from '@/types/shares';
import { ShareData } from '@/types/custom';

interface OrderBookManagerProps {
  shareData: ShareData;
}

const OrderBookManager: React.FC<OrderBookManagerProps> = ({ shareData }) => {
  const [orders, setOrders] = useState<ShareOrderBook[]>([]);
  const [toleranceSettings, setToleranceSettings] = useState<MarketPriceToleranceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'buy' | 'sell'>('all');

  useEffect(() => {
    loadOrderBook();
    loadToleranceSettings();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('order_book_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'share_order_book'
      }, () => {
        loadOrderBook();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [shareData.id]);

  const loadOrderBook = async () => {
    try {
      const { data, error } = await supabase
        .from('share_order_book')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('share_id', shareData.id)
        .in('status', ['pending', 'partial'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as ShareOrderBook[]);
    } catch (error) {
      console.error('Error loading order book:', error);
      toast.error('Failed to load order book');
    } finally {
      setLoading(false);
    }
  };

  const loadToleranceSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('market_price_tolerance_settings')
        .select('*')
        .eq('is_enabled', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setToleranceSettings(data);
    } catch (error) {
      console.error('Error loading tolerance settings:', error);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('share_order_book')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order cancelled successfully');
      loadOrderBook();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const getOrderStats = () => {
    const buyOrders = orders.filter(o => o.order_type === 'buy');
    const sellOrders = orders.filter(o => o.order_type === 'sell');
    
    const totalBuyVolume = buyOrders.reduce((sum, o) => sum + o.remaining_quantity, 0);
    const totalSellVolume = sellOrders.reduce((sum, o) => sum + o.remaining_quantity, 0);
    
    const avgBuyPrice = buyOrders.length > 0 
      ? buyOrders.reduce((sum, o) => sum + o.price_per_share, 0) / buyOrders.length 
      : 0;
    
    const avgSellPrice = sellOrders.length > 0 
      ? sellOrders.reduce((sum, o) => sum + o.price_per_share, 0) / sellOrders.length 
      : 0;

    return {
      totalBuyOrders: buyOrders.length,
      totalSellOrders: sellOrders.length,
      totalBuyVolume,
      totalSellVolume,
      avgBuyPrice,
      avgSellPrice
    };
  };

  const stats = getOrderStats();
  const filteredOrders = orders.filter(order => 
    activeFilter === 'all' || order.order_type === activeFilter
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOrderTypeBadge = (orderType: string) => {
    return orderType === 'buy' ? (
      <Badge variant="default" className="bg-green-500">
        <TrendingUp className="h-3 w-3 mr-1" />
        Buy
      </Badge>
    ) : (
      <Badge variant="destructive">
        <TrendingDown className="h-3 w-3 mr-1" />
        Sell
      </Badge>
    );
  };

  const calculatePriceDifference = (orderPrice: number, marketPrice: number) => {
    const diff = ((orderPrice - marketPrice) / marketPrice) * 100;
    return diff;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold text-green-500">{stats.totalBuyOrders}</p>
                <p className="text-xs text-muted-foreground">Buy Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold text-red-500">{stats.totalSellOrders}</p>
                <p className="text-xs text-muted-foreground">Sell Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.totalBuyVolume + stats.totalSellVolume}</p>
                <p className="text-xs text-muted-foreground">Total Volume</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{shareData.currency} {shareData.price_per_share.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Market Price</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Tolerance Settings */}
      {toleranceSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Price Tolerance Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Max Buy Discount:</span>
                <span className="ml-2 font-medium">{toleranceSettings.max_buy_discount_percent}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Sell Premium:</span>
                <span className="ml-2 font-medium">{toleranceSettings.max_sell_premium_percent}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Order Expiry:</span>
                <span className="ml-2 font-medium">{toleranceSettings.order_expiry_hours} hours</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Book */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Order Book
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('all')}
              >
                All Orders
              </Button>
              <Button
                variant={activeFilter === 'buy' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('buy')}
                className="text-green-600"
              >
                Buy Orders
              </Button>
              <Button
                variant={activeFilter === 'sell' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter('sell')}
                className="text-red-600"
              >
                Sell Orders
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Price Diff</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const priceDiff = calculatePriceDifference(order.price_per_share, shareData.price_per_share);
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{(order as any).profiles?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{(order as any).profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getOrderTypeBadge(order.order_type)}</TableCell>
                    <TableCell className="capitalize">
                      <Badge variant="outline">{order.order_method}</Badge>
                    </TableCell>
                    <TableCell>
                      {order.remaining_quantity.toLocaleString()} / {order.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {shareData.currency} {order.price_per_share.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${priceDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {shareData.currency} {order.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelOrder(order.id)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    No {activeFilter === 'all' ? '' : activeFilter} orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Average Prices */}
      {(stats.avgBuyPrice > 0 || stats.avgSellPrice > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Average Order Prices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.avgBuyPrice > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Average Buy Price</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {shareData.currency} {stats.avgBuyPrice.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {((stats.avgBuyPrice - shareData.price_per_share) / shareData.price_per_share * 100).toFixed(2)}% 
                    {stats.avgBuyPrice > shareData.price_per_share ? ' above' : ' below'} market
                  </p>
                </div>
              )}

              {stats.avgSellPrice > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="font-medium">Average Sell Price</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {shareData.currency} {stats.avgSellPrice.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {((stats.avgSellPrice - shareData.price_per_share) / shareData.price_per_share * 100).toFixed(2)}% 
                    {stats.avgSellPrice > shareData.price_per_share ? ' above' : ' below'} market
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderBookManager;