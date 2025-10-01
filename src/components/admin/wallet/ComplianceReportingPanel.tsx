import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ComplianceMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  status: 'compliant' | 'warning' | 'non_compliant';
  description: string;
  lastUpdated: string;
}

interface ComplianceReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  period: string;
  status: 'draft' | 'pending' | 'approved';
  createdAt: string;
  summary: {
    totalTransactions: number;
    flaggedTransactions: number;
    complianceScore: number;
    issues: number;
  };
}

interface RegulatoryRequirement {
  id: string;
  name: string;
  description: string;
  status: 'met' | 'pending' | 'overdue';
  dueDate?: string;
  completionRate: number;
}

const ComplianceReportingPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<ComplianceMetric[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [requirements, setRequirements] = useState<RegulatoryRequirement[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [overallScore, setOverallScore] = useState(0);

  const loadComplianceData = async () => {
    try {
      // Load transaction data for compliance analysis
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, currency, transaction_type, status, created_at, user_id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { data: users } = await supabase
        .from('profiles')
        .select('id, status, is_verified, created_at');

      // Mock compliance metrics
      const mockMetrics: ComplianceMetric[] = [
        {
          id: 'kyc_completion',
          name: 'KYC Completion Rate',
          value: users ? (users.filter(u => u.is_verified).length / users.length) * 100 : 85.5,
          target: 90,
          status: 'warning',
          description: 'Percentage of users with completed KYC verification',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'aml_screening',
          name: 'AML Screening Coverage',
          value: 98.2,
          target: 95,
          status: 'compliant',
          description: 'Percentage of transactions screened for AML compliance',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'suspicious_activity',
          name: 'Suspicious Activity Reporting',
          value: 0.3,
          target: 1,
          status: 'compliant',
          description: 'Percentage of transactions flagged as suspicious',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'data_retention',
          name: 'Data Retention Compliance',
          value: 100,
          target: 100,
          status: 'compliant',
          description: 'Compliance with data retention policies',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'audit_trail',
          name: 'Audit Trail Completeness',
          value: 99.8,
          target: 99,
          status: 'compliant',
          description: 'Completeness of transaction audit trails',
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'reporting_timeliness',
          name: 'Regulatory Reporting Timeliness',
          value: 95.5,
          target: 98,
          status: 'warning',
          description: 'On-time submission of regulatory reports',
          lastUpdated: new Date().toISOString()
        }
      ];

      setMetrics(mockMetrics);

      // Calculate overall compliance score
      const avgScore = mockMetrics.reduce((sum, metric) => {
        const score = metric.status === 'compliant' ? 100 : 
                     metric.status === 'warning' ? 75 : 50;
        return sum + score;
      }, 0) / mockMetrics.length;
      
      setOverallScore(Math.round(avgScore));

      // Mock compliance reports
      const mockReports: ComplianceReport[] = [
        {
          id: 'report-1',
          type: 'monthly',
          period: 'November 2024',
          status: 'approved',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          summary: {
            totalTransactions: transactions?.length || 1250,
            flaggedTransactions: Math.floor((transactions?.length || 1250) * 0.02),
            complianceScore: 92,
            issues: 3
          }
        },
        {
          id: 'report-2',
          type: 'weekly',
          period: 'Week 47, 2024',
          status: 'pending',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          summary: {
            totalTransactions: 320,
            flaggedTransactions: 8,
            complianceScore: 88,
            issues: 1
          }
        },
        {
          id: 'report-3',
          type: 'daily',
          period: new Date().toLocaleDateString(),
          status: 'draft',
          createdAt: new Date().toISOString(),
          summary: {
            totalTransactions: 45,
            flaggedTransactions: 1,
            complianceScore: 95,
            issues: 0
          }
        }
      ];

      setReports(mockReports);

      // Mock regulatory requirements
      const mockRequirements: RegulatoryRequirement[] = [
        {
          id: 'req-1',
          name: 'Bank of Uganda AML Report',
          description: 'Monthly anti-money laundering report submission',
          status: 'met',
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          completionRate: 100
        },
        {
          id: 'req-2',
          name: 'Customer Due Diligence Review',
          description: 'Quarterly review of high-risk customer profiles',
          status: 'pending',
          dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          completionRate: 65
        },
        {
          id: 'req-3',
          name: 'Transaction Monitoring Audit',
          description: 'Semi-annual audit of transaction monitoring systems',
          status: 'overdue',
          dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          completionRate: 25
        },
        {
          id: 'req-4',
          name: 'Data Protection Compliance',
          description: 'Annual data protection and privacy compliance review',
          status: 'pending',
          dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          completionRate: 80
        }
      ];

      setRequirements(mockRequirements);
    } catch (error) {
      console.error('Error loading compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (type: string) => {
    try {
      // In real implementation, this would trigger report generation
      const newReport: ComplianceReport = {
        id: `report-${Date.now()}`,
        type: type as any,
        period: new Date().toLocaleDateString(),
        status: 'draft',
        createdAt: new Date().toISOString(),
        summary: {
          totalTransactions: Math.floor(Math.random() * 1000) + 500,
          flaggedTransactions: Math.floor(Math.random() * 20) + 5,
          complianceScore: Math.floor(Math.random() * 20) + 80,
          issues: Math.floor(Math.random() * 5)
        }
      };

      setReports(prev => [newReport, ...prev]);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  useEffect(() => {
    loadComplianceData();
  }, []);

  const getMetricStatus = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'non_compliant':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRequirementStatus = (status: string) => {
    switch (status) {
      case 'met':
        return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, variant: 'default' as const };
      case 'pending':
        return { icon: <Clock className="h-4 w-4 text-yellow-500" />, variant: 'secondary' as const };
      case 'overdue':
        return { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, variant: 'destructive' as const };
      default:
        return { icon: <Clock className="h-4 w-4 text-gray-500" />, variant: 'outline' as const };
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading compliance data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overall Compliance Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Overall Compliance Score
            </CardTitle>
            <Badge variant={overallScore >= 90 ? 'default' : overallScore >= 75 ? 'secondary' : 'destructive'}>
              {overallScore}% Compliant
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={overallScore} className="h-4" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {metrics.filter(m => m.status === 'compliant').length}
                </p>
                <p className="text-sm text-muted-foreground">Compliant</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {metrics.filter(m => m.status === 'warning').length}
                </p>
                <p className="text-sm text-muted-foreground">Warning</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {metrics.filter(m => m.status === 'non_compliant').length}
                </p>
                <p className="text-sm text-muted-foreground">Non-Compliant</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{metric.name}</span>
                {getMetricStatus(metric.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{metric.value.toFixed(1)}%</span>
                  <span className="text-sm text-muted-foreground">/ {metric.target}%</span>
                </div>
                
                <Progress value={(metric.value / metric.target) * 100} className="h-2" />
                
                <p className="text-xs text-muted-foreground">{metric.description}</p>
                
                <p className="text-xs text-muted-foreground">
                  Updated: {new Date(metric.lastUpdated).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Compliance Reports
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => generateReport(selectedPeriod)}>
                Generate Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{report.type.toUpperCase()} Report</h3>
                    <Badge variant={
                      report.status === 'approved' ? 'default' :
                      report.status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {report.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Period: {report.period}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Transactions: {report.summary.totalTransactions}</span>
                    <span>Flagged: {report.summary.flaggedTransactions}</span>
                    <span>Score: {report.summary.complianceScore}%</span>
                    <span>Issues: {report.summary.issues}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  {report.status === 'draft' && (
                    <Button size="sm">Submit</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requirements.map((requirement) => {
              const statusInfo = getRequirementStatus(requirement.status);
              return (
                <div key={requirement.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {statusInfo.icon}
                      <h3 className="font-semibold">{requirement.name}</h3>
                      <Badge variant={statusInfo.variant}>
                        {requirement.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {requirement.description}
                    </p>
                    {requirement.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(requirement.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-2xl font-bold">{requirement.completionRate}%</p>
                    <Progress value={requirement.completionRate} className="w-20 h-2 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceReportingPanel;