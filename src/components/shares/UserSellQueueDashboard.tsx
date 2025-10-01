import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingDown, Clock, X, Edit, AlertCircle } from 'lucide-react';
import { useSellOrderManagement } from '@/hooks/useSellOrderManagement';

interface UserSellQueueDashboardProps {
  orders: any[];
  userId: string;
  onUpdate: () => void;
}

const UserSellQueueDashboard: React.FC<UserSellQueueDashboardProps> = ({
  orders,
  userId,
  onUpdate
}) => {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [showAll, setShowAll] = useState(false);
  
  const { loading, cancelOrder, modifyOrderQuantity } = useSellOrderManagement();

  const displayedOrders = showAll ? orders : orders.slice(0, 5);
  const hasMore = orders.length > 5;

  const handleCancelClick = (order: any) => {
    setSelectedOrder(order);
    setCancelModalOpen(true);
  };

  const handleEditClick = (order: any) => {
    setSelectedOrder(order);
    setNewQuantity(String(order.quantity));
    setEditModalOpen(true);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    
    const result = await cancelOrder(selectedOrder.id, userId, 'User cancelled order');
    if (result.success) {
      setCancelModalOpen(false);
      setSelectedOrder(null);
      onUpdate();
    }
  };

  const handleUpdateQuantity = async () => {
    if (!selectedOrder || !newQuantity) return;
    
    const qty = parseInt(newQuantity);
    if (qty <= 0) return;

    const result = await modifyOrderQuantity(selectedOrder.id, userId, qty, 'User modified quantity');
    if (result.success) {
      setEditModalOpen(false);
      setSelectedOrder(null);
      setNewQuantity('');
      onUpdate();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5" />
            My Sell Orders ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No active sell orders</p>
            </div>
          ) : (
            <>
              {displayedOrders.map((order) => {
                const processedQty = order.processed_quantity || 0;
                const totalQty = order.quantity || 0;
                const remainingQty = order.remaining_quantity || totalQty;
                const progressPercent = totalQty > 0 ? (processedQty / totalQty) * 100 : 0;
                
                return (
                  <div
                    key={order.id}
                    className="p-3 sm:p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="space-y-1">
                          <div className="font-semibold text-sm sm:text-base">
                            {remainingQty.toLocaleString()} shares
                            {processedQty > 0 && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (of {totalQty.toLocaleString()} total)
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusBadge(order.status)}
                            {order.fifo_position && order.status === 'pending' && (
                              <span className="text-xs sm:text-sm text-muted-foreground">
                                Queue: #{order.fifo_position}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Payment/Buyback Progress */}
                        {processedQty > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Payment Progress</span>
                              <span className="font-medium text-green-600">
                                {processedQty.toLocaleString()} / {totalQty.toLocaleString()} paid
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    
                    {order.status === 'pending' && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(order)}
                          disabled={loading}
                          className="flex-1 sm:flex-none"
                        >
                          <Edit className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelClick(order)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="bg-muted p-2 sm:p-3 rounded-lg text-xs sm:text-sm space-y-1 overflow-x-auto">
                    <div className="min-w-[250px] space-y-1">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Order Type:</span>
                        <span className="font-medium capitalize">{order.order_type}</span>
                      </div>
                      {order.requested_price && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Requested Price:</span>
                          <span className="font-medium">UGX {order.requested_price?.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Total Value:</span>
                        <span className="font-medium">UGX {order.total_value?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {order.status === 'pending' && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 flex-wrap">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span>Orders are processed in queue order (FIFO)</span>
                    </div>
                  )}
                </div>
              );
              })}

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? 'Show Less' : `Show More (${orders.length - 5} more)`}
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm space-y-1">
              <p className="font-medium text-blue-900">💡 Sell Order Tips:</p>
              <ul className="text-blue-800 space-y-1 ml-4 list-disc">
                <li>Orders are processed in FIFO (first in, first out) order</li>
                <li>You can modify or cancel pending orders</li>
                <li>Processing typically takes 2-3 business days</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Sell Order?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel this sell order? The shares will remain in your portfolio.
            </p>
            {selectedOrder && (
              <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                <div><strong>Shares:</strong> {selectedOrder.quantity?.toLocaleString()}</div>
                <div><strong>Total Value:</strong> UGX {selectedOrder.total_value?.toLocaleString()}</div>
                <div><strong>Queue Position:</strong> #{selectedOrder.fifo_position}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)} disabled={loading}>
              No, Keep It
            </Button>
            <Button variant="destructive" onClick={handleCancelOrder} disabled={loading}>
              {loading ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quantity Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Sell Order Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedOrder && (
              <>
                <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                  <div><strong>Current Quantity:</strong> {selectedOrder.quantity?.toLocaleString()} shares</div>
                  <div><strong>Current Value:</strong> UGX {selectedOrder.total_value?.toLocaleString()}</div>
                  <div><strong>Queue Position:</strong> #{selectedOrder.fifo_position}</div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newQuantity">New Quantity</Label>
                  <Input
                    id="newQuantity"
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the new number of shares to sell
                  </p>
                </div>

                {newQuantity && parseInt(newQuantity) > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <div><strong>New Value:</strong> UGX {(parseInt(newQuantity) * (selectedOrder.total_value / selectedOrder.quantity)).toLocaleString()}</div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleUpdateQuantity} disabled={loading || !newQuantity || parseInt(newQuantity) <= 0}>
              {loading ? 'Updating...' : 'Update Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserSellQueueDashboard;
