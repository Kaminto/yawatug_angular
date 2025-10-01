
import React from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import SystemHealth from '@/components/admin/SystemHealth';
import ActivityMonitor from '@/components/admin/ActivityMonitor';
import DatabaseCleanup from '@/components/admin/DatabaseCleanup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminSystemHealth = () => {
  return (
    <UnifiedLayout title="System Health & Monitoring">
      <div className="space-y-8">
        <div>
          <p className="text-muted-foreground">
            Monitor system performance, user activity, and overall platform health
          </p>
        </div>

        <Tabs defaultValue="health" className="space-y-4">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="health">
              <span className="hidden sm:inline">System Health</span>
              <span className="sm:hidden">Health</span>
            </TabsTrigger>
            <TabsTrigger value="activity">
              <span className="hidden sm:inline">Activity Monitor</span>
              <span className="sm:hidden">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="cleanup">
              <span className="hidden sm:inline">Database Cleanup</span>
              <span className="sm:hidden">Cleanup</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="health">
            <SystemHealth />
          </TabsContent>
          
          <TabsContent value="activity">
            <ActivityMonitor />
          </TabsContent>
          
          <TabsContent value="cleanup">
            <DatabaseCleanup />
          </TabsContent>
        </Tabs>
      </div>
    </UnifiedLayout>
  );
};

export default AdminSystemHealth;
