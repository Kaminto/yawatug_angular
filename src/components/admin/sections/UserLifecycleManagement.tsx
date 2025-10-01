import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  FileCheck, 
  Upload, 
  UserCheck, 
  AlertTriangle,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import unified user registry
import UnifiedUserRegistry from './UnifiedUserRegistry';
import StreamlinedVerificationWorkflow from '@/components/admin/users/StreamlinedVerificationWorkflow';
import UserProfileVerificationManager from '@/components/admin/users/UserProfileVerificationManager';

const UserLifecycleManagement = () => {
  const [activeSection, setActiveSection] = useState('registrations');
  const [sectionCounts, setSectionCounts] = useState({
    registrations: 0,
    verification: 0,
    imported: 0,
    updates: 0,
    issues: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSectionCounts();
    const interval = setInterval(loadSectionCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSectionCounts = async () => {
    try {
      const [
        newRegistrations,
        pendingVerifications,
        importedUsers,
        pendingUpdates,
        accountIssues
      ] = await Promise.all([
        // New registrations (last 7 days)
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .is('import_batch_id', null),
        
        // Pending verifications
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_verification'),
        
        // Imported users
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .not('import_batch_id', 'is', null),
        
        // Pending profile updates (count from update logs if exists)
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'unverified'),
        
        // Account issues (blocked users)
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'blocked')
      ]);

      setSectionCounts({
        registrations: newRegistrations.count || 0,
        verification: pendingVerifications.count || 0,
        imported: importedUsers.count || 0,
        updates: pendingUpdates.count || 0,
        issues: accountIssues.count || 0
      });
    } catch (error) {
      console.error('Error loading section counts:', error);
      toast.error('Failed to load section data');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      id: 'registrations',
      label: 'New Registrations',
      icon: UserPlus,
      description: 'Fresh signups requiring initial review',
      count: sectionCounts.registrations,
      variant: 'default' as const
    },
    {
      id: 'verification',
      label: 'Verification Workflow',
      icon: FileCheck,
      description: 'Document review & identity verification',
      count: sectionCounts.verification,
      variant: 'secondary' as const
    },
    {
      id: 'imported',
      label: 'Imported Users',
      icon: Upload,
      description: 'Batch-imported profiles with opening balances',
      count: sectionCounts.imported,
      variant: 'default' as const
    },
    {
      id: 'updates',
      label: 'Profile Updates',
      icon: UserCheck,
      description: 'Changes requiring admin approval',
      count: sectionCounts.updates,
      variant: 'default' as const
    },
    {
      id: 'issues',
      label: 'Account Issues',
      icon: AlertTriangle,
      description: 'Blocked, suspended, or problematic accounts',
      count: sectionCounts.issues,
      variant: 'destructive' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">User Lifecycle Management</h2>
          <p className="text-muted-foreground">Centralized hub for all user-related activities</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full h-auto p-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {section.count > 0 && (
                    <Badge variant={section.variant} className="px-1.5 py-0.5 text-xs">
                      {section.count}
                    </Badge>
                  )}
                </div>
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
          <TabsContent value="registrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Unified User Registry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Comprehensive view of all users with filtering, search, and management capabilities.
                </p>
                <UnifiedUserRegistry />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Verification Workflow ({sectionCounts.verification})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Streamlined document review and identity verification process.
                </p>
                <StreamlinedVerificationWorkflow onRequestUpdate={() => {}} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="imported" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  User Registry - Imported View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Same unified registry but pre-filtered to show only imported users.
                </p>
                <UnifiedUserRegistry />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="updates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Profile Updates ({sectionCounts.updates})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Review and approve user profile changes and updates.
                </p>
                <UserProfileVerificationManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Account Issues ({sectionCounts.issues})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Manage blocked, suspended, or problematic user accounts.
                </p>
                {/* This would be replaced with actual account issues component */}
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Account issues management component will be implemented here</p>
                  <p className="text-sm">Show users with account problems, blocks, or disputes</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default UserLifecycleManagement;