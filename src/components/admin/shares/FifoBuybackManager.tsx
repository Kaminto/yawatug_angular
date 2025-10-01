
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingDown, Clock, CheckCircle, XCircle } from 'lucide-react';

interface FifoBuybackManagerProps {
  onUpdate: () => void;
}

const FifoBuybackManager: React.FC<FifoBuybackManagerProps> = ({ onUpdate }) => {
  const [buybackOrders, setBuybackOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadBuybackData();
  }, []);

  const loadBuybackData = async () => {
    try {
      // Load buyback orders
      const { data: orders, error: ordersError } = await supabase
        .from('share_buyback_orders')
        .select(`
          *,
          profiles!share_buyback_orders_user_id_fkey(full_name, email),
          shares(name, price_per_share)
        `)
        .order('fifo_position', { ascending: true });

      if (ordersError) throw ordersError;

      // Load buyback settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('share_buyback_settings')
        .select('*')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      setBuybackOrders(orders || []);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading buyback data:', error);
      toast.error('Failed to load buyback data');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessOrder = async (orderId: string) => {
    try {
      setProcessing(true);
      
      const order = buybackOrders.find(o => o.id === orderId);
      if (!order) return;

      // Calculate payment amount
      const paymentAmount = order.quantity * order.requested_price * (order.payment_percentage / 100);

      // Check admin fund balance
      const { data: adminFund } = await supabase
        .from('admin_sub_wallets')
        .select('balance')
        .eq('wallet_type', 'buyback_fund')
        .eq('currency', 'UGX')
        .single();

      if (!adminFund || adminFund.balance < paymentAmount) {
        toast.error('Insufficient buyback fund balance');
        return;
      }

      // Process the buyback manually (since RPC function doesn't exist)
      // Update order status
      const { error: updateError } = await supabase
        .from('share_buyback_orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          partial_payment: paymentAmount
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Deduct from admin fund
      const { error: fundError } = await supabase
        .from('admin_sub_wallets')
        .update({ 
          balance: adminFund.balance - paymentAmount 
        })
        .eq('wallet_type', 'buyback_fund')
        .eq('currency', 'UGX');

      if (fundError) throw fundError;

      toast.success('Buyback order processed successfully');
      loadBuybackData();
      onUpdate();
    } catch (error: any) {
      console.error('Error processing buyback order:', error);
      toast.error('Failed to process buyback order');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading FIFO buyback manager...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            FIFO Buyback Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {buybackOrders.length === 0 ? (
            <div className="text-center py-8">
              <TrendingDown className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No buyback orders in queue</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FIFO Position</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Requested Price</TableHead>
                  <TableHead>Payment %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buybackOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Badge variant="outline">#{order.fifo_position}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.profiles?.full_name || 'Unknown User'}</div>
                        <div className="text-sm text-muted-foreground">{order.profiles?.email || 'No email'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{order.quantity.toLocaleString()}</TableCell>
                    <TableCell>UGX {order.requested_price.toLocaleString()}</TableCell>
                    <TableCell>{order.payment_percentage}%</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleProcessOrder(order.id)}
                          disabled={processing}
                        >
                          {processing ? 'Processing...' : 'Process'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Buyback Settings */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Buyback Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Fund Balance</div>
                <div className="text-2xl font-bold text-green-600">
                  UGX {settings.buyback_fund?.toLocaleString() || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Daily Limit</div>
                <div className="text-lg">{settings.daily_limit || 'Unlimited'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Monthly Limit</div>
                <div className="text-lg">{settings.monthly_limit || 'Unlimited'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Min Payment %</div>
                <div className="text-lg">{settings.min_payment_percentage}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FifoBuybackManager;
