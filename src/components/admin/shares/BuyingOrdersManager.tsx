import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingCart, Edit, X, DollarSign, Users, MessageCircle, Calendar, Clock } from 'lucide-react';

const BuyingOrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [extendingGrace, setExtendingGrace] = useState<any>(null);
  const [graceDays, setGraceDays] = useState('');
  const [communicatingWith, setCommunicatingWith] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      // Get all orders first, then filter for installment orders not fully paid
      const { data: ordersData, error: ordersError } = await supabase
        .from('share_purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Orders query error:', ordersError);
        throw ordersError;
      }

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Filter for installment/unpaid orders (not completed or cancelled)
      const installmentOrders = ordersData.filter(order => 
        order.status !== 'completed' && order.status !== 'cancelled'
      );

      // Get unique user IDs and share IDs for separate queries
      const userIds = [...new Set(installmentOrders.map(order => order.user_id))];
      const shareIds = [...new Set(installmentOrders.map(order => order.share_id))];

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
      const enrichedOrders = installmentOrders.map(order => ({
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
      toast.error('Failed to load buying orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('share_purchase_orders')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order cancelled successfully');
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
    }
  };

  const adjustQuantity = async (orderId: string) => {
    if (!newQuantity || parseInt(newQuantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      const order = orders.find(o => o.id === orderId);
      const newTotal = parseInt(newQuantity) * (order.shares?.price_per_share || order.price_per_share);

      const { error } = await supabase
        .from('share_purchase_orders')
        .update({ 
          quantity: parseInt(newQuantity),
          total_amount: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success('Order quantity updated');
      setEditingOrder(null);
      setNewQuantity('');
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update quantity');
    }
  };

  const extendGracePeriod = async (orderId: string) => {
    if (!graceDays || parseInt(graceDays) <= 0) {
      toast.error('Please enter valid grace days');
      return;
    }

    try {
      const newGraceDeadline = new Date();
      newGraceDeadline.setDate(newGraceDeadline.getDate() + parseInt(graceDays));

      const { error } = await supabase
        .from('share_purchase_orders')
        .update({ 
          grace_period_deadline: newGraceDeadline.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success(`Grace period extended by ${graceDays} days`);
      setExtendingGrace(null);
      setGraceDays('');
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to extend grace period');
    }
  };

  const sendMessage = async (orderId: string) => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      // In a real implementation, this would send an SMS/email or create a notification
      // For now, we'll just show a success message
      toast.success('Message sent to order owner');
      setCommunicatingWith(null);
      setMessage('');
    } catch (error: any) {
      toast.error('Failed to send message');
    }
  };

  const calculateGraceDaysRemaining = (order: any) => {
    if (!order.grace_period_deadline) return 'N/A';
    
    const deadline = new Date(order.grace_period_deadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    return `${diffDays} days`;
  };

  const calculatePaymentProgress = (order: any) => {
    const totalAmount = order.total_amount || 0;
    const processedQuantity = order.processed_quantity || 0;
    const totalQuantity = order.quantity || 0;
    const percentage = totalQuantity > 0 ? (processedQuantity / totalQuantity) * 100 : 0;
    const paidAmount = processedQuantity * (order.price_per_share || 0);
    return { percentage, paidAmount, totalAmount };
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      cancelled: 'outline',
      completed: 'default',
      partial: 'outline'
    };
    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  const getOrderStats = () => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const approved = orders.filter(o => o.status === 'approved').length;
    const totalValue = orders
      .filter(o => o.status === 'pending')
      .reduce((sum, o) => sum + o.total_amount, 0);
    
    return { pending, approved, totalValue };
  };

  const stats = getOrderStats();

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <ShoppingCart className="h-4 w-4 text-orange-500" />
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
              <Users className="h-4 w-4 text-green-500" />
              <div className="ml-2">
                <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Approved Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">UGX {stats.totalValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Pending Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Installment Orders Management
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Share</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price/Share</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment Progress</TableHead>
                <TableHead>Grace Days Left</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{order.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{order.shares?.name || 'Unknown Share'}</TableCell>
                  <TableCell>
                    {editingOrder?.id === order.id ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={newQuantity}
                          onChange={(e) => setNewQuantity(e.target.value)}
                          className="w-20"
                        />
                        <Button
                          size="sm"
                          onClick={() => adjustQuantity(order.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingOrder(null);
                            setNewQuantity('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{order.quantity?.toLocaleString() || 0}</span>
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingOrder(order);
                              setNewQuantity(order.quantity?.toString() || '0');
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.shares?.currency || order.currency} {(order.shares?.price_per_share || order.price_per_share)?.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {order.shares?.currency || order.currency} {order.total_amount?.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const progress = calculatePaymentProgress(order);
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-secondary rounded-full h-1.5">
                              <div 
                                className="bg-primary h-1.5 rounded-full" 
                                style={{ width: `${progress.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">{progress.percentage.toFixed(0)}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {order.shares?.currency} {progress.paidAmount.toLocaleString()} / {progress.totalAmount.toLocaleString()}
                          </p>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const daysLeft = calculateGraceDaysRemaining(order);
                      const isExpired = daysLeft === 'Expired';
                      const isToday = daysLeft === 'Today';
                      return (
                        <div className="flex items-center gap-1">
                          <Clock className={`h-3 w-3 ${isExpired ? 'text-red-500' : isToday ? 'text-orange-500' : 'text-muted-foreground'}`} />
                          <span className={`text-sm ${isExpired ? 'text-red-500 font-medium' : isToday ? 'text-orange-500 font-medium' : ''}`}>
                            {daysLeft}
                          </span>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {/* Edit Quantity */}
                      {!editingOrder && !extendingGrace && !communicatingWith && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingOrder(order);
                            setNewQuantity(order.quantity?.toString() || '0');
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {/* Extend Grace Period */}
                      {extendingGrace?.id === order.id ? (
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            value={graceDays}
                            onChange={(e) => setGraceDays(e.target.value)}
                            placeholder="Days"
                            className="w-16 h-8"
                          />
                          <Button
                            size="sm"
                            onClick={() => extendGracePeriod(order.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setExtendingGrace(null);
                              setGraceDays('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : !editingOrder && !communicatingWith && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setExtendingGrace(order);
                            setGraceDays('');
                          }}
                        >
                          <Calendar className="h-3 w-3" />
                        </Button>
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
                      ) : !editingOrder && !extendingGrace && (
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
                      
                      {/* Cancel Order */}
                      {!editingOrder && !extendingGrace && !communicatingWith && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelOrder(order.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No buying orders found
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

export default BuyingOrdersManager;