import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const ComplianceDetailedMetrics: React.FC = () => {
  const metrics = [
    {
      title: 'Overall Compliance Score',
      value: 87,
      target: 95,
      trend: 'up',
      change: '+2.3%',
      status: 'good',
      description: 'Based on all compliance factors'
    },
    {
      title: 'Risk Assessment Level',
      value: 23,
      target: 30,
      trend: 'down',
      change: '-1.2%',
      status: 'excellent',
      description: 'Lower is better'
    },
    {
      title: 'Policy Adherence',
      value: 94,
      target: 98,
      trend: 'up',
      change: '+0.8%',
      status: 'good',
      description: 'Percentage of compliant transactions'
    },
    {
      title: 'Regulatory Reporting',
      value: 100,
      target: 100,
      trend: 'stable',
      change: '0%',
      status: 'excellent',
      description: 'On-time submission rate'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      action: 'Policy Update',
      description: 'Updated trading limits for new accounts',
      timestamp: '2 hours ago',
      status: 'completed',
      icon: CheckCircle
    },
    {
      id: 2,
      action: 'Risk Assessment',
      description: 'Automated risk scan completed',
      timestamp: '4 hours ago',
      status: 'completed',
      icon: Shield
    },
    {
      id: 3,
      action: 'Alert Investigation',
      description: 'Investigating unusual trading pattern',
      timestamp: '6 hours ago',
      status: 'in_progress',
      icon: AlertCircle
    },
    {
      id: 4,
      action: 'Compliance Check',
      description: 'Daily compliance verification',
      timestamp: '8 hours ago',
      status: 'completed',
      icon: CheckCircle
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="w-4 h-4" />;
    }
  };

  const getActivityStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Detailed Compliance Metrics</h3>
        <Badge variant="secondary">Real-time Data</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{metric.title}</CardTitle>
                <div className="flex items-center gap-2">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-sm ${metric.trend === 'up' ? 'text-green-500' : metric.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {metric.change}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metric.value}%</span>
                  <span className="text-sm text-muted-foreground">Target: {metric.target}%</span>
                </div>
                <Progress value={metric.value} className="h-2" />
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(metric.status)}`} />
                  <span className="text-sm text-muted-foreground">{metric.description}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Compliance Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const IconComponent = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <IconComponent className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{activity.action}</p>
                        {getActivityStatusBadge(activity.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Performance Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Response Time</span>
                <span className="text-sm font-medium">2.3 seconds</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">False Positive Rate</span>
                <span className="text-sm font-medium">12%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Resolution Time</span>
                <span className="text-sm font-medium">4.2 hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">System Availability</span>
                <span className="text-sm font-medium">99.8%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Data Quality Score</span>
                <span className="text-sm font-medium">96%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Audit Trail Completeness</span>
                <span className="text-sm font-medium">100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplianceDetailedMetrics;