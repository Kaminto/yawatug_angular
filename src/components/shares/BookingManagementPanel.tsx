import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, CreditCard, AlertCircle, CheckCircle, X, Minus, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BookingPaymentModal from './BookingPaymentModal';

interface BookingManagementPanelProps {
  bookings: any[];
  userId: string;
  userWallets: any[];
  onUpdate: () => void;
}

const BookingManagementPanel: React.FC<BookingManagementPanelProps> = ({
  bookings,
  userId,
  userWallets,
  onUpdate
}) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reduceModalOpen, setReduceModalOpen] = useState(false);
  const [newQuantity, setNewQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handlePaymentClick = (booking: any) => {
    setSelectedBooking(booking);
    setPaymentModalOpen(true);
  };

  const handleCancelClick = (booking: any) => {
    setSelectedBooking(booking);
    setCancelModalOpen(true);
  };

  const handleReduceClick = (booking: any) => {
    const sharesPaid = booking.shares_owned_progressively || 0;
    setSelectedBooking(booking);
    // Set initial value to current quantity
    setNewQuantity(String(booking.quantity));
    setReduceModalOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('cancel_booking_order', {
        p_booking_id: selectedBooking.id,
        p_user_id: userId
      });

      if (error) throw error;

      // Show detailed message from function
      const result = data as { success: boolean; message?: string };
      if (result && result.message) {
        toast.success(result.message);
      } else {
        toast.success('Booking cancelled successfully');
      }
      
      setCancelModalOpen(false);
      setSelectedBooking(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const handleReduceQuantity = async () => {
    if (!selectedBooking || !newQuantity) return;
    
    const qty = parseInt(newQuantity);
    const sharesPaid = selectedBooking.shares_owned_progressively || 0;
    
    // Validate quantity
    if (qty <= sharesPaid) {
      toast.error(`Cannot reduce below ${sharesPaid} shares - you already own them`);
      return;
    }
    
    if (qty >= selectedBooking.quantity) {
      toast.error('New quantity must be less than current quantity');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('reduce_booking_quantity', {
        p_booking_id: selectedBooking.id,
        p_new_quantity: qty,
        p_user_id: userId
      });

      if (error) throw error;

      // Show detailed message from function
      const result = data as { success: boolean; message?: string };
      if (result && result.message) {
        toast.success(result.message);
      } else {
        toast.success('Booking quantity reduced successfully');
      }
      
      setReduceModalOpen(false);
      setSelectedBooking(null);
      setNewQuantity('');
      onUpdate();
    } catch (error: any) {
      console.error('Error reducing booking quantity:', error);
      toast.error(error.message || 'Failed to reduce booking quantity');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Active</Badge>;
      case 'partially_paid':
        return <Badge variant="secondary"><CreditCard className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'completed':
        return <Badge variant="outline"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between gap-2 text-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Active Bookings ({bookings.length})
                </div>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
          {bookings.map((booking) => {
            const paymentPercentage = booking.payment_percentage || 0;
            const paidShares = Math.floor((paymentPercentage / 100) * booking.quantity);
            const pendingShares = booking.quantity - paidShares;
            const remainingAmount = booking.remaining_amount || 0;

            return (
              <div
                key={booking.id}
                className="p-3 sm:p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base">{booking.quantity.toLocaleString()} shares</div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(booking.status)}
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {paymentPercentage.toFixed(1)}% paid
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handlePaymentClick(booking)}
                      className="flex-1 sm:flex-none"
                    >
                      <CreditCard className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Pay</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReduceClick(booking)}
                      className="flex-1 sm:flex-none"
                    >
                      <Minus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Reduce</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelClick(booking)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Progress value={paymentPercentage} className="h-2" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Unlocked: </span>
                    <span className="font-medium text-green-600">{paidShares.toLocaleString()} shares</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Pending: </span>
                    <span className="font-medium text-orange-600">{pendingShares.toLocaleString()} shares</span>
                  </div>
                </div>

                <div className="bg-muted p-2 sm:p-3 rounded-lg overflow-x-auto">
                  <div className="text-xs sm:text-sm space-y-1 min-w-[250px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Total Amount:</span>
                      <span className="font-medium">UGX {booking.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Paid:</span>
                      <span className="font-medium text-green-600">
                        UGX {booking.cumulative_payments?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 border-t pt-1">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className="font-semibold">UGX {remainingAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {booking.auto_cancel_date && (
                  <div className="flex items-center gap-2 text-xs text-orange-600 flex-wrap">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span>Auto-cancel: {new Date(booking.auto_cancel_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm space-y-1">
              <p className="font-medium text-blue-900">💡 Booking Tips:</p>
              <ul className="text-blue-800 space-y-1 ml-4 list-disc">
                <li>Make payments to progressively unlock shares</li>
                <li>Shares unlock proportionally to payment percentage</li>
                <li>Complete payment before auto-cancel date</li>
              </ul>
            </div>
          </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <BookingPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        booking={selectedBooking}
        userWallets={userWallets}
        onPaymentSuccess={onUpdate}
        userId={userId}
      />

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBooking && (() => {
              const sharesPaid = selectedBooking.shares_owned_progressively || 0;
              const sharesUnpaid = selectedBooking.quantity - sharesPaid;
              
              return (
                <>
                  {sharesPaid > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        You've already paid for <strong>{sharesPaid} shares</strong>. 
                        Only the <strong>{sharesUnpaid} unpaid shares</strong> will be cancelled.
                      </p>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <p className="font-medium text-blue-900 mb-1">What will happen:</p>
                        <ul className="text-blue-800 space-y-1 ml-4 list-disc">
                          <li>✅ Keep {sharesPaid} shares (already paid)</li>
                          <li>❌ Cancel {sharesUnpaid} shares (not yet paid)</li>
                          <li>💰 No refund needed (you keep what you paid for)</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      This booking has no payments yet. All {selectedBooking.quantity} shares will be cancelled.
                    </p>
                  )}
                  
                  <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                    <div><strong>Total Shares:</strong> {selectedBooking.quantity?.toLocaleString()}</div>
                    <div><strong>Paid Shares:</strong> <span className="text-green-600">{sharesPaid.toLocaleString()}</span></div>
                    <div><strong>Unpaid Shares:</strong> <span className="text-orange-600">{sharesUnpaid.toLocaleString()}</span></div>
                    <div className="border-t pt-1 mt-1">
                      <strong>Amount Paid:</strong> UGX {selectedBooking.cumulative_payments?.toLocaleString() || '0'}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)} disabled={loading}>
              No, Keep It
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking} disabled={loading}>
              {loading ? 'Cancelling...' : 'Yes, Cancel Unpaid Shares'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reduce Quantity Dialog */}
      <Dialog open={reduceModalOpen} onOpenChange={setReduceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reduce Booking Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBooking && (() => {
              const sharesPaid = selectedBooking.shares_owned_progressively || 0;
              const minQuantity = sharesPaid + 1; // Must be at least 1 more than paid
              
              return (
                <>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                    <p className="font-medium text-yellow-900 mb-1">⚠️ Important:</p>
                    <p className="text-yellow-800">
                      You've already paid for <strong>{sharesPaid} shares</strong>. 
                      You can only reduce the unpaid portion.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                    <div><strong>Current Total:</strong> {selectedBooking.quantity?.toLocaleString()} shares</div>
                    <div><strong>Already Owned:</strong> <span className="text-green-600">{sharesPaid.toLocaleString()} shares</span></div>
                    <div><strong>Still Pending:</strong> <span className="text-orange-600">{(selectedBooking.quantity - sharesPaid).toLocaleString()} shares</span></div>
                    <div className="border-t pt-1 mt-1">
                      <strong>Paid Amount:</strong> UGX {selectedBooking.cumulative_payments?.toLocaleString() || '0'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newQuantity">New Total Quantity</Label>
                    <Input
                      id="newQuantity"
                      type="number"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      max={selectedBooking.quantity - 1}
                      min={minQuantity}
                      placeholder={`Min: ${minQuantity}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum: <strong>{minQuantity.toLocaleString()} shares</strong> (must keep at least the {sharesPaid} paid shares)
                      <br />
                      Maximum: <strong>{(selectedBooking.quantity - 1).toLocaleString()} shares</strong>
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReduceModalOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleReduceQuantity} disabled={loading}>
              {loading ? 'Updating...' : 'Reduce Quantity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BookingManagementPanel;
