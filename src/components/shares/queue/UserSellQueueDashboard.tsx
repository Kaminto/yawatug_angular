import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, TrendingDown, Info, Edit, X, CheckCircle, ChevronDown } from 'lucide-react';

interface UserSellQueueDashboardProps {
  userId: string;
}

const UserSellQueueDashboard: React.FC<UserSellQueueDashboardProps> = ({ userId }) => {
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [modifyReason, setModifyReason] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      loadQueueData();
    }
  }, [userId]);

  const loadQueueData = async () => {
    try {
      // Load user's orders from the new table with shares join
      const { data: orders, error: ordersError } = await supabase
        .from('share_sell_orders')
        .select(`
          *,
          shares(name, price_per_share, currency)
        `)
        .eq('user_id', userId)
        .order('fifo_position', { ascending: true });

      if (ordersError) throw ordersError;
      
      setMyOrders(orders || []);
    } catch (error) {
      console.error('Error loading queue data:', error);
      toast.error('Failed to load queue data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In Queue</Badge>;
      case 'partial':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEstimatedWaitTime = (position: number) => {
    // Simple estimation - in production this would use historical data
    const daysPerOrder = 1;
    const estimatedDays = Math.max(1, position * daysPerOrder);
    return `${estimatedDays} day${estimatedDays > 1 ? 's' : ''}`;
  };

  const handleModifyOrder = async () => {
    if (!editingOrder || !newQuantity || parseInt(newQuantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.rpc('modify_sell_order_quantity', {
        p_order_id: editingOrder.id,
        p_user_id: userId,
        p_new_quantity: parseInt(newQuantity),
        p_reason: modifyReason || 'User modification'
      });

      if (error) throw error;

      toast.success('Order modified successfully. Your position in the queue has been reset.');
      setEditingOrder(null);
      setNewQuantity('');
      setModifyReason('');
      loadQueueData();
    } catch (error: any) {
      console.error('Error modifying order:', error);
      toast.error(`Failed to modify order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string, reason: string = 'User cancellation') => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('cancel_sell_order', {
        p_order_id: orderId,
        p_user_id: userId,
        p_reason: reason
      });

      if (error) throw error;

      toast.success('Order cancelled successfully');
      loadQueueData();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(`Failed to cancel order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading queue information...</div>;
  }

  const displayedOrders = showAll ? myOrders : myOrders.slice(0, 5);
  const hasMore = myOrders.length > 5;

  return (
    <div className="space-y-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  My Sell Orders ({myOrders.length})
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
          {myOrders.length === 0 ? (
            <div className="text-center py-8">
              <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No sell orders in queue</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Queue Position</TableHead>
                      <TableHead>Share</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Est. Wait Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedOrders.map((order) => {
                  const processedQty = order.processed_quantity || 0;
                  const totalQty = order.quantity || 0;
                  const remainingQty = order.remaining_quantity || totalQty;
                  const progressPercent = totalQty > 0 ? (processedQty / totalQty) * 100 : 0;
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          #{order.fifo_position || 'TBD'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {order.shares?.name || 'Unknown Share'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>
                            {remainingQty.toLocaleString()}
                            {processedQty > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (of {totalQty.toLocaleString()})
                              </span>
                            )}
                          </div>
                          {processedQty > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-green-600">
                                {processedQty} / {totalQty} paid
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div 
                                  className="bg-green-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>UGX {parseFloat(order.requested_price).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {order.status === 'pending' && order.fifo_position ? (
                        <span className="text-sm text-muted-foreground">
                          ~{getEstimatedWaitTime(order.fifo_position)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setNewQuantity(order.remaining_quantity.toString());
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Modify Order Quantity</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">New Quantity</label>
                                    <Input
                                      type="number"
                                      value={newQuantity}
                                      onChange={(e) => setNewQuantity(e.target.value)}
                                      min="1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Note: Modifying your order will reset your position in the queue
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Reason (Optional)</label>
                                    <Input
                                      value={modifyReason}
                                      onChange={(e) => setModifyReason(e.target.value)}
                                      placeholder="Reason for modification"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setEditingOrder(null)}>
                                      Cancel
                                    </Button>
                                    <Button onClick={handleModifyOrder}>
                                      Modify Order
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {displayedOrders.map((order) => {
                  const processedQty = order.processed_quantity || 0;
                  const totalQty = order.quantity || 0;
                  const remainingQty = order.remaining_quantity || totalQty;
                  const progressPercent = totalQty > 0 ? (processedQty / totalQty) * 100 : 0;
                  
                  return (
                    <Card key={order.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="font-mono">
                            #{order.fifo_position || 'TBD'}
                          </Badge>
                          {getStatusBadge(order.status)}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Share</span>
                            <span className="font-medium">{order.shares?.name || 'Unknown Share'}</span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Quantity</span>
                            <div>
                              {remainingQty.toLocaleString()}
                              {processedQty > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  (of {totalQty.toLocaleString()})
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {processedQty > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-green-600">
                                {processedQty} / {totalQty} paid
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div 
                                  className="bg-green-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Price</span>
                            <span className="font-medium">UGX {parseFloat(order.requested_price).toLocaleString()}</span>
                          </div>
                          
                          {order.status === 'pending' && order.fifo_position && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Est. Wait</span>
                              <span>~{getEstimatedWaitTime(order.fifo_position)}</span>
                            </div>
                          )}
                        </div>
                        
                        {order.status === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setNewQuantity(order.remaining_quantity.toString());
                                  }}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Modify
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Modify Order Quantity</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">New Quantity</label>
                                    <Input
                                      type="number"
                                      value={newQuantity}
                                      onChange={(e) => setNewQuantity(e.target.value)}
                                      min="1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Note: Modifying your order will reset your position in the queue
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Reason (Optional)</label>
                                    <Input
                                      value={modifyReason}
                                      onChange={(e) => setModifyReason(e.target.value)}
                                      placeholder="Reason for modification"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setEditingOrder(null)}>
                                      Cancel
                                    </Button>
                                    <Button onClick={handleModifyOrder}>
                                      Modify Order
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="flex-1"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
          
          {myOrders.length > 0 && hasMore && (
            <div className="flex justify-center pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : `Show More (${myOrders.length - 5} more orders)`}
              </Button>
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default UserSellQueueDashboard;