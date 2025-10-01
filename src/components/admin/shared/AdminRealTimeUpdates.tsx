import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, TrendingUp, Users, Wallet, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCrossModuleData } from './CrossModuleDataProvider';

interface RealTimeActivity {
  id: string;
  type: 'transaction' | 'user_action' | 'system_event';
  title: string;
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  metadata?: any;
}

export const AdminRealTimeUpdates: React.FC = () => {
  const [activities, setActivities] = useState<RealTimeActivity[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { updateMetric } = useCrossModuleData();

  useEffect(() => {
    setupRealTimeConnection();
    
    return () => {
      // Cleanup subscriptions handled by individual channels
    };
  }, []);

  const setupRealTimeConnection = () => {
    // Transaction updates
    const transactionChannel = supabase
      .channel('realtime-transactions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions'
      }, (payload) => {
        const newActivity: RealTimeActivity = {
          id: `txn-${payload.new.id}`,
          type: 'transaction',
          title: 'New Transaction',
          description: `${payload.new.transaction_type} of ${payload.new.currency} ${Math.abs(payload.new.amount)}`,
          timestamp: new Date().toISOString(),
          severity: payload.new.amount > 10000 ? 'warning' : 'info',
          metadata: payload.new
        };
        
        addActivity(newActivity);
        updateMetric('recentActivity', activities => [newActivity, ...activities.slice(0, 9)]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'transactions'
      }, (payload) => {
        if (payload.old.approval_status !== payload.new.approval_status) {
          const newActivity: RealTimeActivity = {
            id: `txn-update-${payload.new.id}`,
            type: 'transaction',
            title: 'Transaction Status Updated',
            description: `Transaction ${payload.new.approval_status}`,
            timestamp: new Date().toISOString(),
            severity: payload.new.approval_status === 'approved' ? 'success' : 'warning',
            metadata: payload.new
          };
          
          addActivity(newActivity);
        }
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // User profile updates
    const profileChannel = supabase
      .channel('realtime-profiles')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'profiles'
      }, (payload) => {
        const newActivity: RealTimeActivity = {
          id: `user-${payload.new.id}`,
          type: 'user_action',
          title: 'New User Registration',
          description: `${payload.new.full_name || 'User'} joined the platform`,
          timestamp: new Date().toISOString(),
          severity: 'success',
          metadata: payload.new
        };
        
        addActivity(newActivity);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      }, (payload) => {
        if (payload.old.status !== payload.new.status) {
          const newActivity: RealTimeActivity = {
            id: `user-status-${payload.new.id}`,
            type: 'user_action',
            title: 'User Status Changed',
            description: `User ${payload.new.status}`,
            timestamp: new Date().toISOString(),
            severity: payload.new.status === 'active' ? 'success' : 'warning',
            metadata: payload.new
          };
          
          addActivity(newActivity);
        }
      })
      .subscribe();

    // Wallet balance updates
    const walletChannel = supabase
      .channel('realtime-wallets')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'admin_sub_wallets'
      }, (payload) => {
        if (payload.old.balance !== payload.new.balance) {
          const change = payload.new.balance - payload.old.balance;
          const newActivity: RealTimeActivity = {
            id: `wallet-${payload.new.id}`,
            type: 'system_event',
            title: 'Admin Wallet Updated',
            description: `${payload.new.wallet_type} balance ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}`,
            timestamp: new Date().toISOString(),
            severity: change > 0 ? 'success' : 'info',
            metadata: payload.new
          };
          
          addActivity(newActivity);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(transactionChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(walletChannel);
    };
  };

  const addActivity = (activity: RealTimeActivity) => {
    setActivities(prev => [activity, ...prev.slice(0, 49)]); // Keep last 50 activities
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <TrendingUp className="h-4 w-4" />;
      case 'user_action': return <Users className="h-4 w-4" />;
      case 'system_event': return <Wallet className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {activities.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No recent activity
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {activities.map((activity, index) => (
                <div 
                  key={activity.id}
                  className={`flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                    index === 0 ? 'bg-muted/30' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{activity.title}</h4>
                      <Badge 
                        variant={getSeverityColor(activity.severity)}
                        className="text-xs"
                      >
                        {activity.severity}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1">
                      {activity.description}
                    </p>
                    
                    <span className="text-xs text-muted-foreground">
                      {getTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};