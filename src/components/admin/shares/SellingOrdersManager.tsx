import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingDown, Edit, X, DollarSign, Users, AlertCircle, Clock, MessageCircle, Calendar } from 'lucide-react';

const SellingOrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [buybackFunds, setBuybackFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [partialPayment, setPartialPayment] = useState('');
  const [communicatingWith, setCommunicatingWith] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadOrders();
    loadBuybackFunds();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      // Get sell orders with various statuses
      const { data: ordersData, error: ordersError } = await supabase
        .from('share_sell_orders')
        .select('*')
        .order('fifo_position', { ascending: true });

      if (ordersError) {
        console.error('Orders query error:', ordersError);
        throw ordersError;
      }

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Get unique user IDs and share IDs for separate queries
      const userIds = [...new Set(ordersData.map(order => order.user_id))];
      const shareIds = [...new Set(ordersData.map(order => order.share_id))];

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      // Fetch shares separately
      const { data: sharesData } = await supabase
        .from('shares')
        .select('id, name, price_per_share, currency')
        .in('id', shareIds);

      // Manually join the data
      const enrichedOrders = ordersData.map(order => ({
        ...order,
        profiles: profilesData?.find(p => p.id === order.user_id) || null,
        shares: sharesData?.find(s => s.id === order.share_id) || null
      }));

      // Apply status filter if needed
      const filteredOrders = statusFilter === 'all' 
        ? enrichedOrders 
        : enrichedOrders.filter(order => order.status === statusFilter);

      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load selling orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBuybackFunds = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_sub_wallets')
        .select('*')
        .eq('wallet_type', 'share_buyback');

      if (error) throw error;
      setBuybackFunds(data || []);
    } catch (error) {
      console.error('Error loading buyback funds:', error);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast.error('Order not found');
        return;
      }

      const { error } = await supabase
        .rpc('cancel_sell_order', { 
          p_order_id: orderId,
          p_user_id: order.user_id 
        });

      if (error) throw error;
      toast.success('Sell order cancelled successfully');
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
    }
  };

  const adjustOrder = async (orderId: string, newQuantity: number) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const newTotal = newQuantity * order.share_price;

      const { error } = await supabase
        .from('share_sell_orders')
        .update({ 
          quantity: newQuantity,
          total_sell_value: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success('Order quantity updated');
      setEditingOrder(null);
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update quantity');
    }
  };

  const processPartialPayment = async (orderId: string) => {
    if (!partialPayment || parseFloat(partialPayment) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      const order = orders.find(o => o.id === orderId);
      const paymentAmount = parseFloat(partialPayment);
      const pricePerShare = order.requested_price || 0;
      const sharesToProcess = Math.floor(paymentAmount / pricePerShare);
      const newProcessedQuantity = (order.processed_quantity || 0) + sharesToProcess;
      const newRemainingQuantity = order.quantity - newProcessedQuantity;
      const newStatus = newRemainingQuantity <= 0 ? 'completed' : 'partial';

      // Check buyback funds
      const availableFunds = buybackFunds
        .filter(fund => fund.currency === 'UGX')
        .reduce((sum, fund) => sum + fund.balance, 0);

      if (paymentAmount > availableFunds) {
        toast.error('Insufficient buyback funds for this payment');
        return;
      }

      // Update order
      const { error: orderError } = await supabase
        .from('share_sell_orders')
        .update({ 
          processed_quantity: newProcessedQuantity,
          remaining_quantity: newRemainingQuantity,
          status: newStatus,
          processed_at: newStatus === 'completed' ? new Date().toISOString() : order.processed_at
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Deduct from buyback funds
      const { error: fundError } = await supabase
        .from('admin_sub_wallets')
        .update({ 
          balance: availableFunds - paymentAmount
        })
        .eq('wallet_type', 'share_buyback')
        .eq('currency', 'UGX');

      if (fundError) throw fundError;

      toast.success(`Partial payment of UGX ${paymentAmount.toLocaleString()} processed`);
      setPartialPayment('');
      setEditingOrder(null);
      loadOrders();
      loadBuybackFunds();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process payment');
    }
  };

  const processFullOrder = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const remainingQuantity = order.remaining_quantity || order.quantity;
      const remainingAmount = remainingQuantity * (order.requested_price || 0);

      // Check buyback funds
      const availableFunds = buybackFunds
        .filter(fund => fund.currency === 'UGX')
        .reduce((sum, fund) => sum + fund.balance, 0);

      if (remainingAmount > availableFunds) {
        toast.error('Insufficient buyback funds for full payment');
        return;
      }

      // Process full payment
      const { error: orderError } = await supabase
        .from('share_sell_orders')
        .update({ 
          processed_quantity: order.quantity,
          remaining_quantity: 0,
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Deduct from buyback funds
      const { error: fundError } = await supabase
        .from('admin_sub_wallets')
        .update({ 
          balance: availableFunds - remainingAmount
        })
        .eq('wallet_type', 'share_buyback')
        .eq('currency', 'UGX');

      if (fundError) throw fundError;

      toast.success('Order completed successfully');
      loadOrders();
      loadBuybackFunds();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process order');
    }
  };

  const sendMessage = async (orderId: string) => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      // In a real implementation, this would send an SMS/email or create a notification
      toast.success('Message sent to order owner');
      setCommunicatingWith(null);
      setMessage('');
    } catch (error: any) {
      toast.error('Failed to send message');
    }
  };

  const calculateDaysInQueue = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'secondary',
      partial: 'outline',
      completed: 'default',
      cancelled: 'destructive'
    };
    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  const getOrderStats = () => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const partial = orders.filter(o => o.status === 'partial').length;
    const processing = orders.filter(o => o.status === 'processing').length;
    const totalQueueValue = orders
      .filter(o => ['pending', 'partial', 'processing'].includes(o.status))
      .reduce((sum, o) => sum + ((o.remaining_quantity || o.quantity) * (o.requested_price || 0)), 0);
    
    return { pending, partial, processing, totalQueueValue };
  };

  const stats = getOrderStats();
  const totalBuybackFunds = buybackFunds.reduce((sum, fund) => sum + fund.balance, 0);

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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold text-orange-500">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingDown className="h-4 w-4 text-blue-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold text-blue-500">{stats.processing}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold text-green-500">UGX {totalBuybackFunds.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Available Funds</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold text-red-500">UGX {stats.totalQueueValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Queue Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fund Availability Warning */}
      {stats.totalQueueValue > totalBuybackFunds && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-orange-700 dark:text-orange-300">
                  Insufficient Buyback Funds
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Queue value (UGX {stats.totalQueueValue.toLocaleString()}) exceeds available funds 
                  (UGX {totalBuybackFunds.toLocaleString()}). Shortage: UGX {(stats.totalQueueValue - totalBuybackFunds).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Selling Orders FIFO Queue
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue #</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price/Share</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Payment Progress</TableHead>
                <TableHead>Days in Queue</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const totalQuantity = order.quantity || 0;
                const processedQuantity = order.processed_quantity || 0;
                const paymentProgress = totalQuantity > 0 ? (processedQuantity / totalQuantity) * 100 : 0;
                const remainingQuantity = order.remaining_quantity || (totalQuantity - processedQuantity);
                const remainingAmount = remainingQuantity * (order.requested_price || 0);

                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Badge variant="outline">#{order.fifo_position}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{order.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{order.quantity.toLocaleString()}</TableCell>
                    <TableCell>
                      UGX {(order.share_price || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      UGX {(order.total_sell_value || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={paymentProgress} className="w-20" />
                        <p className="text-xs text-muted-foreground">
                          {processedQuantity} / {totalQuantity} shares
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{calculateDaysInQueue(order.created_at)}</span>
                        {getStatusBadge(order.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {['pending', 'partial', 'processing'].includes(order.status) && (
                          <>
                            {editingOrder?.id === order.id ? (
                              <div className="flex gap-1">
                                <Input
                                  type="number"
                                  value={partialPayment}
                                  onChange={(e) => setPartialPayment(e.target.value)}
                                  placeholder="Amount"
                                  className="w-20 h-8"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => processPartialPayment(order.id)}
                                >
                                  Pay
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingOrder(null);
                                    setPartialPayment('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : !communicatingWith && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => processFullOrder(order.id)}
                                  disabled={remainingAmount > totalBuybackFunds}
                                >
                                  Pay Full
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingOrder(order)}
                                >
                                  Partial
                                </Button>
                              </>
                            )}
                            
                            {/* Send Message */}
                            {communicatingWith?.id === order.id ? (
                              <div className="flex gap-1">
                                <Input
                                  value={message}
                                  onChange={(e) => setMessage(e.target.value)}
                                  placeholder="Message"
                                  className="w-24 h-8"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => sendMessage(order.id)}
                                >
                                  Send
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setCommunicatingWith(null);
                                    setMessage('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : !editingOrder && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCommunicatingWith(order);
                                  setMessage('');
                                }}
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {!editingOrder && !communicatingWith && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => cancelOrder(order.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No selling orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellingOrdersManager;