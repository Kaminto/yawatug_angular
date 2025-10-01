import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Settings, 
  BarChart3, 
  AlertTriangle, 
  RefreshCw, 
  Download,
  TrendingUp,
  Users
} from 'lucide-react';

interface QuickActionsPanelProps {
  onNavigate: (tab: string) => void;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ onNavigate }) => {
  const quickStats = [
    { label: 'Active Orders', value: '23', trend: '+5' },
    { label: 'Pending Alerts', value: '4', trend: '-2' },
    { label: 'Today\'s Volume', value: '1.2M', trend: '+15%' }
  ];

  const quickActions = [
    {
      title: 'Issue New Shares',
      description: 'Create new share issuance',
      icon: Plus,
      action: () => onNavigate('share-pool'),
      variant: 'default' as const
    },
    {
      title: 'Update Pricing',
      description: 'Modify share pricing settings',
      icon: TrendingUp,
      action: () => onNavigate('settings'),
      variant: 'outline' as const
    },
    {
      title: 'Generate Reports',
      description: 'Create compliance reports',
      icon: BarChart3,
      action: () => onNavigate('reports'),
      variant: 'outline' as const
    },
    {
      title: 'Review Alerts',
      description: 'Check compliance alerts',
      icon: AlertTriangle,
      action: () => onNavigate('compliance'),
      variant: 'destructive' as const,
      badge: '4'
    }
  ];

  const systemActions = [
    {
      title: 'Refresh Data',
      icon: RefreshCw,
      action: () => window.location.reload()
    },
    {
      title: 'Export Data',
      icon: Download,
      action: () => console.log('Export initiated')
    },
    {
      title: 'System Settings',
      icon: Settings,
      action: () => onNavigate('settings')
    }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5" />
          Quick Actions & Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Quick Stats - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stat.trend}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Action Sections - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Primary Actions */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Primary Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant}
                  size="default"
                  onClick={action.action}
                  className="justify-start h-auto p-4 relative"
                >
                  <action.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{action.title}</div>
                    <div className="text-xs opacity-70 mt-1 truncate">{action.description}</div>
                  </div>
                  {action.badge && (
                    <Badge variant="destructive" className="ml-2 absolute -top-1 -right-1 min-w-6 h-6 text-xs px-1">
                      {action.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* System Actions */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">System Actions</h4>
            <div className="grid grid-cols-1 gap-2">
              {systemActions.map((action, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="default"
                  onClick={action.action}
                  className="justify-start h-12"
                >
                  <action.icon className="h-4 w-4 mr-3" />
                  {action.title}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsPanel;