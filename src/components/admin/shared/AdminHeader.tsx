import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Activity, 
  TrendingUp, 
  Users, 
  Wallet, 
  AlertTriangle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useCrossModuleData } from './CrossModuleDataProvider';
import { UnifiedNotificationCenter } from './UnifiedNotificationCenter';
import { AdminRealTimeUpdates } from './AdminRealTimeUpdates';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const AdminHeader: React.FC = () => {
  const { data, loading, refresh } = useCrossModuleData();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-lg font-semibold">
                {loading ? '...' : formatCurrency(data.totalBalance)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-lg font-semibold">
                {loading ? '...' : formatNumber(data.totalUsers)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daily Volume</p>
              <p className="text-lg font-semibold">
                {loading ? '...' : formatCurrency(data.dailyVolume)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Online Now</p>
              <p className="text-lg font-semibold">
                {loading ? '...' : formatNumber(data.onlineUsers)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={getSystemHealthColor(data.systemHealth)}>
                System {data.systemHealth}
              </Badge>
              
              {data.criticalAlerts > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {data.criticalAlerts} Alert{data.criticalAlerts !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Pending:</span>
              <Badge variant="outline">{data.pendingTransactions} Transactions</Badge>
              <Badge variant="outline">{data.pendingVerifications} Verifications</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Popover open={showActivity} onOpenChange={setShowActivity}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Activity className="h-4 w-4 mr-1" />
                  Live Activity
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" side="bottom" align="end">
                <AdminRealTimeUpdates />
              </PopoverContent>
            </Popover>

            <Popover open={showNotifications} onOpenChange={setShowNotifications}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Bell className="h-4 w-4 mr-1" />
                  Notifications
                  {data.criticalAlerts > 0 && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" side="bottom" align="end">
                <UnifiedNotificationCenter />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};