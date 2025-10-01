
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Users,
  DollarSign,
  Calendar
} from 'lucide-react';

interface ComplianceMetrics {
  transactionSuccessRate: number;
  userVerificationRate: number;
  kycCompletionRate: number;
  transactionVolumeCompliance: number;
  documentsApprovalRate: number;
  regulatoryScore: number;
}

interface ComplianceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
  userId?: string;
  transactionId?: string;
}

interface ComplianceReport {
  period: string;
  totalTransactions: number;
  flaggedTransactions: number;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedActions: string[];
}

const RealComplianceReportingPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    transactionSuccessRate: 0,
    userVerificationRate: 0,
    kycCompletionRate: 0,
    transactionVolumeCompliance: 0,
    documentsApprovalRate: 0,
    regulatoryScore: 0
  });
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplianceData();
    const interval = setInterval(loadComplianceData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadComplianceData = async () => {
    try {
      await Promise.all([
        loadComplianceMetrics(),
        loadComplianceAlerts(),
        generateComplianceReports()
      ]);
    } catch (error) {
      console.error('Error loading compliance data:', error);
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const loadComplianceMetrics = async () => {
    try {
      // Transaction success rate
      const { data: transactions } = await supabase
        .from('transactions')
        .select('status');

      const totalTransactions = transactions?.length || 0;
      const successfulTransactions = transactions?.filter(t => t.status === 'completed').length || 0;
      const transactionSuccessRate = totalTransactions > 0 ? 
        (successfulTransactions / totalTransactions) * 100 : 0;

      // User verification rate
      const { data: profiles } = await supabase
        .from('profiles')
        .select('status, is_verified');

      const totalUsers = profiles?.length || 0;
      const verifiedUsers = profiles?.filter(p => p.is_verified).length || 0;
      const userVerificationRate = totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;

      // KYC completion rate
      const { data: profilesWithCompletion } = await supabase
        .from('profiles')
        .select('profile_completion_percentage');

      const averageCompletion = profilesWithCompletion?.reduce((sum, p) => 
        sum + (p.profile_completion_percentage || 0), 0) || 0;
      const kycCompletionRate = profilesWithCompletion?.length > 0 ? 
        averageCompletion / profilesWithCompletion.length : 0;

      // Documents approval rate
      const { data: documents } = await supabase
        .from('user_documents')
        .select('status');

      const totalDocuments = documents?.length || 0;
      const approvedDocuments = documents?.filter(d => d.status === 'approved').length || 0;
      const documentsApprovalRate = totalDocuments > 0 ? 
        (approvedDocuments / totalDocuments) * 100 : 0;

      // Transaction volume compliance
      const { data: largeTxns } = await supabase
        .from('transactions')
        .select('amount, status')
        .gte('amount', 1000000);

      const largeTxnCount = largeTxns?.length || 0;
      const flaggedLargeTxns = largeTxns?.filter(t => t.status === 'pending').length || 0;
      const transactionVolumeCompliance = largeTxnCount > 0 ? 
        ((largeTxnCount - flaggedLargeTxns) / largeTxnCount) * 100 : 100;

      // Calculate overall regulatory score
      const regulatoryScore = Math.round(
        (transactionSuccessRate + userVerificationRate + kycCompletionRate + 
         transactionVolumeCompliance + documentsApprovalRate) / 5
      );

      setMetrics({
        transactionSuccessRate: Math.round(transactionSuccessRate),
        userVerificationRate: Math.round(userVerificationRate),
        kycCompletionRate: Math.round(kycCompletionRate),
        transactionVolumeCompliance: Math.round(transactionVolumeCompliance),
        documentsApprovalRate: Math.round(documentsApprovalRate),
        regulatoryScore
      });
    } catch (error) {
      console.error('Error loading compliance metrics:', error);
    }
  };

  const loadComplianceAlerts = async () => {
    try {
      const alertsData: ComplianceAlert[] = [];

      // Check for pending large transactions
      const { data: largePendingTxns } = await supabase
        .from('transactions')
        .select('id, amount, user_id, created_at')
        .eq('status', 'pending')
        .gte('amount', 500000);

      largePendingTxns?.forEach(txn => {
        alertsData.push({
          id: `txn-${txn.id}`,
          type: 'warning',
          message: `Large transaction pending approval: ${txn.amount.toLocaleString()} UGX`,
          severity: 'medium',
          timestamp: txn.created_at,
          resolved: false,
          userId: txn.user_id,
          transactionId: txn.id
        });
      });

      // Check for unverified users with high activity
      const { data: unverifiedActiveUsers } = await supabase
        .from('profiles')
        .select(`
          id, 
          full_name, 
          is_verified, 
          created_at
        `)
        .eq('is_verified', false);

      // For now, just flag unverified users as potential risk
      unverifiedActiveUsers?.forEach(user => {
        alertsData.push({
          id: `user-${user.id}`,
          type: 'warning',
          message: `Unverified user account: ${user.full_name || 'Unknown'}`,
          severity: 'medium',
          timestamp: user.created_at,
          resolved: false,
          userId: user.id
        });
      });

      // Check for documents pending review for too long
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: oldPendingDocs } = await supabase
        .from('user_documents')
        .select('id, user_id, type, uploaded_at')  // Changed from document_type to type
        .eq('status', 'pending')
        .lt('uploaded_at', threeDaysAgo.toISOString());

      if (oldPendingDocs && Array.isArray(oldPendingDocs)) {
        oldPendingDocs.forEach(doc => {
          alertsData.push({
            id: `doc-${doc.id}`,
            type: 'warning',
            message: `Document pending review for >3 days: ${doc.type}`,  // Changed from document_type to type
            severity: 'medium',
            timestamp: doc.uploaded_at,
            resolved: false,
            userId: doc.user_id
          });
        });
      }

      setAlerts(alertsData.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (error) {
      console.error('Error loading compliance alerts:', error);
    }
  };

  const generateComplianceReports = async () => {
    try {
      const reports: ComplianceReport[] = [];
      const today = new Date();
      
      const periods = [
        { name: 'This Week', days: 7 },
        { name: 'This Month', days: 30 },
        { name: 'Last Quarter', days: 90 }
      ];

      for (const period of periods) {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - period.days);

        const { data: periodTransactions } = await supabase
          .from('transactions')
          .select('status, amount')
          .gte('created_at', startDate.toISOString());

        const totalTransactions = periodTransactions?.length || 0;
        const flaggedTransactions = periodTransactions?.filter(t => 
          t.status === 'pending' || t.status === 'failed').length || 0;

        const successRate = totalTransactions > 0 ? 
          ((totalTransactions - flaggedTransactions) / totalTransactions) * 100 : 100;

        const complianceScore = Math.round(successRate);
        const riskLevel: 'low' | 'medium' | 'high' = 
          complianceScore >= 95 ? 'low' : 
          complianceScore >= 85 ? 'medium' : 'high';

        const recommendedActions: string[] = [];
        if (complianceScore < 95) {
          recommendedActions.push('Review transaction approval process');
        }
        if (complianceScore < 85) {
          recommendedActions.push('Implement additional risk controls');
          recommendedActions.push('Increase monitoring frequency');
        }
        if (complianceScore < 75) {
          recommendedActions.push('URGENT: Review all pending transactions');
          recommendedActions.push('Consider temporary restrictions');
        }

        reports.push({
          period: period.name,
          totalTransactions,
          flaggedTransactions,
          complianceScore,
          riskLevel,
          recommendedActions
        });
      }

      setReports(reports);
    } catch (error) {
      console.error('Error generating compliance reports:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
    toast.success('Alert marked as resolved');
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-center">
          <Shield className="h-8 w-8 mx-auto mb-2" />
          <p>Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Compliance Reporting Dashboard
        </h2>
        <Badge 
          variant="outline" 
          className={`${getScoreColor(metrics.regulatoryScore)} border-current`}
        >
          Regulatory Score: {metrics.regulatoryScore}%
        </Badge>
      </div>

      {/* Key Compliance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(metrics).map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${getScoreColor(value)}`}>
                {value}%
              </div>
              <Progress value={value} className="mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Compliance Alerts ({alerts.filter(a => !a.resolved).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.filter(a => !a.resolved).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                ))}
                {alerts.filter(a => !a.resolved).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p>No active compliance alerts</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reports.map((report) => (
              <Card key={report.period}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{report.period}</span>
                    <Badge 
                      variant={report.riskLevel === 'low' ? 'default' : 
                              report.riskLevel === 'medium' ? 'secondary' : 'destructive'}
                    >
                      {report.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Transactions</p>
                      <p className="font-bold">{report.totalTransactions}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Flagged</p>
                      <p className="font-bold text-red-600">{report.flaggedTransactions}</p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Compliance Score</span>
                      <span className={`font-bold ${getScoreColor(report.complianceScore)}`}>
                        {report.complianceScore}%
                      </span>
                    </div>
                    <Progress value={report.complianceScore} />
                  </div>

                  {report.recommendedActions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Recommended Actions:</p>
                      <ul className="text-xs space-y-1">
                        {report.recommendedActions.map((action, index) => (
                          <li key={index} className="text-muted-foreground">
                            • {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Success Rate</span>
                    <span className={`font-bold ${getScoreColor(metrics.transactionSuccessRate)}`}>
                      {metrics.transactionSuccessRate}%
                    </span>
                  </div>
                  <Progress value={metrics.transactionSuccessRate} />
                  
                  <div className="flex justify-between items-center">
                    <span>Volume Compliance</span>
                    <span className={`font-bold ${getScoreColor(metrics.transactionVolumeCompliance)}`}>
                      {metrics.transactionVolumeCompliance}%
                    </span>
                  </div>
                  <Progress value={metrics.transactionVolumeCompliance} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Verification Rate</span>
                    <span className={`font-bold ${getScoreColor(metrics.userVerificationRate)}`}>
                      {metrics.userVerificationRate}%
                    </span>
                  </div>
                  <Progress value={metrics.userVerificationRate} />
                  
                  <div className="flex justify-between items-center">
                    <span>KYC Completion</span>
                    <span className={`font-bold ${getScoreColor(metrics.kycCompletionRate)}`}>
                      {metrics.kycCompletionRate}%
                    </span>
                  </div>
                  <Progress value={metrics.kycCompletionRate} />
                  
                  <div className="flex justify-between items-center">
                    <span>Document Approval</span>
                    <span className={`font-bold ${getScoreColor(metrics.documentsApprovalRate)}`}>
                      {metrics.documentsApprovalRate}%
                    </span>
                  </div>
                  <Progress value={metrics.documentsApprovalRate} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealComplianceReportingPanel;
