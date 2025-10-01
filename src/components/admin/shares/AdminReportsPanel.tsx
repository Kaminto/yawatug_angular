
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, TrendingUp, FileText } from 'lucide-react';
import AdminReportsManager from './AdminReportsManager';
import UserReportsManager from './UserReportsManager';

const AdminReportsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('admin');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reports & Analytics
          </CardTitle>
          <CardDescription>
            Comprehensive reporting for administrative oversight and user transparency
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Admin Reports
          </TabsTrigger>
          <TabsTrigger value="user" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="space-y-6">
          <AdminReportsManager />
        </TabsContent>

        <TabsContent value="user" className="space-y-6">
          <UserReportsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReportsPanel;
