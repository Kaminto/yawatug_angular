import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  TrendingDown, 
  Edit, 
  X, 
  DollarSign, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  BarChart3,
  MessageCircle
} from 'lucide-react';

const UnifiedSellOrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [buybackFunds, setBuybackFunds] = useState<any[]>([]);
  const [marketProtection, setMarketProtection] = useState<any>(null);
  const [processingBatches, setProcessingBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [partialPayment, setPartialPayment] = useState('');
  const [batchSize, setBatchSize] = useState('10');
  const [communicatingWith, setCommunicatingWith] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
    
    // Real-time subscription
    const channel = supabase
      .channel('sell-orders-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'share_sell_orders' },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const loadData = async () => {
    try {
      await Promise.all([
        loadOrders(),
        loadBuybackFunds(),
        loadMarketProtection(),
        loadProcessingBatches()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('share_sell_orders')
        .select('*')
        .order('fifo_position', { ascending: true });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const userIds = [...new Set(ordersData.map(order => order.user_id))];
      const shareIds = [...new Set(ordersData.map(order => order.share_id))];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      const { data: sharesData } = await supabase
        .from('shares')
        .select('id, name, price_per_share, currency')
        .in('id', shareIds);

      const enrichedOrders = ordersData.map(order => ({
        ...order,
        profiles: profilesData?.find(p => p.id === order.user_id) || null,
        shares: sharesData?.find(s => s.id === order.share_id) || null
      }));

      const filteredOrders = statusFilter === 'all' 
        ? enrichedOrders 
        : enrichedOrders.filter(order => order.status === statusFilter);

      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load selling orders');
      setOrders([]);
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

  const loadMarketProtection = async () => {
    const { data, error } = await supabase
      .from('sell_order_market_protection')
      .select('*')
      .eq('is_enabled', true)
      .single();

    if (error && error.code !== 'PGRST116') console.error('Error loading market protection:', error);
    setMarketProtection(data);
  };

  const loadProcessingBatches = async () => {
    const { data, error } = await supabase
      .from('sell_order_processing_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) console.error('Error loading batches:', error);
    setProcessingBatches(data || []);
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast.error('Order not found');
        return;
      }

      const { error } = await supabase.rpc('cancel_sell_order', { 
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

      const availableFunds = buybackFunds
        .filter(fund => fund.currency === 'UGX')
        .reduce((sum, fund) => sum + fund.balance, 0);

      if (paymentAmount > availableFunds) {
        toast.error('Insufficient buyback funds for this payment');
        return;
      }

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
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process payment');
    }
  };

  const processFullOrder = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const remainingQuantity = order.remaining_quantity || order.quantity;
      const remainingAmount = remainingQuantity * (order.requested_price || 0);

      const availableFunds = buybackFunds
        .filter(fund => fund.currency === 'UGX')
        .reduce((sum, fund) => sum + fund.balance, 0);

      if (remainingAmount > availableFunds) {
        toast.error('Insufficient buyback funds for full payment');
        return;
      }

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

      const { error: fundError } = await supabase
        .from('admin_sub_wallets')
        .update({ 
          balance: availableFunds - remainingAmount
        })
        .eq('wallet_type', 'share_buyback')
        .eq('currency', 'UGX');

      if (fundError) throw fundError;

      toast.success('Order completed successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process order');
    }
  };

  const handleBatchProcess = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to process');
      return;
    }

    try {
      setProcessing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: batchId, error } = await supabase.rpc('process_sell_orders_batch', {
        p_order_ids: selectedOrders,
        p_admin_id: user.id,
        p_processing_type: 'manual'
      });

      if (error) throw error;

      toast.success(`Successfully processed ${selectedOrders.length} order(s)`);
      setSelectedOrders([]);
      await loadData();
    } catch (error: any) {
      console.error('Error processing orders:', error);
      toast.error(`Failed to process orders: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoProcess = async () => {
    const pendingOrders = orders
      .filter(order => order.status === 'pending')
      .slice(0, parseInt(batchSize))
      .map(order => order.id);

    if (pendingOrders.length === 0) {
      toast.error('No pending orders available for auto-processing');
      return;
    }

    try {
      setProcessing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('process_sell_orders_batch', {
        p_order_ids: pendingOrders,
        p_admin_id: user.id,
        p_processing_type: 'auto'
      });

      if (error) throw error;

      toast.success(`Successfully processed ${pendingOrders.length} order(s)`);
      await loadData();
    } catch (error: any) {
      toast.error(`Failed to process orders: ${error.message}`);
    } finally {
      setProcessing(false);
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
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'partial':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  const calculateTotalPayment = () => {
    return selectedOrders.reduce((total, orderId) => {
      const order = orders.find(o => o.id === orderId);
      return total + (order ? (order.remaining_quantity || order.quantity) * (order.requested_price || 0) : 0);
    }, 0);
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

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="queue">Queue Management</TabsTrigger>
          <TabsTrigger value="batch">Batch Processing</TabsTrigger>
          <TabsTrigger value="protection">Market Protection</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const totalQuantity = order.quantity || 0;
                    const processedQuantity = order.processed_quantity || 0;
                    const paymentProgress = totalQuantity > 0 ? (processedQuantity / totalQuantity) * 100 : 0;
                    const remainingQuantity = order.remaining_quantity || (totalQuantity - processedQuantity);

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
                        <TableCell>UGX {(order.share_price || 0).toLocaleString()}</TableCell>
                        <TableCell>UGX {(order.total_sell_value || 0).toLocaleString()}</TableCell>
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
                                      className="w-24 h-7 text-xs"
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => processPartialPayment(order.id)}
                                      className="h-7"
                                    >
                                      Pay
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingOrder(null);
                                        setPartialPayment('');
                                      }}
                                      className="h-7"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => processFullOrder(order.id)}
                                      className="h-7"
                                    >
                                      Full
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingOrder(order)}
                                      className="h-7"
                                    >
                                      Partial
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => cancelOrder(order.id)}
                                      className="h-7"
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Batch Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                  <Input
                    className="w-32"
                    placeholder="Batch size"
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    type="number"
                    min="1"
                    max="100"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleBatchProcess}
                    disabled={processing || selectedOrders.length === 0 || calculateTotalPayment() > totalBuybackFunds}
                  >
                    Process Selected ({selectedOrders.length})
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleAutoProcess}
                    disabled={processing}
                  >
                    Auto Process ({batchSize})
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedOrders.length === orders.filter(o => o.status === 'pending').length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrders(orders.filter(o => o.status === 'pending').map(o => o.id));
                          } else {
                            setSelectedOrders([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.filter(o => o.status === 'pending').map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOrders([...selectedOrders, order.id]);
                            } else {
                              setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">#{order.fifo_position}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.profiles?.full_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{order.profiles?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order.remaining_quantity.toLocaleString()}</TableCell>
                      <TableCell>UGX {((order.remaining_quantity || order.quantity) * (order.requested_price || 0)).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Recent Processing Batches</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Reference</TableHead>
                      <TableHead>Orders Count</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processingBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono">{batch.batch_reference}</TableCell>
                        <TableCell>{batch.orders_count}</TableCell>
                        <TableCell>UGX {batch.total_value.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                        <TableCell>{new Date(batch.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="protection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Market Protection Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {marketProtection ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Max Price Drop %</label>
                      <div className="text-lg">{marketProtection.max_price_drop_percentage}%</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Daily Volume Limit</label>
                      <div className="text-lg">{marketProtection.daily_volume_limit.toLocaleString()} shares</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Weekly Volume Limit</label>
                      <div className="text-lg">{marketProtection.weekly_volume_limit.toLocaleString()} shares</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Auto-Processing Threshold</label>
                      <div className="text-lg">UGX {marketProtection.auto_processing_fund_threshold.toLocaleString()}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max Daily Auto-Processing</label>
                      <div className="text-lg">UGX {marketProtection.max_daily_auto_processing_amount.toLocaleString()}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Emergency Halt</label>
                      <Badge variant={marketProtection.emergency_halt ? "destructive" : "default"}>
                        {marketProtection.emergency_halt ? 'ACTIVE' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No market protection settings configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Order Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Processing Time</p>
                  <p className="text-2xl font-bold">2-3 days</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Orders Processed</p>
                  <p className="text-2xl font-bold">{processingBatches.reduce((sum, b) => sum + b.orders_count, 0)}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Value Processed</p>
                  <p className="text-2xl font-bold">
                    UGX {processingBatches.reduce((sum, b) => sum + b.total_value, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedSellOrdersManager;
