import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Settings,
  BarChart3,
  Shield,
  Users,
  AlertTriangle
} from 'lucide-react';

interface EnhancedSellOrderManagerProps {
  onUpdate: () => void;
}

const EnhancedSellOrderManager: React.FC<EnhancedSellOrderManagerProps> = ({ onUpdate }) => {
  const [sellOrders, setSellOrders] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [buybackFundBalance, setBuybackFundBalance] = useState<number>(0);
  const [marketProtection, setMarketProtection] = useState<any>(null);
  const [processingBatches, setProcessingBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [batchSize, setBatchSize] = useState('10');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadSellOrders(),
        loadBuybackFund(),
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

  const loadSellOrders = async () => {
    const { data, error } = await supabase
      .from('share_sell_orders')
      .select(`
        *,
        profiles!share_sell_orders_user_id_fkey(full_name, email),
        shares(name, price_per_share)
      `)
      .order('fifo_position', { ascending: true });

    if (error) throw error;
    setSellOrders(data || []);
  };

  const loadBuybackFund = async () => {
    const { data, error } = await supabase
      .from('admin_sub_wallets')
      .select('balance')
      .eq('wallet_type', 'share_buyback')
      .eq('currency', 'UGX')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    setBuybackFundBalance(data?.balance || 0);
  };

  const loadMarketProtection = async () => {
    const { data, error } = await supabase
      .from('sell_order_market_protection')
      .select('*')
      .eq('is_enabled', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    setMarketProtection(data);
  };

  const loadProcessingBatches = async () => {
    const { data, error } = await supabase
      .from('sell_order_processing_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    setProcessingBatches(data || []);
  };

  const handleProcessOrders = async (orderIds: string[], processingType: string = 'manual') => {
    try {
      setProcessing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: batchId, error } = await supabase.rpc('process_sell_orders_batch', {
        p_order_ids: orderIds,
        p_admin_id: user.id,
        p_processing_type: processingType
      });

      if (error) throw error;

      toast.success(`Successfully processed ${orderIds.length} order(s)`);
      setSelectedOrders([]);
      await loadData();
      onUpdate();
    } catch (error: any) {
      console.error('Error processing orders:', error);
      toast.error(`Failed to process orders: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchProcess = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to process');
      return;
    }

    await handleProcessOrders(selectedOrders);
  };

  const handleAutoProcess = async () => {
    // Get pending orders up to batch size
    const pendingOrders = sellOrders
      .filter(order => order.status === 'pending')
      .slice(0, parseInt(batchSize))
      .map(order => order.id);

    if (pendingOrders.length === 0) {
      toast.error('No pending orders available for auto-processing');
      return;
    }

    await handleProcessOrders(pendingOrders, 'auto');
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

  const filteredOrders = sellOrders.filter(order => 
    statusFilter === 'all' || order.status === statusFilter
  );

  const calculateTotalPayment = () => {
    return selectedOrders.reduce((total, orderId) => {
      const order = sellOrders.find(o => o.id === orderId);
      return total + (order ? order.remaining_quantity * order.requested_price : 0);
    }, 0);
  };

  if (loading) {
    return <div className="animate-pulse">Loading sell order manager...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Fund Status and Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  UGX {buybackFundBalance.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Buyback Fund</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {filteredOrders.filter(o => o.status === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">Pending Orders</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  UGX {calculateTotalPayment().toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Selected Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="orders">Orders Queue</TabsTrigger>
          <TabsTrigger value="batches">Processing Batches</TabsTrigger>
          <TabsTrigger value="protection">Market Protection</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Sell Orders Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters and Controls */}
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  
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
                    disabled={processing || selectedOrders.length === 0 || calculateTotalPayment() > buybackFundBalance}
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

              {/* Orders Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedOrders.length === filteredOrders.filter(o => o.status === 'pending').length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrders(filteredOrders.filter(o => o.status === 'pending').map(o => o.id));
                          } else {
                            setSelectedOrders([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Share</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {order.status === 'pending' && (
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
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">#{order.fifo_position}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.profiles?.full_name || 'Unknown User'}</div>
                          <div className="text-sm text-muted-foreground">{order.profiles?.email || 'No email'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.shares?.name || 'Unknown Share'}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {order.remaining_quantity.toLocaleString()}
                          {order.processed_quantity > 0 && (
                            <div className="text-xs text-muted-foreground">
                              ({order.processed_quantity.toLocaleString()} processed)
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>UGX {order.requested_price.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          UGX {(order.remaining_quantity * order.requested_price).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Processing Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                      <div className="flex items-center gap-2">
                        {marketProtection.emergency_halt_enabled ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="default">Disabled</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No market protection settings configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Processing Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {sellOrders.filter(o => o.status === 'completed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {sellOrders.filter(o => o.status === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {sellOrders.filter(o => o.status === 'partial').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Partial Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {sellOrders.filter(o => o.status === 'cancelled').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Cancelled Orders</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedSellOrderManager;