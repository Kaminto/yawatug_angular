
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Clock, XCircle, CheckCircle2, ShoppingCart, TrendingDown, AlertTriangle, Wallet, Target, ArrowRightLeft, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProgressiveOwnership } from '@/hooks/useProgressiveOwnership';
import BookingPaymentModal from './BookingPaymentModal';
import EditSellOrderModal from './EditSellOrderModal';

interface UserShareBookingDashboardProps {
  shareBookings: any[];
  onBookingUpdate: () => void;
  userId: string;
  userWallets?: any[];
  pendingTransfers?: any[];
}

const UserShareBookingDashboard: React.FC<UserShareBookingDashboardProps> = ({
  shareBookings,
  onBookingUpdate,
  userId,
  userWallets = [],
  pendingTransfers = []
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [editSellOrderModalOpen, setEditSellOrderModalOpen] = useState(false);
  const [selectedSellOrder, setSelectedSellOrder] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('buy-orders');
  const { loading: progressiveLoading } = useProgressiveOwnership();
  const isMobile = useIsMobile();

  // Split buy/sell bookings
  const buyOrders = shareBookings.filter(b => b.type === 'buy');
  const sellOrders = shareBookings.filter(b => b.type === 'sell');

  // Tab configuration with icons and counts
  const tabConfig = [
    { value: 'buy-orders', label: `Buy Orders (${buyOrders.length})`, icon: ShoppingCart },
    { value: 'sell-orders', label: `Sell Orders (${sellOrders.length})`, icon: TrendingDown },
    { value: 'transfers', label: `Transfers (${pendingTransfers.length})`, icon: ArrowRightLeft }
  ];

  // Enhanced cancel function with proper validation
  const handleCancel = async (bookingId: string, orderType: 'buy' | 'sell') => {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      if (orderType === 'sell') {
        // Use the proper RPC function for sell orders
        const { error } = await supabase.rpc('cancel_sell_order', {
          p_order_id: bookingId,
          p_user_id: userId,
          p_reason: 'User cancellation'
        });
        
        if (error) throw error;
      } else {
        // Handle buy orders (share_bookings)
        const { error } = await supabase
          .from('share_bookings')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId)
          .eq('user_id', userId);

        if (error) throw error;
      }

      toast.success(`${orderType === 'buy' ? 'Buy' : 'Sell'} order cancelled successfully`);
      onBookingUpdate();
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(`Failed to cancel order: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = (booking: any) => {
    setSelectedBooking(booking);
    setPaymentModalOpen(true);
  };

  const handleEditSellOrder = (sellOrder: any) => {
    setSelectedSellOrder(sellOrder);
    setEditSellOrderModalOpen(true);
  };

  const renderBookingRow = (booking: any, isSell = false) => {
    const paymentPercentage = booking.payment_percentage || 0;
    const sharesOwned = booking.shares_owned_progressively || 0;
    const remainingShares = booking.quantity - sharesOwned;
    const remainingBalance = booking.remaining_amount || 0;
    
    // Calculate days remaining until expiry (for buy orders)
    const expiresAt = booking.expires_at ? new Date(booking.expires_at) : null;
    const now = new Date();
    const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3;
    const isExpired = daysRemaining !== null && daysRemaining <= 0;
    
    return (
    <Card className="mb-3" key={booking.id}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          {isSell ? <TrendingDown className="h-5 w-5 text-red-600" /> : <ShoppingCart className="h-5 w-5 text-blue-600" />}
          <div>
            <div className="font-semibold">{booking?.shares?.name || "Shares"}</div>
            <div className="text-xs text-muted-foreground">
              {booking.quantity.toLocaleString()} shares &nbsp;| Price UGX {(booking.price_per_share || booking.booked_price_per_share || booking.requested_price || 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Total: UGX {(booking.total_amount || booking.total_sell_value || 0).toLocaleString()}
            </div>
            {isSell && booking.fifo_position && (
              <div className="text-xs text-blue-600">
                Queue Position: #{booking.fifo_position}
              </div>
            )}
            {/* Show expiry information for buy orders */}
            {!isSell && expiresAt && (
              <div className={`text-xs ${isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                {isExpired ? (
                  <>⚠️ Order expired {Math.abs(daysRemaining)} days ago</>
                ) : daysRemaining === 0 ? (
                  <>🕐 Expires today!</>
                ) : daysRemaining === 1 ? (
                  <>⏰ Expires tomorrow!</>
                ) : (
                  <>📅 Expires in {daysRemaining} days</>
                )}
              </div>
            )}
          </div>
        </div>
        <Badge className={
          booking.status === "pending" ? "bg-yellow-100 text-yellow-700" : 
          booking.status === "cancelled" ? "bg-gray-100 text-gray-500" : 
          booking.status === "completed" ? "bg-green-100 text-green-700" :
          booking.status === "partially_paid" ? "bg-blue-100 text-blue-700" :
          booking.status === "active" ? "bg-orange-100 text-orange-700" :
          "bg-gray-100 text-gray-700"
        }>
          {booking.status === "partially_paid" ? "In Progress" : booking.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progressive Ownership Progress */}
        {!isSell && (booking.status === "active" || booking.status === "partially_paid" || booking.status === "completed") && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">Payment Progress</span>
              <span className="text-muted-foreground">{paymentPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={paymentPercentage} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-green-600" />
                <span>Owned: {sharesOwned.toLocaleString()} shares</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-600" />
                <span>Pending: {remainingShares.toLocaleString()} shares</span>
              </div>
            </div>
            
            {remainingBalance > 0 && (
              <div className="text-xs text-muted-foreground">
                Remaining balance: UGX {remainingBalance.toLocaleString()}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Created: {new Date(booking.created_at).toLocaleDateString()}
          </div>
          
          <div className="flex gap-2">
            {(booking.status === "active" || booking.status === "partially_paid") && remainingBalance > 0 && (
              <Button 
                variant="default" 
                size="sm"
                disabled={progressiveLoading}
                onClick={() => handlePaymentClick(booking)}
                className="bg-primary text-primary-foreground"
              >
                <Wallet className="h-4 w-4 mr-1" />
                Make Payment
              </Button>
            )}
            
            {booking.status === "pending" && (
              <>
                {isSell && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditSellOrder(booking)}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCancel(booking.id, isSell ? 'sell' : 'buy')}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            )}
            
            {booking.status === "completed" && (
              <div className="flex items-center text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Completed
              </div>
            )}
            
            {booking.status === "cancelled" && (
              <div className="flex items-center text-gray-500">
                <XCircle className="h-4 w-4 mr-1" />
                Cancelled
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Share Booking Dashboard</h2>
        <p className="text-muted-foreground">Manage your share purchase and sell orders</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {isMobile ? (
          <div className="mb-6">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(() => {
                    const currentTab = tabConfig.find(tab => tab.value === activeTab);
                    const Icon = currentTab?.icon;
                    return (
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{currentTab?.label || 'Select Option'}</span>
                      </div>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tabConfig.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <SelectItem key={tab.value} value={tab.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <TabsList className="grid w-full grid-cols-3">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        )}

        <TabsContent value="buy-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                Share Buy Orders (Instalment Purchase)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {buyOrders.length > 0 ? (
                <div className="space-y-3">
                  {buyOrders.map(order => renderBookingRow(order, false))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">No Buy Orders</h3>
                  <p>You haven't placed any share purchase orders yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {buyOrders.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-700 mt-0.5" />
                  <div className="text-blue-900 text-sm">
                    <strong>Buy Order Information:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>You can cancel pending orders that haven't been paid for</li>
                      <li>Instalment payments can be made through your wallet</li>
                      <li>Orders will auto-expire if not completed within the specified timeframe</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sell-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Share Sell Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sellOrders.length > 0 ? (
                <div className="space-y-3">
                  {sellOrders.map(order => renderBookingRow(order, true))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <TrendingDown className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">No Sell Orders</h3>
                  <p>You haven't placed any share sell orders yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {sellOrders.length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-700 mt-0.5" />
                  <div className="text-red-900 text-sm">
                    <strong>Sell Order Information:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Sell orders are funded by the admin buyback fund</li>
                      <li>You can cancel pending orders that haven't been paid for by admin</li>
                      <li>Payment processing depends on available buyback fund allocation</li>
                      <li>Orders are processed in FIFO (First In, First Out) order</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                Share Transfers (Pending Admin Approval)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingTransfers.length > 0 ? (
                <div className="space-y-3">
                  {pendingTransfers.map(transfer => (
                    <Card key={transfer.id} className="mb-3">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-semibold">
                              {transfer.transfer_type === 'outgoing' ? 'Transfer Out' : 'Transfer In'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {transfer.quantity.toLocaleString()} shares
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {transfer.transfer_type === 'outgoing' ? `To: ${transfer.recipient_email}` : `From: ${transfer.sender_email}`}
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-700">
                          Pending Approval
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>Requested: {new Date(transfer.created_at).toLocaleDateString()}</span>
                          {transfer.notes && (
                            <span className="text-xs">Notes: {transfer.notes}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Transfers</h3>
                  <p>You have no share transfer requests pending admin approval.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {pendingTransfers.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-700 mt-0.5" />
                  <div className="text-blue-900 text-sm">
                    <strong>Transfer Information:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All share transfers require admin approval for security</li>
                      <li>Transfer approval typically takes 1-2 business days</li>
                      <li>You'll receive notification once your transfer is processed</li>
                      <li>Transfers cannot be cancelled once submitted</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <BookingPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        booking={selectedBooking}
        userWallets={userWallets}
        onPaymentSuccess={onBookingUpdate}
        userId={userId}
      />

      {/* Edit Sell Order Modal */}
      <EditSellOrderModal
        isOpen={editSellOrderModalOpen}
        onClose={() => setEditSellOrderModalOpen(false)}
        sellOrder={selectedSellOrder}
        onOrderUpdate={onBookingUpdate}
      />
    </div>
  );
};

export default UserShareBookingDashboard;
