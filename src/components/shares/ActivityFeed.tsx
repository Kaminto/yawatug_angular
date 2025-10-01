import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Clock, ArrowUpRight, ArrowDownRight, Users, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'transaction' | 'booking' | 'transfer' | 'dividend' | 'system';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  status: string;
  metadata?: any;
}

interface ActivityFeedProps {
  userId: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ userId }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (userId) {
      loadActivityFeed();
      
      // Set up real-time subscription
      const subscription = supabase
        .channel('activity-feed')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'share_transactions',
          filter: `user_id=eq.${userId}`
        }, () => {
          loadActivityFeed();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'share_sell_orders',
          filter: `user_id=eq.${userId}`
        }, () => {
          loadActivityFeed();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [userId]);

  const loadActivityFeed = async () => {
    try {
      setLoading(true);
      
      const [
        shareTransactions,
        sellOrders,
        bookings,
        transfers,
        dividends
      ] = await Promise.all([
        supabase
          .from('share_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        
        supabase
          .from('share_sell_orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        
        supabase
          .from('share_bookings')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        
        supabase
          .from('share_transfer_requests')
          .select('*')
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(10),
        
        supabase
          .from('dividend_payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const allActivities: ActivityItem[] = [];

      // Process share transactions
      if (shareTransactions.data) {
        shareTransactions.data.forEach((transaction: any) => {
          allActivities.push({
            id: `st-${transaction.id}`,
            type: 'transaction',
            title: 'Share Purchase',
            description: `Purchased ${transaction.quantity} shares at UGX ${transaction.price_per_share?.toLocaleString()}/share`,
            timestamp: transaction.created_at,
            amount: transaction.total_amount,
            status: transaction.status
          });
        });
      }

      // Process sell orders
      if (sellOrders.data) {
        sellOrders.data.forEach((order: any) => {
          allActivities.push({
            id: `so-${order.id}`,
            type: 'transaction',
            title: 'Share Sale Order',
            description: `${order.status === 'completed' ? 'Sold' : 'Listed for sale'} ${order.quantity} shares`,
            timestamp: order.created_at,
            amount: order.total_sell_value,
            status: order.status
          });
        });
      }

      // Process bookings
      if (bookings.data) {
        bookings.data.forEach((booking: any) => {
          allActivities.push({
            id: `b-${booking.id}`,
            type: 'booking',
            title: 'Share Booking',
            description: `Booking for ${booking.quantity} shares - ${booking.payment_status}`,
            timestamp: booking.created_at,
            amount: booking.total_amount,
            status: booking.payment_status
          });
        });
      }

      // Process transfers
      if (transfers.data) {
        transfers.data.forEach((transfer: any) => {
          const isSender = transfer.sender_id === userId;
          allActivities.push({
            id: `t-${transfer.id}`,
            type: 'transfer',
            title: isSender ? 'Share Transfer Sent' : 'Share Transfer Received',
            description: `${isSender ? 'Sent' : 'Received'} ${transfer.quantity} shares`,
            timestamp: transfer.created_at,
            status: transfer.status,
            metadata: { isSender }
          });
        });
      }

      // Process dividends
      if (dividends.data) {
        dividends.data.forEach((dividend: any) => {
          allActivities.push({
            id: `d-${dividend.id}`,
            type: 'dividend',
            title: 'Dividend Payment',
            description: `Received dividend payment`,
            timestamp: dividend.created_at,
            amount: dividend.amount,
            status: dividend.status || 'completed'
          });
        });
      }

      // Sort all activities by timestamp
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities);
    } catch (error) {
      console.error('Error loading activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesFilter = filter === 'all' || activity.type === filter;
    const matchesSearch = searchTerm === '' || 
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getActivityIcon = (type: string, metadata?: any) => {
    switch (type) {
      case 'transaction':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'booking':
        return <Clock className="h-4 w-4" />;
      case 'transfer':
        return metadata?.isSender ? 
          <ArrowUpRight className="h-4 w-4" /> : 
          <ArrowDownRight className="h-4 w-4" />;
      case 'dividend':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string, status: string) => {
    if (status === 'failed' || status === 'rejected') return 'bg-red-100 text-red-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    
    switch (type) {
      case 'transaction':
        return 'bg-blue-100 text-blue-800';
      case 'booking':
        return 'bg-purple-100 text-purple-800';
      case 'transfer':
        return 'bg-orange-100 text-orange-800';
      case 'dividend':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            {['all', 'transaction', 'booking', 'transfer', 'dividend'].map((type) => (
              <Button
                key={type}
                variant={filter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(type)}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Activity List */}
        <div className="space-y-3">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filter === 'all' ? 'No recent activity' : `No ${filter} activities found`}
            </div>
          ) : (
            filteredActivities.slice(0, 20).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                <div className={`p-2 rounded-full ${getActivityColor(activity.type, activity.status)}`}>
                  {getActivityIcon(activity.type, activity.metadata)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium truncate">{activity.title}</p>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={getActivityColor(activity.type, activity.status)}>
                      {activity.status}
                    </Badge>
                    
                    {activity.amount && (
                      <span className="text-sm font-medium">
                        UGX {activity.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredActivities.length > 20 && (
          <div className="text-center">
            <Button variant="outline" size="sm">
              Load More Activities
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;