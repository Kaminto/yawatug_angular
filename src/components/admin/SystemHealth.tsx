
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';

interface SystemMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: number;
  unit: string;
  threshold: number;
}

const SystemHealth: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([
    { name: 'Database Response Time', status: 'healthy', value: 45, unit: 'ms', threshold: 100 },
    { name: 'API Response Time', status: 'healthy', value: 120, unit: 'ms', threshold: 200 },
    { name: 'Storage Usage', status: 'warning', value: 78, unit: '%', threshold: 80 },
    { name: 'Active Users', status: 'healthy', value: 1247, unit: 'users', threshold: 2000 },
    { name: 'Transaction Success Rate', status: 'healthy', value: 99.8, unit: '%', threshold: 95 },
    { name: 'Error Rate', status: 'healthy', value: 0.2, unit: '%', threshold: 1 }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric, index) => (
              <Card key={index} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(metric.status)}
                      <span className="text-sm font-medium">{metric.name}</span>
                    </div>
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold">
                        {metric.value}{metric.unit}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Threshold: {metric.threshold}{metric.unit}
                      </span>
                    </div>
                    
                    {metric.unit === '%' && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(metric.status)}`}
                          style={{ width: `${Math.min(metric.value, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Storage usage approaching limit</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Database backup completed successfully</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Database</span>
                <Badge className="bg-green-100 text-green-800">Online</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>API Gateway</span>
                <Badge className="bg-green-100 text-green-800">Online</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Payment Gateway</span>
                <Badge className="bg-green-100 text-green-800">Online</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Storage Service</span>
                <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemHealth;
