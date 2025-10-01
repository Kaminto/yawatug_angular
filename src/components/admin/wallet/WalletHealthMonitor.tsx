import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HealthMetric {
  id: string;
  name: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  description: string;
}

interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  component: string;
}

const WalletHealthMonitor: React.FC = () => {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [overallHealth, setOverallHealth] = useState(95);
  const [loading, setLoading] = useState(true);

  const loadHealthMetrics = async () => {
    try {
      // Simulate health metrics calculation
      const mockMetrics: HealthMetric[] = [
        {
          id: 'transaction_success_rate',
          name: 'Transaction Success Rate',
          value: 98.5,
          threshold: 95,
          status: 'healthy',
          trend: 'up',
          description: 'Percentage of successfully completed transactions'
        },
        {
          id: 'average_response_time',
          name: 'Average Response Time',
          value: 2.3,
          threshold: 5,
          status: 'healthy',
          trend: 'stable',
          description: 'Average API response time in seconds'
        },
        {
          id: 'wallet_availability',
          name: 'Wallet Service Availability',
          value: 99.9,
          threshold: 99,
          status: 'healthy',
          trend: 'stable',
          description: 'Uptime percentage for wallet services'
        },
        {
          id: 'balance_consistency',
          name: 'Balance Consistency Check',
          value: 100,
          threshold: 99.5,
          status: 'healthy',
          trend: 'stable',
          description: 'Accuracy of balance calculations across system'
        },
        {
          id: 'fraud_detection_accuracy',
          name: 'Fraud Detection Accuracy',
          value: 96.2,
          threshold: 90,
          status: 'healthy',
          trend: 'up',
          description: 'Accuracy of fraud detection algorithms'
        },
        {
          id: 'queue_processing_time',
          name: 'Queue Processing Time',
          value: 4.8,
          threshold: 10,
          status: 'warning',
          trend: 'up',
          description: 'Average time to process queued transactions'
        }
      ];

      // Real data from database
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('status, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (transactionsData && transactionsData.length > 0) {
        const successRate = (transactionsData.filter(t => t.status === 'completed').length / transactionsData.length) * 100;
        mockMetrics[0].value = Math.round(successRate * 10) / 10;
        mockMetrics[0].status = successRate >= 95 ? 'healthy' : successRate >= 90 ? 'warning' : 'critical';
      }

      setHealthMetrics(mockMetrics);

      // Calculate overall health
      const avgHealth = mockMetrics.reduce((sum, metric) => {
        const score = metric.status === 'healthy' ? 100 : metric.status === 'warning' ? 70 : 30;
        return sum + score;
      }, 0) / mockMetrics.length;
      
      setOverallHealth(Math.round(avgHealth));

      // Generate system alerts based on metrics
      const alerts: SystemAlert[] = [];
      mockMetrics.forEach(metric => {
        if (metric.status === 'critical') {
          alerts.push({
            id: `alert-${metric.id}`,
            level: 'error',
            message: `Critical: ${metric.name} is below threshold (${metric.value}% < ${metric.threshold}%)`,
            timestamp: new Date().toISOString(),
            component: metric.name
          });
        } else if (metric.status === 'warning') {
          alerts.push({
            id: `alert-${metric.id}`,
            level: 'warning',
            message: `Warning: ${metric.name} requires attention (${metric.value}% approaching threshold)`,
            timestamp: new Date().toISOString(),
            component: metric.name
          });
        }
      });

      setSystemAlerts(alerts);
    } catch (error) {
      console.error('Error loading health metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthMetrics();
    const interval = setInterval(loadHealthMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading health monitor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Health Overview
            </CardTitle>
            <Badge variant={overallHealth >= 90 ? 'default' : overallHealth >= 70 ? 'secondary' : 'destructive'}>
              {overallHealth}% Healthy
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={overallHealth} className="h-3" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {healthMetrics.filter(m => m.status === 'healthy').length}
                </p>
                <p className="text-sm text-muted-foreground">Healthy</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {healthMetrics.filter(m => m.status === 'warning').length}
                </p>
                <p className="text-sm text-muted-foreground">Warning</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {healthMetrics.filter(m => m.status === 'critical').length}
                </p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthMetrics.map((metric) => (
          <Card key={metric.id} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(metric.status)}
                  <span className="font-medium text-sm">{metric.name}</span>
                </div>
                {getTrendIcon(metric.trend)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {metric.value}
                    {metric.name.includes('Rate') || metric.name.includes('Accuracy') || metric.name.includes('Availability') ? '%' : 's'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {metric.threshold}{metric.name.includes('Rate') || metric.name.includes('Accuracy') || metric.name.includes('Availability') ? '%' : 's'}
                  </span>
                </div>
                
                <Progress 
                  value={metric.name.includes('Time') ? 
                    Math.max(0, 100 - (metric.value / metric.threshold) * 100) :
                    (metric.value / metric.threshold) * 100
                  } 
                  className="h-2" 
                />
                
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Active System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No active alerts. System is running smoothly!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {systemAlerts.map((alert) => (
                <Alert 
                  key={alert.id}
                  variant={alert.level === 'error' ? 'destructive' : 'default'}
                >
                  {getAlertIcon(alert.level)}
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Component: {alert.component} • {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {alert.level.toUpperCase()}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletHealthMonitor;