
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Clock, Users, DollarSign } from 'lucide-react';

interface BookingSystemManagerProps {
  onUpdate: () => void;
}

const BookingSystemManager: React.FC<BookingSystemManagerProps> = ({ onUpdate }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total_bookings: 0,
    total_value: 0,
    total_paid: 0,
    total_remaining: 0,
    active_bookings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data: bookingsData, error } = await supabase
        .from('share_bookings')
        .select(`
          *,
          profiles!share_bookings_user_id_fkey(full_name, email),
          shares(name, price_per_share)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBookings(bookingsData || []);

      // Calculate statistics
      const totalBookings = bookingsData?.length || 0;
      const totalValue = bookingsData?.reduce((sum, booking) => 
        sum + (booking.total_amount || (booking.quantity * booking.booked_price_per_share)), 0) || 0;
      const totalPaid = bookingsData?.reduce((sum, booking) => 
        sum + (booking.down_payment_amount || 0), 0) || 0;
      const totalRemaining = bookingsData?.reduce((sum, booking) => 
        sum + (booking.remaining_amount || (booking.total_amount || (booking.quantity * booking.booked_price_per_share)) - (booking.down_payment_amount || 0)), 0) || 0;
      const activeBookings = bookingsData?.filter(booking => booking.status === 'active')?.length || 0;

      setStats({
        total_bookings: totalBookings,
        total_value: totalValue,
        total_paid: totalPaid,
        total_remaining: totalRemaining,
        active_bookings: activeBookings
      });
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertBooking = async (bookingId: string) => {
    try {
      setLoading(true);
      
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      // Create share transaction
      const { error: transactionError } = await supabase
        .from('share_transactions')
        .insert({
          user_id: booking.user_id,
          share_id: booking.share_id,
          transaction_type: 'purchase',
          quantity: booking.quantity,
          price_per_share: booking.booked_price_per_share,
          currency: booking.currency,
          status: 'completed'
        });

      if (transactionError) throw transactionError;

      // Update user shares
      const { error: userSharesError } = await supabase
        .from('user_shares')
        .upsert({
          user_id: booking.user_id,
          share_id: booking.share_id,
          quantity: booking.quantity,
          purchase_price_per_share: booking.booked_price_per_share,
          currency: booking.currency
        });

      if (userSharesError) throw userSharesError;

      // Update booking status
      const { error: updateError } = await supabase
        .from('share_bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      toast.success('Booking converted to shares successfully');
      loadBookings();
      onUpdate();
    } catch (error) {
      console.error('Error converting booking:', error);
      toast.error('Failed to convert booking');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading booking system...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Booking Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.total_bookings}</p>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.total_value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-2xl font-bold text-green-600">{stats.total_paid.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-2xl font-bold text-orange-600">{stats.total_remaining.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-2xl font-bold text-blue-600">{stats.active_bookings}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Share Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{booking.profiles?.full_name}</div>
                      <div className="text-sm text-muted-foreground">{booking.profiles?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{booking.quantity.toLocaleString()}</TableCell>
                  <TableCell>{booking.currency} {booking.booked_price_per_share.toLocaleString()}</TableCell>
                  <TableCell>
                    {booking.currency} {(booking.total_amount || (booking.quantity * booking.booked_price_per_share)).toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell>
                    {new Date(booking.expires_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {booking.status === 'active' && (
                      <Button
                        size="sm"
                        onClick={() => handleConvertBooking(booking.id)}
                        disabled={loading}
                      >
                        Convert to Shares
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No bookings found
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

export default BookingSystemManager;
