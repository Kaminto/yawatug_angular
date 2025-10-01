import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Users, 
  Upload, 
  Download, 
  Cog, 
  Archive,
  FileText
} from 'lucide-react';

// Import existing components
import BulkUserManagementPanel from '@/components/admin/BulkUserManagementPanel';
import EnhancedProfileImporter from '@/components/admin/users/EnhancedProfileImporter';
import ClubMemberImporter from '@/components/admin/users/ClubMemberImporter';

const SystemAdministration = () => {
  const [activeSection, setActiveSection] = useState('bulk');

  const sections = [
    {
      id: 'bulk',
      label: 'Bulk Operations',
      icon: Users,
      description: 'Mass status updates & communications',
      variant: 'default' as const
    },
    {
      id: 'import',
      label: 'Data Import',
      icon: Upload,
      description: 'User batch management & imports',
      variant: 'default' as const
    },
    {
      id: 'export',
      label: 'Data Export',
      icon: Download,
      description: 'Export user data & reports',
      variant: 'default' as const
    },
    {
      id: 'config',
      label: 'System Config',
      icon: Cog,
      description: 'Verification rules & thresholds',
      variant: 'default' as const
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: FileText,
      description: 'Complete activity tracking',
      variant: 'default' as const
    },
    {
      id: 'backup',
      label: 'Backup & Recovery',
      icon: Archive,
      description: 'Data management tools',
      variant: 'default' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">System Administration</h2>
          <p className="text-muted-foreground">Bulk operations and system management tools</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 w-full h-auto p-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4" />
                <div className="text-center">
                  <div className="text-sm font-medium">{section.label}</div>
                  <div className="text-xs text-muted-foreground hidden lg:block">
                    {section.description}
                  </div>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Section Content */}
        <div className="mt-6">
          <TabsContent value="bulk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Bulk User Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Perform mass operations on multiple users simultaneously.
                </p>
                <BulkUserManagementPanel />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Profile Import
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Import user profiles from CSV files.
                  </p>
                  <EnhancedProfileImporter />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Club Member Import
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Import club members with share allocations.
                  </p>
                  <ClubMemberImporter />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Export Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Export user data and generate reports.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Data export tools will be implemented here</p>
                  <p className="text-sm">Export user data, verification reports, and analytics</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Configure verification rules, approval thresholds, and system settings.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Cog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>System configuration panel will be implemented here</p>
                  <p className="text-sm">Manage verification rules and system settings</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Audit Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  View complete activity tracking and audit trails.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Audit logs viewer will be implemented here</p>
                  <p className="text-sm">Track all admin actions and system events</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Backup & Recovery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Manage data backups and recovery operations.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Backup and recovery tools will be implemented here</p>
                  <p className="text-sm">Schedule backups and manage data recovery</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SystemAdministration;