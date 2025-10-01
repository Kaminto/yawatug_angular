import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, User, TrendingDown } from 'lucide-react';

const ComplianceActiveAlerts: React.FC = () => {
  const alerts = [
    {
      id: 1,
      type: 'high_volume_trading',
      severity: 'high',
      title: 'Unusual Trading Volume Detected',
      description: 'User ID: 12345 has executed 15 trades in the last hour, exceeding normal patterns',
      timestamp: '2 minutes ago',
      icon: TrendingDown,
      action: 'Review Account'
    },
    {
      id: 2,
      type: 'account_verification',
      severity: 'medium',
      title: 'Pending Account Verification',
      description: 'Account verification has been pending for more than 72 hours',
      timestamp: '1 hour ago',
      icon: User,
      action: 'Review Documents'
    },
    {
      id: 3,
      type: 'system_timeout',
      severity: 'low',
      title: 'System Response Time Alert',
      description: 'API response times have increased by 15% in the last 30 minutes',
      timestamp: '30 minutes ago',
      icon: Clock,
      action: 'Check System'
    },
    {
      id: 4,
      type: 'suspicious_pattern',
      severity: 'high',
      title: 'Suspicious Trading Pattern',
      description: 'Coordinated trading activity detected across multiple accounts',
      timestamp: '5 minutes ago',
      icon: AlertTriangle,
      action: 'Investigate'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Active Compliance Alerts</h3>
        <Badge variant="destructive">4 Active</Badge>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert) => {
          const IconComponent = alert.icon;
          return (
            <Card key={alert.id} className="border-l-4 border-l-destructive">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5 text-destructive" />
                    <div>
                      <CardTitle className="text-base">{alert.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getSeverityColor(alert.severity)}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{alert.timestamp}</span>
                  <Button variant="outline" size="sm">
                    {alert.action}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alert Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-destructive">2</div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500">1</div>
              <div className="text-sm text-muted-foreground">Medium Priority</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">1</div>
              <div className="text-sm text-muted-foreground">Low Priority</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceActiveAlerts;