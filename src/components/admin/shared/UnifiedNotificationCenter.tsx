import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bell, Check, AlertTriangle, TrendingUp, Users, Wallet, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'wallet' | 'user' | 'transaction' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

export const UnifiedNotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
    setupRealTimeUpdates();
  }, []);

  const fetchNotifications = async () => {
    try {
      // Mock notifications - in real app, fetch from backend
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'transaction',
          priority: 'high',
          title: 'High Value Transaction Pending',
          message: '5 transactions over $10,000 require approval',
          actionUrl: '/admin/wallet',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          metadata: { count: 5, amount: 75000 }
        },
        {
          id: '2',
          type: 'user',
          priority: 'medium',
          title: 'User Verification Queue',
          message: '12 users awaiting verification',
          actionUrl: '/admin/users',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          metadata: { count: 12 }
        },
        {
          id: '3',
          type: 'wallet',
          priority: 'critical',
          title: 'Low Admin Fund Balance',
          message: 'Admin fund balance below threshold: $2,500',
          actionUrl: '/admin/wallet',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          metadata: { balance: 2500, threshold: 5000 }
        }
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeUpdates = () => {
    // Real-time subscription for cross-module updates
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        // Refresh transaction-related notifications
        fetchNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        // Refresh user-related notifications
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast({ title: "All notifications marked as read" });
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'wallet': return <Wallet className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      case 'transaction': return <TrendingUp className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'critical') return n.priority === 'critical';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const criticalCount = notifications.filter(n => n.priority === 'critical').length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === 'critical' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setFilter('critical')}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Critical ({criticalCount})
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No notifications to show
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <div 
                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer relative ${
                      !notification.isRead ? 'bg-muted/30' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getTypeIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          <Badge 
                            variant={getPriorityColor(notification.priority)}
                            className="text-xs"
                          >
                            {notification.priority}
                          </Badge>
                          {!notification.isRead && (
                            <div className="h-2 w-2 bg-primary rounded-full" />
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{getTimeAgo(notification.createdAt)}</span>
                          {notification.actionUrl && (
                            <span className="text-primary">Click to view →</span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {index < filteredNotifications.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};