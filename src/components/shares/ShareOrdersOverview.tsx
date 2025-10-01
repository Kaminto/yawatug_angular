
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Clock, ShoppingCart, TrendingDown, Info } from 'lucide-react';

interface ShareOrdersOverviewProps {
  userId: string;
}

const ShareOrdersOverview: React.FC<ShareOrdersOverviewProps> = ({ userId }) => {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [sellOrders, setSellOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();

    // Set up real-time subscriptions
    const purchaseOrdersChannel = supabase
      .channel('purchase-orders-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'share_purchase_orders' },
        (payload) => {
          console.log('Purchase order change:', payload);
          loadOrders();
        }
      )
      .subscribe();

    const sellOrdersChannel = supabase
      .channel('sell-orders-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'share_sell_orders' },
        (payload) => {
          console.log('Sell order change:', payload);
          loadOrders();
        }
      )
      .subscribe();

    const shareBookingsChannel = supabase
      .channel('share-bookings-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'share_bookings' },
        (payload) => {
          console.log('Share booking change:', payload);
          loadOrders();
        }
      )
      .subscribe();

    const transferRequestsChannel = supabase
      .channel('transfer-requests-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'share_transfer_requests' },
        (payload) => {
          console.log('Transfer request change:', payload);
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(purchaseOrdersChannel);
      supabase.removeChannel(sellOrdersChannel);
      supabase.removeChannel(shareBookingsChannel);
      supabase.removeChannel(transferRequestsChannel);
    };
  }, [userId]);

  const loadOrders = async () => {
    try {
      // Try to load purchase orders with simplified query
      try {
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('share_purchase_orders')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['pending', 'partial'])
          .order('created_at', { ascending: false });

        if (!purchaseError) {
          setPurchaseOrders(purchaseData || []);
        } else {
          console.log('Purchase orders table not available:', purchaseError);
          setPurchaseOrders([]);
        }
      } catch (err) {
        console.log('Purchase orders not available');
        setPurchaseOrders([]);
      }

      // Try to load sell orders with simplified query
      try {
        const { data: sellData, error: sellError } = await supabase
          .from('share_sell_orders')
          .select(`
            *,
            shares(name, price_per_share)
          `)
          .eq('user_id', userId)
          .in('status', ['pending', 'partial'])
          .order('created_at', { ascending: false });

        if (!sellError) {
          setSellOrders(sellData || []);
        } else {
          console.log('Sell orders table not available:', sellError);
          setSellOrders([]);
        }
      } catch (err) {
        console.log('Sell orders not available');
        setSellOrders([]);
      }

    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Purchase Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>No pending purchase orders</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {purchaseOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Share Purchase</h3>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {order.quantity.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total: {order.currency} {order.total_amount.toLocaleString()}
                      </p>
                      {order.exchange_details && (
                        <p className="text-sm text-blue-600">
                          Installment: {order.currency} {order.exchange_details.down_payment?.toLocaleString()} paid
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={order.status === 'pending' ? 'secondary' : 'outline'}>
                        {order.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sell Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Sell Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sellOrders.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>No pending sell orders</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {sellOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Share Sale</h3>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {order.quantity || order.remaining_quantity?.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Price: UGX {(order.requested_price || order.price_per_share)?.toLocaleString()}
                      </p>
                      {order.fifo_position && (
                        <p className="text-sm text-orange-600">
                          Queue Position: #{order.fifo_position}
                        </p>
                      )}
                      {order.shares?.name && (
                        <p className="text-sm text-blue-600">
                          Share: {order.shares.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={order.status === 'pending' ? 'secondary' : 'outline'}>
                        {order.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareOrdersOverview;
