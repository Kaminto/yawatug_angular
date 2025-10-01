import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Edit, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedOrdersTabProps {
  shareBookings: any[];
  onRefresh: () => void;
}

const EnhancedOrdersTab: React.FC<EnhancedOrdersTabProps> = ({ shareBookings, onRefresh }) => {
  const [showMore, setShowMore] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    order: any;
    details: string;
  }>({ open: false, action: '', order: null, details: '' });

  const calculateDaysToExpiry = (order: any) => {
    if (order.type === 'buy' && order.expires_at) {
      const expiryDate = new Date(order.expires_at);
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } else if (order.type === 'sell') {
      const createdDate = new Date(order.created_at);
      const expiryDate = new Date(createdDate.getTime() + (45 * 24 * 60 * 60 * 1000));
      const today = new Date();
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    }
    return 0;
  };

  const handleAction = async (action: string, order: any) => {
    const details = `${action} order for ${order.quantity} shares worth UGX ${order.total_amount?.toLocaleString() || 'N/A'}`;
    setConfirmDialog({
      open: true,
      action,
      order,
      details
    });
  };

  const executeAction = async () => {
    const { action, order } = confirmDialog;
    
    try {
      let result;
      
      if (action === 'Complete') {
        toast.info('Complete functionality coming soon');
        return;
      } else if (action === 'Edit') {
        toast.info('Edit functionality coming soon');
        return;
      } else if (action === 'Extend') {
        toast.info('Extend functionality coming soon');
        return;
      }

      if (result?.error) {
        throw result.error;
      }

      toast.success(`Order ${action.toLowerCase()}ed successfully`);
      onRefresh();
    } catch (error) {
      console.error(`Error ${action.toLowerCase()}ing order:`, error);
      toast.error(`Failed to ${action.toLowerCase()} order`);
    } finally {
      setConfirmDialog({ open: false, action: '', order: null, details: '' });
    }
  };

  const activeOrders = shareBookings.filter(order => 
    order.status !== 'completed' && order.status !== 'cancelled'
  );

  const displayedOrders = showMore ? activeOrders : activeOrders.slice(0, 5);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Active Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {displayedOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active orders found.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {displayedOrders.map((order) => {
                  const daysToExpiry = calculateDaysToExpiry(order);
                  const IconComponent = order.type === 'buy' ? Calendar : X;
                  const orderColor = order.type === 'buy' ? 'text-green-600' : 'text-red-600';
                  
                  return (
                    <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-3 rounded-full bg-muted ${orderColor}`}>
                              <IconComponent className="h-6 w-6" />
                            </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={order.type === 'buy' ? 'default' : 'destructive'}>
                                {order.type?.toUpperCase() || 'BUY'}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Pending
                              </Badge>
                            </div>
                            <p className="font-medium">
                              {order.quantity?.toLocaleString()} shares
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due in: <span className={daysToExpiry <= 7 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>{daysToExpiry} days</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${orderColor}`}>
                            UGX {(order.total_amount || order.total_sell_value || 0).toLocaleString()}
                          </p>
                          {(order.fees || order.estimated_fees) > 0 && (
                            <p className="text-xs text-muted-foreground">
                              + Fees: UGX {(order.fees || order.estimated_fees || 0).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction('Complete', order)}
                          className="flex-1 h-10"
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction('Edit', order)}
                          className="h-10 w-12"
                        >
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction('Extend', order)}
                          className="h-10 px-3"
                        >
                          Extend
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {activeOrders.length > 5 && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowMore(!showMore)}
                  >
                    {showMore ? 'Show Less' : `View More (${activeOrders.length - 5} more)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm {confirmDialog.action}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to {confirmDialog.action.toLowerCase()} this order?</p>
            <p className="text-sm text-muted-foreground mt-2">{confirmDialog.details}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, action: '', order: null, details: '' })}
            >
              Cancel
            </Button>
            <Button onClick={executeAction}>
              Confirm {confirmDialog.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedOrdersTab;