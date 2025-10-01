import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import AdminReportsPanel from '../AdminReportsPanel';
import UserReportsManager from '../UserReportsManager';

interface ReportsSectionProps {
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
}

const ReportsSection: React.FC<ReportsSectionProps> = ({
  activeSubTab,
  onSubTabChange
}) => {
  return (
    <Tabs value={activeSubTab} onValueChange={onSubTabChange} className="space-y-4">
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="admin-reports" className="flex items-center">
          Admin Reports
          <Badge variant="secondary" className="ml-2">5 New</Badge>
        </TabsTrigger>
        <TabsTrigger value="user-reports" className="flex items-center">
          User Reports
          <Badge variant="secondary" className="ml-2">2 Pending</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="admin-reports" className="space-y-4">
        <AdminReportsPanel />
      </TabsContent>

      <TabsContent value="user-reports" className="space-y-4">
        <UserReportsManager />
      </TabsContent>
    </Tabs>
  );
};

export default ReportsSection;