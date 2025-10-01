import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  TrendingDown, 
  ArrowRightLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  MessageCircle,
  AlertTriangle,
  UserCheck,
  Eye,
  Filter,
  RefreshCw,
  BarChart3,
  Calendar,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useOrderCounts } from '@/hooks/useOrderCounts';
import { format } from 'date-fns';
import EditSellOrderDialog from './EditSellOrderDialog';

interface EnhancedOrdersManagementProps {
  userId: string;
  shareBookings: any[];
  pendingTransfers: any[];
  onOrderUpdate: () => void;
  userWallets: any[];
}

const EnhancedOrdersManagement: React.FC<EnhancedOrdersManagementProps> = ({
  userId,
  shareBookings,
  pendingTransfers,
  onOrderUpdate,
  userWallets
}) => {
  const { isAdmin } = useAdminPermissions();
  const { buyingOrders, sellingOrders, transferRequests, loading: countsLoading } = useOrderCounts();
  
  const [activeTab, setActiveTab] = useState('buy-orders');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [showAdminView, setShowAdminView] = useState(false);

  // Split orders by type
  const buyOrders = shareBookings.filter(b => b.type === 'buy');
  const sellOrders = shareBookings.filter(b => b.type === 'sell');
  
  // Debug logging
  console.log('shareBookings:', shareBookings);
  console.log('buyOrders:', buyOrders);
  console.log('sellOrders:', sellOrders);

  useEffect(() => {
    if (isAdmin && showAdminView) {
      loadAdminOrders();
    }
  }, [isAdmin, showAdminView, activeTab]);

  const loadAdminOrders = async () => {
    try {
      setLoading(true);
      let query;
      
      switch (activeTab) {
        case 'buy-orders':
          query = supabase
            .from('share_purchase_orders')
            .select(`
              *,
              profiles:user_id (id, full_name, email, phone),
              shares:share_id (id, name, price_per_share, currency)
            `)
            .order('created_at', { ascending: false });
          break;
        case 'sell-orders':
          query = supabase
            .from('share_sell_orders')
            .select(`
              *,
              profiles:user_id (id, full_name, email, phone),
              shares:share_id (id, name, price_per_share)
            `)
            .order('created_at', { ascending: false });
          break;
        case 'transfers':
          query = supabase
            .from('share_transfer_requests')
            .select(`
              *,
              sender:sender_id (id, full_name, email),
              recipient:recipient_id (id, full_name, email)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
          break;
        default:
          return;
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setAdminOrders(data || []);
    } catch (error) {
      console.error('Error loading admin orders:', error);
      toast.error('Failed to load admin orders');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAction = async (orderId: string, action: string, additionalData?: any) => {
    try {
      setLoading(true);
      
      switch (action) {
        case 'cancel_buy':
          await supabase
            .from('share_purchase_orders')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('id', orderId);
          break;
          
        case 'cancel_sell':
          await supabase.rpc('cancel_sell_order', {
            p_order_id: orderId,
            p_user_id: userId,
            p_reason: 'User cancellation'
          });
          break;
          
        case 'approve_transfer':
          await supabase
            .from('share_transfer_requests')
            .update({ 
              status: 'approved',
              completed_at: new Date().toISOString() 
            })
            .eq('id', orderId);
          break;
          
        case 'reject_transfer':
          await supabase
            .from('share_transfer_requests')
            .update({ 
              status: 'rejected',
              completed_at: new Date().toISOString(),
              reason: additionalData?.reason
            })
            .eq('id', orderId);
          break;
          
        case 'extend_grace':
          const newGraceDate = new Date();
          newGraceDate.setDate(newGraceDate.getDate() + (additionalData?.days || 7));
          
          await supabase
            .from('share_purchase_orders')
            .update({
              grace_period_deadline: newGraceDate.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);
          break;
      }
      
      toast.success('Action completed successfully');
      onOrderUpdate();
      if (showAdminView) loadAdminOrders();
    } catch (error: any) {
      console.error('Error processing action:', error);
      toast.error(error.message || 'Failed to process action');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, type?: string) => {
    const variants: Record<string, { variant: any; color: string }> = {
      pending: { variant: 'secondary', color: 'bg-yellow-100 text-yellow-700' },
      approved: { variant: 'default', color: 'bg-blue-100 text-blue-700' },
      completed: { variant: 'default', color: 'bg-green-100 text-green-700' },
      cancelled: { variant: 'outline', color: 'bg-gray-100 text-gray-500' },
      rejected: { variant: 'destructive', color: 'bg-red-100 text-red-700' },
      partially_paid: { variant: 'outline', color: 'bg-blue-100 text-blue-700' },
      active: { variant: 'default', color: 'bg-orange-100 text-orange-700' }
    };
    
    const config = variants[status] || variants.pending;
    return (
      <Badge className={config.color}>
        {status === 'partially_paid' ? 'In Progress' : status}
      </Badge>
    );
  };

  const calculateProgress = (order: any) => {
    if (order.type === 'buy') {
      const totalQuantity = order.quantity || 0;
      const processedQuantity = order.processed_quantity || 0;
      return totalQuantity > 0 ? (processedQuantity / totalQuantity) * 100 : 0;
    }
    if (order.type === 'sell') {
      const totalQuantity = order.quantity || 0;
      const processedQuantity = order.processed_quantity || 0;
      return totalQuantity > 0 ? (processedQuantity / totalQuantity) * 100 : 0;
    }
    return 0;
  };

  const renderUserOrderCard = (order: any, isSell = false) => {
    const progress = isSell 
      ? ((order.processed_quantity || 0) / order.quantity) * 100 
      : calculateProgress(order);
    
    const isProcessing = isSell && order.status === 'processing';
    const canEdit = order.status === 'pending';
    const canCancel = order.status === 'pending' || (isSell && order.processed_quantity === 0);

    return (
      <Card key={order.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSell ? (
                <TrendingDown className="h-5 w-5 text-red-600" />
              ) : (
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              )}
              <div>
                <h4 className="font-semibold">{order?.shares?.name || 'Yawatu Ordinary Shares'}</h4>
                <p className="text-sm text-muted-foreground">
                  {order.quantity?.toLocaleString()} shares • UGX {(order.price_per_share || order.booked_price_per_share || order.requested_price || 0).toLocaleString()}
                </p>
                {isSell && order.fifo_position && (
                  <p className="text-xs text-blue-600">Queue Position: #{order.fifo_position}</p>
                )}
              </div>
            </div>
            {getStatusBadge(order.status)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Progress bar for processing */}
          {(isSell && isProcessing) || (!isSell && (order.status === 'active' || order.status === 'partially_paid')) ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{isSell ? 'Processing Progress' : 'Payment Progress'}</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {isSell && (
                <div className="text-xs text-muted-foreground">
                  {order.processed_quantity || 0} of {order.quantity} shares processed
                </div>
              )}
            </div>
          ) : null}
          
          {/* Order details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Value:</span>
              <p>UGX {(order.total_amount || order.total_sell_value || order.net_proceeds || 0).toLocaleString()}</p>
            </div>
            <div>
              <span className="font-medium">Created:</span>
              <p>{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
            </div>
          </div>
          
          {/* Sell order specific details */}
          {isSell && (
            <div className="grid grid-cols-2 gap-4 text-sm border-t pt-2">
              <div>
                <span className="font-medium">Order Type:</span>
                <p className="capitalize">{order.order_type || 'market'}</p>
              </div>
              <div>
                <span className="font-medium">Remaining:</span>
                <p>{(order.remaining_quantity || order.quantity).toLocaleString()} shares</p>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {canEdit && isSell && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedOrder(order)}
                disabled={loading}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit Quantity
              </Button>
            )}
            
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOrderAction(order.id, isSell ? 'cancel_sell' : 'cancel_buy')}
                disabled={loading}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel Order
              </Button>
            )}
            
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-1" />
                  Details
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isSell ? 'Sell' : 'Buy'} Order Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Order ID:</span>
                      <p className="text-sm font-mono">{order.id}</p>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <div className="mt-1">{getStatusBadge(order.status)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium">Share Details:</span>
                    <p className="text-sm">{order?.shares?.name || 'Yawatu Ordinary Shares'}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.quantity?.toLocaleString()} shares @ UGX {(order.price_per_share || order.booked_price_per_share || order.requested_price || 0).toLocaleString()}
                    </p>
                  </div>
                  
                  {isSell && (
                    <>
                      <div>
                        <span className="font-medium">Queue Information:</span>
                        <p className="text-sm">Position: #{order.fifo_position || 'N/A'}</p>
                        <p className="text-sm">Expected proceeds: UGX {(order.net_proceeds || 0).toLocaleString()}</p>
                      </div>
                      
                      {order.processing_notes && (
                        <div>
                          <span className="font-medium">Processing Notes:</span>
                          <p className="text-sm">{order.processing_notes}</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {order.reason && (
                    <div>
                      <span className="font-medium">Notes:</span>
                      <p className="text-sm">{order.reason}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAdminTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adminOrders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{order.profiles?.full_name || order.sender?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.profiles?.email || order.sender?.email}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="text-sm">{order.quantity?.toLocaleString()} shares</p>
                  <p className="text-xs text-muted-foreground">
                    @ UGX {(order.price_per_share || order.booked_price_per_share || order.requested_price || 0).toLocaleString()}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                UGX {(order.total_amount || order.total_sell_value || (order.quantity * (order.price_per_share || 0))).toLocaleString()}
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              <TableCell>
                {format(new Date(order.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {activeTab === 'transfers' && order.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleOrderAction(order.id, 'approve_transfer')}
                        disabled={loading}
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOrderAction(order.id, 'reject_transfer', { reason: 'Admin rejection' })}
                        disabled={loading}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  
                  {activeTab === 'buy-orders' && order.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOrderAction(order.id, 'extend_grace', { days: 7 })}
                      disabled={loading}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Extend
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with stats and admin toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order Management</h2>
        
        <div className="flex items-center gap-4">
          {/* Order counts */}
          {!countsLoading && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Badge variant="secondary">{buyingOrders}</Badge>
                <span>Buy Orders</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary">{sellingOrders}</Badge>
                <span>Sell Orders</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary">{transferRequests}</Badge>
                <span>Transfers</span>
              </div>
            </div>
          )}
          
          {/* Admin toggle */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant={showAdminView ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAdminView(!showAdminView)}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                {showAdminView ? 'User View' : 'Admin View'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Admin filters */}
      {showAdminView && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => showAdminView && loadAdminOrders()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="buy-orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Buy Orders ({buyOrders.length})
          </TabsTrigger>
          <TabsTrigger value="sell-orders" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Sell Orders ({sellOrders.length})
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transfers ({pendingTransfers.length})
          </TabsTrigger>
        </TabsList>

        {/* Buy Orders */}
        <TabsContent value="buy-orders" className="space-y-4">
          {showAdminView ? (
            <Card>
              <CardHeader>
                <CardTitle>Buy Orders - Admin View</CardTitle>
              </CardHeader>
              <CardContent>
                {renderAdminTable()}
              </CardContent>
            </Card>
          ) : (
            <>
              {buyOrders.length > 0 ? (
                <div className="space-y-4">
                  {buyOrders.map(order => renderUserOrderCard(order, false))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Buy Orders</h3>
                    <p className="text-muted-foreground">You haven't placed any share purchase orders yet.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Sell Orders */}
        <TabsContent value="sell-orders" className="space-y-4">
          {showAdminView ? (
            <Card>
              <CardHeader>
                <CardTitle>Sell Orders - Admin View</CardTitle>
              </CardHeader>
              <CardContent>
                {renderAdminTable()}
              </CardContent>
            </Card>
          ) : (
            <>
              {sellOrders.length > 0 ? (
                <div className="space-y-4">
                  {sellOrders.map(order => renderUserOrderCard(order, true))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <TrendingDown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Sell Orders Found</h3>
                    <p className="text-muted-foreground">
                      {shareBookings.length > 0 
                        ? `Found ${shareBookings.length} total bookings, but none are marked as sell orders.`
                        : "You haven't placed any share sell orders yet."
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Edit Order Dialog */}
              <EditSellOrderDialog
                open={!!selectedOrder}
                onOpenChange={(open) => !open && setSelectedOrder(null)}
                order={selectedOrder}
                onOrderUpdated={() => {
                  onOrderUpdate();
                  setSelectedOrder(null);
                }}
              />
            </>
          )}
        </TabsContent>

        {/* Transfers */}
        <TabsContent value="transfers" className="space-y-4">
          {showAdminView ? (
            <Card>
              <CardHeader>
                <CardTitle>Transfer Requests - Admin View</CardTitle>
              </CardHeader>
              <CardContent>
                {renderAdminTable()}
              </CardContent>
            </Card>
          ) : (
            <>
              {pendingTransfers.length > 0 ? (
                <div className="space-y-4">
                  {pendingTransfers.map(transfer => (
                    <Card key={transfer.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                            <div>
                              <h4 className="font-semibold">
                                {transfer.transfer_type === 'outgoing' ? 'Transfer Out' : 'Transfer In'}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {transfer.quantity?.toLocaleString()} shares
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(transfer.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm">
                            <span className="font-medium">
                              {transfer.transfer_type === 'outgoing' ? 'To:' : 'From:'}
                            </span>{' '}
                            {transfer.transfer_type === 'outgoing' 
                              ? transfer.recipient_email 
                              : transfer.sender_email}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Requested:</span>{' '}
                            {format(new Date(transfer.created_at), 'MMM d, yyyy')}
                          </p>
                          {transfer.notes && (
                            <p className="text-sm">
                              <span className="font-medium">Notes:</span> {transfer.notes}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Pending Transfers</h3>
                    <p className="text-muted-foreground">You have no share transfer requests pending approval.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Info alerts */}
      {!showAdminView && (
        <div className="space-y-4">
          {activeTab === 'buy-orders' && buyOrders.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Buy Order Tips:</strong> You can cancel pending orders before payment. 
                Installment payments can be made through your wallet. Orders auto-expire if not completed in time.
              </AlertDescription>
            </Alert>
          )}
          
          {activeTab === 'sell-orders' && sellOrders.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Sell Order Info:</strong> Orders are processed in FIFO order. 
                You can edit or cancel pending orders. Payment depends on available buyback fund.
              </AlertDescription>
            </Alert>
          )}
          
          {activeTab === 'transfers' && pendingTransfers.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Transfer Status:</strong> Transfer requests require admin approval for security. 
                You'll be notified once your request is processed.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedOrdersManagement;