
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';

interface RealAnomaly {
  id: string;
  type: 'volume_spike' | 'frequency_anomaly' | 'amount_outlier' | 'time_pattern' | 'user_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: {
    userId?: string;
    userName?: string;
    baselineValue: number;
    currentValue: number;
    deviationPercentage: number;
    timeWindow: string;
  };
  detectedAt: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  confidence: number;
}

const RealAnomalyDetectionPanel: React.FC = () => {
  const [anomalies, setAnomalies] = useState<RealAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAnomalies: 0,
    newAnomalies: 0,
    criticalAnomalies: 0,
    resolvedToday: 0
  });

  const detectVolumeAnomalies = async (): Promise<RealAnomaly[]> => {
    const anomalies: RealAnomaly[] = [];
    
    try {
      // Get daily transaction volumes for the past 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, created_at, user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'completed');

      if (!transactions) return anomalies;

      // Group by day and calculate daily volumes
      const dailyVolumes = new Map<string, number>();
      transactions.forEach(tx => {
        const date = new Date(tx.created_at).toDateString();
        dailyVolumes.set(date, (dailyVolumes.get(date) || 0) + Math.abs(tx.amount));
      });

      // Calculate baseline (average of past 30 days excluding today)
      const volumes = Array.from(dailyVolumes.values());
      const todayVolume = dailyVolumes.get(new Date().toDateString()) || 0;
      const baselineVolume = volumes.length > 1 ? 
        volumes.filter((_, i, arr) => i < arr.length - 1).reduce((sum, vol) => sum + vol, 0) / (volumes.length - 1) : 0;

      // Detect volume spike (today's volume is 200% higher than baseline)
      if (baselineVolume > 0 && todayVolume > baselineVolume * 2) {
        const deviationPercentage = ((todayVolume - baselineVolume) / baselineVolume) * 100;
        anomalies.push({
          id: `volume-spike-${Date.now()}`,
          type: 'volume_spike',
          severity: deviationPercentage > 500 ? 'critical' : deviationPercentage > 300 ? 'high' : 'medium',
          description: `Daily transaction volume spike detected`,
          details: {
            baselineValue: baselineVolume,
            currentValue: todayVolume,
            deviationPercentage,
            timeWindow: '24 hours'
          },
          detectedAt: new Date().toISOString(),
          status: 'new',
          confidence: Math.min(95, 60 + (deviationPercentage / 10))
        });
      }
    } catch (error) {
      console.error('Error detecting volume anomalies:', error);
    }

    return anomalies;
  };

  const detectFrequencyAnomalies = async (): Promise<RealAnomaly[]> => {
    const anomalies: RealAnomaly[] = [];
    
    try {
      // Get user transaction frequencies
      const { data: userTransactions } = await supabase
        .from('transactions')
        .select('user_id, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!userTransactions) return anomalies;

      // Group by user
      const userFrequency = new Map<string, number>();
      userTransactions.forEach(tx => {
        userFrequency.set(tx.user_id, (userFrequency.get(tx.user_id) || 0) + 1);
      });

      // Get user profiles for high-frequency users
      const highFrequencyUsers = Array.from(userFrequency.entries())
        .filter(([_, count]) => count > 10) // More than 10 transactions in 24h
        .map(([userId]) => userId);

      if (highFrequencyUsers.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', highFrequencyUsers);

        highFrequencyUsers.forEach(userId => {
          const count = userFrequency.get(userId) || 0;
          const user = profiles?.find(p => p.id === userId);
          
          anomalies.push({
            id: `freq-${userId}-${Date.now()}`,
            type: 'frequency_anomaly',
            severity: count > 50 ? 'critical' : count > 30 ? 'high' : 'medium',
            description: `Unusual transaction frequency detected for user`,
            details: {
              userId,
              userName: user?.full_name || 'Unknown User',
              baselineValue: 5, // Normal users do ~5 transactions/day
              currentValue: count,
              deviationPercentage: ((count - 5) / 5) * 100,
              timeWindow: '24 hours'
            },
            detectedAt: new Date().toISOString(),
            status: 'new',
            confidence: Math.min(95, 70 + Math.min(25, count - 10))
          });
        });
      }
    } catch (error) {
      console.error('Error detecting frequency anomalies:', error);
    }

    return anomalies;
  };

  const detectAmountOutliers = async (): Promise<RealAnomaly[]> => {
    const anomalies: RealAnomaly[] = [];
    
    try {
      // Get transactions from the last 7 days
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, user_id, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .eq('status', 'completed');

      if (!transactions || transactions.length === 0) return anomalies;

      // Calculate statistical measures
      const amounts = transactions.map(tx => Math.abs(tx.amount));
      const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const threshold = mean + (3 * stdDev); // 3 standard deviations

      // Find outliers
      const outliers = transactions.filter(tx => Math.abs(tx.amount) > threshold);
      
      if (outliers.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', outliers.map(tx => tx.user_id));

        outliers.forEach(tx => {
          const user = profiles?.find(p => p.id === tx.user_id);
          const amount = Math.abs(tx.amount);
          const deviationPercentage = ((amount - mean) / mean) * 100;
          
          anomalies.push({
            id: `outlier-${tx.user_id}-${Date.now()}`,
            type: 'amount_outlier',
            severity: amount > threshold * 2 ? 'critical' : amount > threshold * 1.5 ? 'high' : 'medium',
            description: `Statistical outlier transaction amount detected`,
            details: {
              userId: tx.user_id,
              userName: user?.full_name || 'Unknown User',
              baselineValue: mean,
              currentValue: amount,
              deviationPercentage,
              timeWindow: '7 days'
            },
            detectedAt: new Date().toISOString(),
            status: 'new',
            confidence: Math.min(95, 80 + Math.min(15, deviationPercentage / 100))
          });
        });
      }
    } catch (error) {
      console.error('Error detecting amount outliers:', error);
    }

    return anomalies;
  };

  const runAnomalyDetection = async () => {
    try {
      setLoading(true);
      
      const [volumeAnomalies, frequencyAnomalies, amountAnomalies] = await Promise.all([
        detectVolumeAnomalies(),
        detectFrequencyAnomalies(),
        detectAmountOutliers()
      ]);

      const allAnomalies = [...volumeAnomalies, ...frequencyAnomalies, ...amountAnomalies];
      setAnomalies(allAnomalies);

      // Calculate stats
      setStats({
        totalAnomalies: allAnomalies.length,
        newAnomalies: allAnomalies.filter(a => a.status === 'new').length,
        criticalAnomalies: allAnomalies.filter(a => a.severity === 'critical').length,
        resolvedToday: 0 // Would come from a separate tracking table in real implementation
      });

    } catch (error) {
      console.error('Error running anomaly detection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnomalyAction = async (anomalyId: string, action: string) => {
    setAnomalies(prev => prev.map(anomaly => 
      anomaly.id === anomalyId 
        ? { ...anomaly, status: action as any }
        : anomaly
    ));
  };

  useEffect(() => {
    runAnomalyDetection();
    
    // Run detection every 30 minutes
    const interval = setInterval(runAnomalyDetection, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'secondary',
      medium: 'default',
      high: 'destructive',
      critical: 'destructive'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'investigating':
        return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'false_positive':
        return <Activity className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading real anomaly detection...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Anomalies</p>
                <p className="text-2xl font-bold">{stats.totalAnomalies}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.newAnomalies}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalAnomalies}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Detection Run</p>
                <Button variant="outline" size="sm" onClick={runAnomalyDetection}>
                  <Activity className="h-4 w-4 mr-1" />
                  Run Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real Anomalies List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Real-Time Anomaly Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {anomalies.map((anomaly) => (
              <Alert key={anomaly.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(anomaly.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityBadge(anomaly.severity)}
                        <Badge variant="outline">{anomaly.type.replace('_', ' ')}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {anomaly.confidence.toFixed(0)}% confidence
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(anomaly.detectedAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold mb-1">{anomaly.description}</h3>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        {anomaly.details.userName && (
                          <p><span className="font-medium">User:</span> {anomaly.details.userName}</p>
                        )}
                        <p><span className="font-medium">Baseline:</span> {anomaly.details.baselineValue.toLocaleString()}</p>
                        <p><span className="font-medium">Current:</span> {anomaly.details.currentValue.toLocaleString()}</p>
                        <p><span className="font-medium">Deviation:</span> {anomaly.details.deviationPercentage.toFixed(1)}%</p>
                        <p><span className="font-medium">Time Window:</span> {anomaly.details.timeWindow}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {anomaly.status === 'new' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAnomalyAction(anomaly.id, 'investigating')}
                        >
                          Investigate
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAnomalyAction(anomaly.id, 'false_positive')}
                        >
                          False Positive
                        </Button>
                      </>
                    )}
                    
                    {anomaly.status === 'investigating' && (
                      <Button 
                        size="sm"
                        onClick={() => handleAnomalyAction(anomaly.id, 'resolved')}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </Alert>
            ))}

            {anomalies.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>No anomalies detected. System is operating normally!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealAnomalyDetectionPanel;
