import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';

const ComplianceReports: React.FC = () => {
  const reports = [
    {
      id: 1,
      title: 'Weekly Trading Compliance Report',
      description: 'Comprehensive analysis of trading patterns and compliance violations',
      period: 'Jan 20 - Jan 26, 2024',
      status: 'completed',
      size: '2.3 MB',
      violations: 3,
      lastGenerated: '2 hours ago'
    },
    {
      id: 2,
      title: 'Monthly Risk Assessment',
      description: 'Risk metrics and exposure analysis for all trading activities',
      period: 'January 2024',
      status: 'generating',
      size: '1.8 MB',
      violations: 0,
      lastGenerated: 'In progress'
    },
    {
      id: 3,
      title: 'Quarterly Regulatory Filing',
      description: 'Regulatory compliance summary for Q4 2023',
      period: 'Q4 2023',
      status: 'completed',
      size: '5.1 MB',
      violations: 1,
      lastGenerated: '1 week ago'
    },
    {
      id: 4,
      title: 'Daily Transaction Monitor',
      description: 'Real-time monitoring of all share transactions',
      period: 'Today',
      status: 'live',
      size: '456 KB',
      violations: 2,
      lastGenerated: 'Live updates'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'secondary';
      case 'generating':
        return 'default';
      case 'live':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'generating':
        return 'Generating';
      case 'live':
        return 'Live';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Compliance Reports</h3>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Generate New Report
        </Button>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {report.period}
                    </div>
                    <div>Size: {report.size}</div>
                  </div>
                </div>
                <Badge variant={getStatusColor(report.status)}>
                  {getStatusText(report.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Last updated: </span>
                    {report.lastGenerated}
                  </div>
                  {report.violations > 0 && (
                    <div className="flex items-center gap-1 text-sm text-destructive">
                      <TrendingUp className="h-4 w-4" />
                      {report.violations} violations found
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {report.status === 'completed' && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Daily Transaction Reports</span>
              <Badge variant="secondary">Automated</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Weekly Compliance Summary</span>
              <Badge variant="secondary">Every Monday</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Monthly Risk Assessment</span>
              <Badge variant="secondary">1st of each month</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Quarterly Regulatory Filing</span>
              <Badge variant="secondary">End of quarter</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceReports;