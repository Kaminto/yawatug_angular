import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, TrendingDown, RefreshCw } from 'lucide-react';

interface BuybackOrder {
  id: string;
  user_id: string;
  share_id: string;
  quantity: number;
  requested_price: number;
  status: string;
  created_at: string;
  fifo_position?: number;
  profiles?: {
    full_name: string;
    email: string;
  };
  shares?: {
    name: string;
  };
}

const BuybackOrderProcessor: React.FC = () => {
  const [orders, setOrders] = useState<BuybackOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  const loadBuybackOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('share_buyback_orders')
        .select(`
          *,
          profiles:user_id (full_name, email),
          shares:share_id (name)
        `)
        .in('status', ['pending', 'approved'])
        .order('fifo_position', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error loading buyback orders:', error);
      toast.error('Failed to load buyback orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuybackOrders();
  }, []);

  const processBuybackOrder = async (orderId: string) => {
    try {
      setProcessingOrderId(orderId);
      
      const { data, error } = await supabase
        .rpc('process_buyback_order', {
          p_order_id: orderId
        });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      if (result.success) {
        toast.success(result.message || 'Buyback order processed successfully');
        loadBuybackOrders(); // Refresh the list
      } else {
        toast.error(result.error || 'Failed to process buyback order');
      }
    } catch (error: any) {
      console.error('Error processing buyback order:', error);
      toast.error(error.message || 'Failed to process buyback order');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const updateOrderStatus = async (orderId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('share_buyback_orders')
        .update({
          status,
          admin_notes: notes[orderId] || null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Order ${status} successfully`);
      loadBuybackOrders();
      
      // Clear notes for this order
      setNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[orderId];
        return newNotes;
      });
    } catch (error: any) {
      console.error(`Error ${status} order:`, error);
      toast.error(`Failed to ${status} order`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'completed':
        return <Badge variant="outline"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Buyback Order Processor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading buyback orders...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Buyback Order Processor
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Process share buyback orders and return shares to the pool
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending buyback orders found
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {order.profiles?.full_name || 'Unknown User'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.profiles?.email}
                    </div>
                    <div className="text-sm">
                      {order.shares?.name} - {order.quantity.toLocaleString()} shares
                    </div>
                    <div className="text-sm">
                      Requested Price: UGX {order.requested_price.toLocaleString()} per share
                    </div>
                    <div className="text-sm">
                      Total Value: UGX {(order.quantity * order.requested_price).toLocaleString()}
                    </div>
                    {order.fifo_position && (
                      <div className="text-sm text-muted-foreground">
                        FIFO Position: #{order.fifo_position}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(order.status)}
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {order.status === 'pending' && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`notes-${order.id}`}>Admin Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${order.id}`}
                        placeholder="Add notes about this order..."
                        value={notes[order.id] || ''}
                        onChange={(e) => setNotes(prev => ({
                          ...prev,
                          [order.id]: e.target.value
                        }))}
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'approved')}
                        variant="default"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'rejected')}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {order.status === 'approved' && (
                  <div className="pt-2">
                    <Button
                      onClick={() => processBuybackOrder(order.id)}
                      disabled={processingOrderId === order.id}
                      variant="outline"
                    >
                      {processingOrderId === order.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-4 w-4 mr-1" />
                          Process Buyback
                        </>
                      )}
                    </Button>
                    <div className="text-xs text-muted-foreground mt-1">
                      This will return {order.quantity.toLocaleString()} shares to the available pool
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <Button onClick={loadBuybackOrders} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Orders
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BuybackOrderProcessor;