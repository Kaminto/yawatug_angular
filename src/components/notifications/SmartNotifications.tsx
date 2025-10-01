import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bell,
  TrendingUp,
  TrendingDown,
  Users,
  Gift,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'market' | 'portfolio' | 'social' | 'system' | 'opportunity';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionText?: string;
  data?: any;
}

interface NotificationSettings {
  marketAlerts: boolean;
  portfolioUpdates: boolean;
  socialActivity: boolean;
  promotions: boolean;
  systemUpdates: boolean;
  priceThreshold: number;
  portfolioChangeThreshold: number;
}

interface SmartNotificationsProps {
  userStats?: {
    portfolioValue: number;
    dailyChange: number;
    weeklyChange: number;
  };
}

const SmartNotifications: React.FC<SmartNotificationsProps> = ({ 
  userStats = {
    portfolioValue: 912000,
    dailyChange: 2.1,
    weeklyChange: -1.5
  }
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    marketAlerts: true,
    portfolioUpdates: true,
    socialActivity: false,
    promotions: true,
    systemUpdates: true,
    priceThreshold: 5,
    portfolioChangeThreshold: 10
  });
  const [showSettings, setShowSettings] = useState(false);

  // Generate smart notifications based on user data
  useEffect(() => {
    const generateSmartNotifications = (): Notification[] => {
      const now = new Date();
      const notifications: Notification[] = [];

      // Market opportunity notification
      if (settings.marketAlerts) {
        notifications.push({
          id: 'market_opportunity_1',
          type: 'opportunity',
          title: 'Gold Price Dip Alert',
          message: 'Gold prices dropped 2.1% today - perfect buying opportunity!',
          timestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          read: false,
          priority: 'high',
          actionText: 'Invest Now',
          actionUrl: '/share-trading'
        });
      }

      // Portfolio performance update
      if (settings.portfolioUpdates && Math.abs(userStats.dailyChange) > 1) {
        notifications.push({
          id: 'portfolio_update_1',
          type: 'portfolio',
          title: userStats.dailyChange > 0 ? 'Portfolio Growing!' : 'Portfolio Update',
          message: `Your portfolio ${userStats.dailyChange > 0 ? 'gained' : 'decreased'} ${Math.abs(userStats.dailyChange)}% today (UGX ${Math.abs(userStats.dailyChange * userStats.portfolioValue / 100).toLocaleString()})`,
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          read: false,
          priority: userStats.dailyChange > 5 ? 'high' : 'medium'
        });
      }

      // Social activity notification
      if (settings.socialActivity) {
        notifications.push({
          id: 'social_activity_1',
          type: 'social',
          title: 'Referral Bonus Available',
          message: 'Sarah K. just joined using your referral code. Claim your UGX 25,000 bonus!',
          timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
          read: false,
          priority: 'medium',
          actionText: 'Claim Bonus',
          actionUrl: '/referrals'
        });
      }

      // Promotional notification
      if (settings.promotions) {
        notifications.push({
          id: 'promotion_1',
          type: 'market',
          title: 'Limited Time: 0% Fees',
          message: 'Invest UGX 100K+ this week and pay zero transaction fees!',
          timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
          read: true,
          priority: 'medium',
          actionText: 'Learn More',
          actionUrl: '/promotions'
        });
      }

      // System update
      if (settings.systemUpdates) {
        notifications.push({
          id: 'system_update_1',
          type: 'system',
          title: 'Profile Verification Reminder',
          message: 'Complete your profile verification to unlock higher investment limits',
          timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
          read: true,
          priority: 'low',
          actionText: 'Verify Now',
          actionUrl: '/profile/verification'
        });
      }

      return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    };

    setNotifications(generateSmartNotifications());
  }, [settings, userStats]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'market': return <TrendingUp className="w-4 h-4" />;
      case 'portfolio': return <TrendingDown className="w-4 h-4" />;
      case 'social': return <Users className="w-4 h-4" />;
      case 'opportunity': return <Gift className="w-4 h-4" />;
      case 'system': return <AlertTriangle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/10';
      case 'medium': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/10';
      case 'low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    toast.success('Notification dismissed');
  };

  const handleNotificationAction = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      // Navigate to action URL
      console.log('Navigate to:', notification.actionUrl);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (showSettings) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Notification Settings
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSettings(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notification Type Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Market Alerts</p>
                <p className="text-sm text-muted-foreground">Price changes and opportunities</p>
              </div>
              <Switch 
                checked={settings.marketAlerts}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, marketAlerts: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Portfolio Updates</p>
                <p className="text-sm text-muted-foreground">Performance and balance changes</p>
              </div>
              <Switch 
                checked={settings.portfolioUpdates}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, portfolioUpdates: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Social Activity</p>
                <p className="text-sm text-muted-foreground">Referrals and community updates</p>
              </div>
              <Switch 
                checked={settings.socialActivity}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, socialActivity: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Promotions</p>
                <p className="text-sm text-muted-foreground">Special offers and bonuses</p>
              </div>
              <Switch 
                checked={settings.promotions}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, promotions: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">System Updates</p>
                <p className="text-sm text-muted-foreground">App updates and reminders</p>
              </div>
              <Switch 
                checked={settings.systemUpdates}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, systemUpdates: checked }))
                }
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={() => setShowSettings(false)}
              className="flex-1"
            >
              Save Settings
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowSettings(false)}
            >
              Cancel
            </Button>
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
            <Bell className="w-5 h-5 text-primary" />
            Smart Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground">No new notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  notification.read 
                    ? 'bg-muted/30 border-border' 
                    : 'bg-card border-primary/20 shadow-sm'
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getPriorityColor(notification.priority)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-medium text-sm ${
                        notification.read ? 'text-muted-foreground' : 'text-foreground'
                      }`}>
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                          className="h-auto p-1"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    
                    {notification.actionText && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationAction(notification);
                        }}
                        className="h-7 text-xs"
                      >
                        {notification.actionText}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartNotifications;