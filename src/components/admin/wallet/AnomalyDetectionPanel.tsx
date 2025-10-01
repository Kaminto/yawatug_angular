import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  TrendingUp, 
  Clock,
  Ban,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Anomaly {
  id: string;
  type: 'suspicious_volume' | 'unusual_pattern' | 'velocity_check' | 'geographic' | 'amount_threshold';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: Record<string, any>;
  userId?: string;
  transactionId?: string;
  detectedAt: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  investigatedBy?: string;
  resolutionNotes?: string;
}

interface DetectionRule {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  threshold: number;
  timeWindow: number;
  description: string;
}

const AnomalyDetectionPanel: React.FC = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [detectionRules, setDetectionRules] = useState<DetectionRule[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAnomalies: 0,
    newAnomalies: 0,
    criticalAnomalies: 0,
    resolvedToday: 0
  });

  const loadAnomalies = async () => {
    try {
      // Simulate anomaly detection
      const mockAnomalies: Anomaly[] = [
        {
          id: '1',
          type: 'suspicious_volume',
          severity: 'high',
          description: 'User exceeded daily transaction limit by 300%',
          details: {
            userId: 'user-123',
            dailyLimit: 5000000,
            actualAmount: 15000000,
            transactionCount: 12
          },
          userId: 'user-123',
          detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'new'
        },
        {
          id: '2',
          type: 'unusual_pattern',
          severity: 'medium',
          description: 'Rapid succession of small withdrawals detected',
          details: {
            transactionCount: 25,
            totalAmount: 250000,
            timeSpan: '15 minutes',
            averageAmount: 10000
          },
          userId: 'user-456',
          detectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'investigating'
        },
        {
          id: '3',
          type: 'velocity_check',
          severity: 'critical',
          description: 'Transaction velocity 10x higher than user baseline',
          details: {
            baselineVelocity: '2 transactions/hour',
            currentVelocity: '20 transactions/hour',
            duration: '2 hours'
          },
          userId: 'user-789',
          detectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          status: 'new'
        },
        {
          id: '4',
          type: 'amount_threshold',
          severity: 'low',
          description: 'Single transaction above UGX 50M threshold',
          details: {
            amount: 75000000,
            threshold: 50000000,
            currency: 'UGX'
          },
          transactionId: 'txn-abc123',
          detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          status: 'resolved',
          investigatedBy: 'admin-001',
          resolutionNotes: 'Verified legitimate business transaction'
        }
      ];

      // Load real transaction data for analysis
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('user_id, amount, currency, transaction_type, created_at, status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (recentTransactions) {
        // Analyze for actual anomalies
        const userTransactionMap = new Map<string, any[]>();
        recentTransactions.forEach(tx => {
          if (!userTransactionMap.has(tx.user_id)) {
            userTransactionMap.set(tx.user_id, []);
          }
          userTransactionMap.get(tx.user_id)!.push(tx);
        });

        // Check for high-volume users
        userTransactionMap.forEach((transactions, userId) => {
          const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
          if (totalAmount > 10000000 && transactions.length > 5) {
            mockAnomalies.push({
              id: `real-${userId}-volume`,
              type: 'suspicious_volume',
              severity: 'medium',
              description: `High volume detected: ${totalAmount.toLocaleString()} UGX in ${transactions.length} transactions`,
              details: {
                userId,
                totalAmount,
                transactionCount: transactions.length,
                timespan: '24 hours'
              },
              userId,
              detectedAt: new Date().toISOString(),
              status: 'new'
            });
          }
        });
      }

      setAnomalies(mockAnomalies);

      // Calculate stats
      setStats({
        totalAnomalies: mockAnomalies.length,
        newAnomalies: mockAnomalies.filter(a => a.status === 'new').length,
        criticalAnomalies: mockAnomalies.filter(a => a.severity === 'critical').length,
        resolvedToday: mockAnomalies.filter(a => 
          a.status === 'resolved' && 
          new Date(a.detectedAt).toDateString() === new Date().toDateString()
        ).length
      });

      // Mock detection rules
      setDetectionRules([
        {
          id: 'rule-1',
          name: 'Daily Volume Threshold',
          type: 'volume',
          enabled: true,
          threshold: 5000000,
          timeWindow: 24,
          description: 'Alert when user exceeds daily transaction volume limit'
        },
        {
          id: 'rule-2',
          name: 'Rapid Transaction Pattern',
          type: 'velocity',
          enabled: true,
          threshold: 10,
          timeWindow: 1,
          description: 'Alert when transaction frequency exceeds baseline'
        },
        {
          id: 'rule-3',
          name: 'Large Single Transaction',
          type: 'amount',
          enabled: true,
          threshold: 50000000,
          timeWindow: 0,
          description: 'Alert for transactions above threshold amount'
        }
      ]);
    } catch (error) {
      console.error('Error loading anomalies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnomalyAction = async (anomalyId: string, action: string, notes?: string) => {
    try {
      setAnomalies(prev => prev.map(anomaly => 
        anomaly.id === anomalyId 
          ? { 
              ...anomaly, 
              status: action as any,
              investigatedBy: 'current-admin',
              resolutionNotes: notes 
            }
          : anomaly
      ));
      
      // In real implementation, this would update the database
      // await supabase.from('anomalies').update({ status: action, notes }).eq('id', anomalyId);
      
    } catch (error) {
      console.error('Error updating anomaly:', error);
    }
  };

  useEffect(() => {
    loadAnomalies();
    const interval = setInterval(loadAnomalies, 60000); // Refresh every minute
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
        return <Ban className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading anomaly detection...</div>;
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
                <p className="text-sm font-medium text-muted-foreground">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolvedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Detected Anomalies
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
                        <span className="text-xs text-muted-foreground">
                          {new Date(anomaly.detectedAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold mb-1">{anomaly.description}</h3>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        {Object.entries(anomaly.details).map(([key, value]) => (
                          <p key={key}>
                            <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span> {value}
                          </p>
                        ))}
                      </div>

                      {anomaly.resolutionNotes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <p className="font-medium">Resolution Notes:</p>
                          <p>{anomaly.resolutionNotes}</p>
                        </div>
                      )}
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
                          onClick={() => handleAnomalyAction(anomaly.id, 'false_positive', 'Marked as false positive')}
                        >
                          False Positive
                        </Button>
                      </>
                    )}
                    
                    {anomaly.status === 'investigating' && (
                      <Button 
                        size="sm"
                        onClick={() => handleAnomalyAction(anomaly.id, 'resolved', 'Investigation completed')}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detection Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Detection Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {detectionRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{rule.name}</h4>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      Threshold: {rule.threshold.toLocaleString()}
                    </Badge>
                    {rule.timeWindow > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Window: {rule.timeWindow}h
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnomalyDetectionPanel;