import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ComplianceActiveAlerts from '../compliance/ComplianceActiveAlerts';
import ComplianceReports from '../compliance/ComplianceReports';
import ComplianceDetailedMetrics from '../compliance/ComplianceDetailedMetrics';

interface ComplianceSectionProps {
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
}

const ComplianceSection: React.FC<ComplianceSectionProps> = ({
  activeSubTab,
  onSubTabChange
}) => {
  return (
    <Tabs value={activeSubTab} onValueChange={onSubTabChange} className="space-y-4">
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="active-alerts" className="flex items-center">
          Active Alerts
          <Badge variant="destructive" className="ml-2">4</Badge>
        </TabsTrigger>
        <TabsTrigger value="compliance-reports" className="flex items-center">
          Compliance Reports
          <Badge variant="secondary" className="ml-2">Weekly</Badge>
        </TabsTrigger>
        <TabsTrigger value="detailed-metrics" className="flex items-center">
          Detailed Metrics
          <Badge variant="secondary" className="ml-2">Real-time</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active-alerts" className="space-y-4">
        <ComplianceActiveAlerts />
      </TabsContent>

      <TabsContent value="compliance-reports" className="space-y-4">
        <ComplianceReports />
      </TabsContent>

      <TabsContent value="detailed-metrics" className="space-y-4">
        <ComplianceDetailedMetrics />
      </TabsContent>
    </Tabs>
  );
};

export default ComplianceSection;