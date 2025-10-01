
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRightLeft, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserShareBuybackProps {
  userShares: any[];
  userId: string | null;
  onOrderPlaced: () => void;
}

const UserShareBuyback: React.FC<UserShareBuybackProps> = ({ userShares, userId, onOrderPlaced }) => {
  const [buybackSettings, setBuybackSettings] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm({
    defaultValues: {
      share_id: '',
      quantity: 1,
      partial_payment: 0,
    },
  });

  useEffect(() => {
    loadBuybackData();
  }, [userId]);

  const loadBuybackData = async () => {
    if (!userId) return;
    
    try {
      // Load buyback settings
      const { data: settings } = await supabase
        .from('share_buyback_settings')
        .select('*')
        .single();
      setBuybackSettings(settings);
      
      // Load user's pending orders
      const { data: orders } = await supabase
        .from('share_buyback_orders')
        .select(`
          *,
          shares:share_id(name, price_per_share, currency)
        `)
        .eq('user_id', userId)
        .in('status', ['pending', 'partial'])
        .order('fifo_position', { ascending: true });
      setPendingOrders(orders || []);
    } catch (error) {
      console.error('Error loading buyback data:', error);
    }
  };

  const calculateMinimumPayment = (quantity: number, pricePerShare: number) => {
    const totalValue = quantity * pricePerShare;
    const minPercentage = buybackSettings?.min_payment_percentage || 25;
    return (totalValue * minPercentage) / 100;
  };

  const handlePlaceBuybackOrder = async (values: any) => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      
      const selectedShare = userShares.find(us => us.share_id === values.share_id);
      if (!selectedShare) throw new Error('Share not found');
      
      const share = selectedShare.shares;
      const totalValue = values.quantity * share.price_per_share;
      const minimumPayment = calculateMinimumPayment(values.quantity, share.price_per_share);
      
      // Validate partial payment
      if (values.partial_payment > 0 && values.partial_payment < minimumPayment) {
        toast.error(`Minimum payment is ${share.currency} ${minimumPayment.toLocaleString()}`);
        return;
      }
      
      // Validate user has enough shares
      if (values.quantity > selectedShare.quantity) {
        toast.error('Insufficient shares in portfolio');
        return;
      }
      
      const { error } = await supabase
        .from('share_buyback_orders')
        .insert({
          user_id: userId,
          share_id: values.share_id,
          quantity: values.quantity,
          requested_price: share.price_per_share,
          partial_payment: values.partial_payment || 0,
          status: values.partial_payment >= minimumPayment ? 'partial' : 'pending',
          expires_at: new Date(Date.now() + (buybackSettings?.auto_cancel_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
        });
        
      if (error) throw error;
      
      toast.success('Buyback order placed successfully!');
      form.reset();
      loadBuybackData();
      onOrderPlaced();
    } catch (error: any) {
      console.error('Error placing buyback order:', error);
      toast.error(error.message || 'Failed to place buyback order');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedShareId = form.watch('share_id');
  const selectedQuantity = form.watch('quantity');
  const selectedShare = userShares.find(us => us.share_id === selectedShareId);
  const totalValue = selectedShare ? selectedQuantity * selectedShare.shares.price_per_share : 0;
  const minimumPayment = selectedShare ? calculateMinimumPayment(selectedQuantity, selectedShare.shares.price_per_share) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ArrowRightLeft className="mr-2 h-5 w-5" />
            Request Share Buyback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handlePlaceBuybackOrder)} className="space-y-4">
              <FormField
                control={form.control}
                name="share_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Shares</FormLabel>
                    <FormControl>
                      <select 
                        {...field} 
                        className="w-full p-2 border rounded-md"
                        required
                      >
                        <option value="">Select shares to sell back</option>
                        {userShares.map((userShare) => (
                          <option key={userShare.share_id} value={userShare.share_id}>
                            {userShare.shares.name} - {userShare.quantity.toLocaleString()} owned
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity to Sell</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        max={selectedShare?.quantity || 1}
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))} 
                      />
                    </FormControl>
                    {selectedShare && (
                      <p className="text-xs text-muted-foreground">
                        Available: {selectedShare.quantity.toLocaleString()} shares
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="partial_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partial Payment (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))} 
                      />
                    </FormControl>
                    {minimumPayment > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Minimum: {selectedShare?.shares.currency} {minimumPayment.toLocaleString()}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {selectedShare && (
                <div className="bg-muted p-3 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span>Current Price:</span>
                    <span>{selectedShare.shares.currency} {selectedShare.shares.price_per_share.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Value:</span>
                    <span className="font-semibold">{selectedShare.shares.currency} {totalValue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>Orders are processed using FIFO (First In, First Out)</span>
                  </div>
                </div>
              )}
              
              <Button type="submit" disabled={isLoading || !selectedShare} className="w-full">
                {isLoading ? 'Placing Order...' : 'Place Buyback Order'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Your Buyback Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{order.shares.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {order.quantity.toLocaleString()} shares
                    </p>
                  </div>
                  <Badge variant={order.status === 'partial' ? 'default' : 'secondary'}>
                    {order.status}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Requested Price:</span>
                    <span>{order.shares.currency} {order.requested_price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FIFO Position:</span>
                    <span>#{order.fifo_position}</span>
                  </div>
                  {order.payment_percentage > 0 && (
                    <div className="flex justify-between">
                      <span>Payment Made:</span>
                      <span>{order.payment_percentage.toFixed(1)}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Expires:</span>
                    <span>{new Date(order.expires_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {pendingOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No pending buyback orders
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserShareBuyback;
