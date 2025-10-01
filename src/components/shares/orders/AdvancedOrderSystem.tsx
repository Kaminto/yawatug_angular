import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  Calendar as CalendarIcon,
  Repeat,
  Edit3,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/dateFormatter';
import { toast } from 'sonner';

interface AdvancedOrderSystemProps {
  sharePool: any;
  userShares: any[];
  userId: string;
  onOrderComplete: () => void;
}

const AdvancedOrderSystem: React.FC<AdvancedOrderSystemProps> = ({ 
  sharePool, 
  userShares, 
  userId, 
  onOrderComplete 
}) => {
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [orderForm, setOrderForm] = useState({
    type: 'market', // market, limit, stop_loss
    action: 'buy',
    quantity: '',
    price: '',
    stopPrice: '',
    expiryDate: null as Date | null,
    recurring: false,
    recurringPeriod: 'monthly',
    autoReinvest: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActiveOrders();
  }, [userId]);

  const loadActiveOrders = async () => {
    try {
      // Load advanced orders from a hypothetical advanced_orders table
      // For now, we'll use the existing tables and enhance them
      const { data: purchaseOrders } = await supabase
        .from('share_purchase_orders')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'partial']);

      const { data: sellOrders } = await supabase
        .from('share_buyback_orders')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'partial']);

      const combinedOrders = [
        ...(purchaseOrders || []).map(order => ({ ...order, action: 'buy' })),
        ...(sellOrders || []).map(order => ({ ...order, action: 'sell' }))
      ];

      setActiveOrders(combinedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const handleSubmitOrder = async () => {
    if (!orderForm.quantity || !userId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        user_id: userId,
        share_id: sharePool?.id,
        quantity: parseInt(orderForm.quantity),
        order_type: orderForm.type,
        price_per_share: orderForm.price ? parseFloat(orderForm.price) : sharePool?.price_per_share,
        stop_price: orderForm.stopPrice ? parseFloat(orderForm.stopPrice) : null,
        expires_at: orderForm.expiryDate?.toISOString(),
        is_recurring: orderForm.recurring,
        recurring_period: orderForm.recurringPeriod,
        auto_reinvest: orderForm.autoReinvest,
        status: orderForm.type === 'market' ? 'pending' : 'scheduled'
      };

      if (orderForm.action === 'buy') {
        const { error } = await supabase
          .from('share_purchase_orders')
          .insert([{
            ...orderData,
            total_amount: orderData.quantity * orderData.price_per_share,
            currency: 'UGX'
          }]);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('share_buyback_orders')
          .insert([{
            ...orderData,
            requested_price: orderData.price_per_share
          }]);
        
        if (error) throw error;
      }

      toast.success('Advanced order placed successfully');
      setOrderForm({
        type: 'market',
        action: 'buy',
        quantity: '',
        price: '',
        stopPrice: '',
        expiryDate: null,
        recurring: false,
        recurringPeriod: 'monthly',
        autoReinvest: false
      });
      onOrderComplete();
      loadActiveOrders();
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string, action: string) => {
    try {
      const tableName = action === 'buy' ? 'share_purchase_orders' : 'share_buyback_orders';
      const { error } = await supabase
        .from(tableName)
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success('Order cancelled successfully');
      loadActiveOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'market': return 'bg-blue-100 text-blue-800';
      case 'limit': return 'bg-green-100 text-green-800';
      case 'stop_loss': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Order</TabsTrigger>
          <TabsTrigger value="active">Active Orders</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Order Creation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order Type</Label>
                  <Select value={orderForm.type} onValueChange={(value) => setOrderForm(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">Market Order</SelectItem>
                      <SelectItem value="limit">Limit Order</SelectItem>
                      <SelectItem value="stop_loss">Stop Loss</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={orderForm.action} onValueChange={(value) => setOrderForm(prev => ({ ...prev, action: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    placeholder="Number of shares"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>

                {orderForm.type !== 'market' && (
                  <div className="space-y-2">
                    <Label>Price per Share (UGX)</Label>
                    <Input
                      type="number"
                      placeholder="Price per share"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                )}

                {orderForm.type === 'stop_loss' && (
                  <div className="space-y-2">
                    <Label>Stop Price (UGX)</Label>
                    <Input
                      type="number"
                      placeholder="Stop price"
                      value={orderForm.stopPrice}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, stopPrice: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Expiry Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {orderForm.expiryDate ? formatDate(orderForm.expiryDate.toISOString()) : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={orderForm.expiryDate}
                        onSelect={(date) => setOrderForm(prev => ({ ...prev, expiryDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={orderForm.recurring}
                    onCheckedChange={(checked) => setOrderForm(prev => ({ ...prev, recurring: checked }))}
                  />
                  <Label>Recurring Order</Label>
                </div>

                {orderForm.recurring && (
                  <div className="space-y-2">
                    <Label>Recurring Period</Label>
                    <Select value={orderForm.recurringPeriod} onValueChange={(value) => setOrderForm(prev => ({ ...prev, recurringPeriod: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={orderForm.autoReinvest}
                    onCheckedChange={(checked) => setOrderForm(prev => ({ ...prev, autoReinvest: checked }))}
                  />
                  <Label>Auto-reinvest Dividends</Label>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Advanced orders are subject to market conditions and may not execute immediately.
                  Stop-loss orders help limit potential losses.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleSubmitOrder} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Placing Order...' : 'Place Advanced Order'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {activeOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active orders
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {order.action === 'buy' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <div>
                            <div className="font-medium capitalize">
                              {order.action} {order.quantity?.toLocaleString()} shares
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.action === 'buy' ? 
                                `Total: UGX ${order.total_amount?.toLocaleString()}` :
                                `Price: UGX ${order.requested_price?.toLocaleString()}`
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getOrderTypeColor(order.order_type || 'market')}>
                            {order.order_type || 'market'}
                          </Badge>
                          <Badge variant="outline">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCancelOrder(order.id, order.action)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                Scheduled & Recurring Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Scheduled orders will appear here when market conditions are met
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedOrderSystem;