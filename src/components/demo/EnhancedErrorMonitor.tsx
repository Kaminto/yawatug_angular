import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Activity,
  Database,
  Zap,
  AlertCircle
} from 'lucide-react';

interface ErrorCollector {
  step: string;
  error: string;
  timestamp: string;
  critical: boolean;
}

interface SystemHealth {
  edgeFunctions: 'healthy' | 'degraded' | 'failed';
  database: 'healthy' | 'degraded' | 'failed';
  authentication: 'healthy' | 'degraded' | 'failed';
  overallScore: number;
}

interface EnhancedErrorMonitorProps {
  errors: ErrorCollector[];
  simulationRunning: boolean;
  onClearErrors: () => void;
  onRetryFailedSteps: () => void;
}

const EnhancedErrorMonitor: React.FC<EnhancedErrorMonitorProps> = ({
  errors,
  simulationRunning,
  onClearErrors,
  onRetryFailedSteps
}) => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    edgeFunctions: 'healthy',
    database: 'healthy',
    authentication: 'healthy',
    overallScore: 100
  });

  const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Analyze errors to determine system health
    const recentErrors = errors.filter(e => 
      Date.now() - new Date(e.timestamp).getTime() < 300000 // Last 5 minutes
    );

    const edgeFunctionErrors = recentErrors.filter(e => 
      e.error.toLowerCase().includes('setup') || e.error.toLowerCase().includes('function')
    );
    const dbErrors = recentErrors.filter(e => 
      e.error.toLowerCase().includes('database') || e.error.toLowerCase().includes('constraint')
    );
    const authErrors = recentErrors.filter(e => 
      e.error.toLowerCase().includes('auth') || e.error.toLowerCase().includes('login')
    );

    const newHealth: SystemHealth = {
      edgeFunctions: edgeFunctionErrors.length > 2 ? 'failed' : edgeFunctionErrors.length > 0 ? 'degraded' : 'healthy',
      database: dbErrors.length > 2 ? 'failed' : dbErrors.length > 0 ? 'degraded' : 'healthy',
      authentication: authErrors.length > 1 ? 'failed' : authErrors.length > 0 ? 'degraded' : 'healthy',
      overallScore: Math.max(0, 100 - (recentErrors.length * 15))
    };

    setSystemHealth(newHealth);
  }, [errors]);

  const getHealthColor = (status: 'healthy' | 'degraded' | 'failed') => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
    }
  };

  const getHealthIcon = (status: 'healthy' | 'degraded' | 'failed') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
    }
  };

  const criticalErrors = errors.filter(e => e.critical);
  const warningErrors = errors.filter(e => !e.critical);

  const getErrorTypeAnalysis = () => {
    const errorTypes = {
      uuid: errors.filter(e => e.error.toLowerCase().includes('uuid')).length,
      constraint: errors.filter(e => e.error.toLowerCase().includes('constraint')).length,
      timeout: errors.filter(e => e.error.toLowerCase().includes('timeout')).length,
      auth: errors.filter(e => e.error.toLowerCase().includes('auth')).length,
      network: errors.filter(e => e.error.toLowerCase().includes('network')).length
    };

    return Object.entries(errorTypes)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a);
  };

  const errorAnalysis = getErrorTypeAnalysis();

  return (
    <div className="space-y-4">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Monitor
          </CardTitle>
          <CardDescription>
            Real-time monitoring of demo simulation infrastructure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Health Score</span>
              <Badge variant={systemHealth.overallScore > 80 ? 'default' : systemHealth.overallScore > 50 ? 'secondary' : 'destructive'}>
                {systemHealth.overallScore}%
              </Badge>
            </div>
            <Progress value={systemHealth.overallScore} className="w-full" />
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className={`flex items-center gap-2 ${getHealthColor(systemHealth.edgeFunctions)}`}>
                <Zap className="h-4 w-4" />
                {getHealthIcon(systemHealth.edgeFunctions)}
                <span>Edge Functions</span>
              </div>
              <div className={`flex items-center gap-2 ${getHealthColor(systemHealth.database)}`}>
                <Database className="h-4 w-4" />
                {getHealthIcon(systemHealth.database)}
                <span>Database</span>
              </div>
              <div className={`flex items-center gap-2 ${getHealthColor(systemHealth.authentication)}`}>
                <CheckCircle className="h-4 w-4" />
                {getHealthIcon(systemHealth.authentication)}
                <span>Authentication</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Analysis */}
      {errorAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Pattern Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {errorAnalysis.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize text-sm">{type} Errors</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{count}</Badge>
                    <div className="w-16 bg-secondary h-2 rounded">
                      <div 
                        className="bg-destructive h-2 rounded" 
                        style={{ width: `${Math.min(100, (count / errors.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Details */}
      {errors.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Error Log ({errors.length})
              </CardTitle>
              <CardDescription>
                {criticalErrors.length} critical, {warningErrors.length} warnings
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onRetryFailedSteps} disabled={simulationRunning}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Failed
              </Button>
              <Button variant="outline" size="sm" onClick={onClearErrors}>
                Clear Log
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {errors.slice().reverse().map((error, index) => (
                <div key={index} className={`p-3 rounded-lg border ${error.critical ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={error.critical ? 'destructive' : 'secondary'} className="text-xs">
                          {error.step}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {error.critical ? 'Critical' : 'Warning'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{error.error}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Errors State */}
      {errors.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Systems Operational</h3>
            <p className="text-sm text-gray-600 text-center">
              No errors detected. The simulation environment is running smoothly.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedErrorMonitor;