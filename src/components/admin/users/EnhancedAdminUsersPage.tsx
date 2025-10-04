import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, UserCheck, Edit3, Upload, RefreshCw, Activity, 
  TrendingUp, Clock, AlertTriangle, CheckCircle2, Loader2
} from 'lucide-react';
import { AdminOperationsService } from '@/services/AdminOperationsService';
import { toast } from 'sonner';

// Import enhanced components
import EnhancedUserRegistrationManager from './EnhancedUserRegistrationManager';
import EnhancedUserVerificationQueue from './EnhancedUserVerificationQueue';
import EnhancedUserEditRequests from './EnhancedUserEditRequests';
import EnhancedProfileImporter from './EnhancedProfileImporter';
import ImportedUserManager from '../ImportedUserManager';
import ComprehensiveSyncDashboard from './ComprehensiveSyncDashboard';

interface DashboardStats {
  total_users: number;
  active_users: number;
  pending_verification: number;
  blocked_users: number;
  imported_users: number;
  organic_users: number;
  edit_requests: number;
  high_completion_profiles: number;
  incomplete_profiles: number;
  recent_registrations_24h: number;
  recent_registrations_7d: number;
  recent_logins_24h: number;
  never_logged_in: number;
  last_updated: string;
}

interface ActiveOperation {
  id: string;
  operation_type: string;
  status: string;
  progress_percentage: number;
  created_at: string;
  target_ids: string[];
}

const EnhancedAdminUsersPage = () => {
  const [activeTab, setActiveTab] = useState('registry');
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [activeOperations, setActiveOperations] = useState<ActiveOperation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const breadcrumbs = [{
    label: 'Admin',
    href: '/admin'
  }, {
    label: 'Enhanced User Management'
  }];

  const loadDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [stats, operations] = await Promise.all([
        AdminOperationsService.getDashboardStats(),
        AdminOperationsService.getActiveOperations()
      ]);
      
      setDashboardStats(stats as any as DashboardStats);
      setActiveOperations(operations);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const getStatCard = (title: string, value: number, icon: React.ElementType, variant: 'default' | 'success' | 'warning' | 'destructive' = 'default') => {
    const Icon = icon;
    const colorClasses = {
      default: 'bg-primary/10 text-primary',
      success: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
      warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
      destructive: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
    };

    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClasses[variant]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const sections = [{
    id: 'registry',
    label: 'User Registry',
    icon: Users,
    description: 'Enhanced user management with advanced filtering',
    badge: dashboardStats?.total_users || 0,
    badgeVariant: 'default' as const
  }, {
    id: 'approvals',
    label: 'Pending Approvals',
    icon: UserCheck,
    description: 'Streamlined verification workflow',
    badge: dashboardStats?.pending_verification || 0,
    badgeVariant: 'secondary' as const
  }, {
    id: 'edits',
    label: 'Edit Requests',
    icon: Edit3,
    description: 'Profile edit request management',
    badge: dashboardStats?.edit_requests || 0,
    badgeVariant: 'default' as const
  }, {
    id: 'imports',
    label: 'Import Management',
    icon: Upload,
    description: 'Bulk import and user activation',
    badge: dashboardStats?.imported_users || 0,
    badgeVariant: 'outline' as const
  }, {
    id: 'sync',
    label: 'Auth & Profile Sync',
    icon: RefreshCw,
    description: 'Synchronize auth and profile data',
    badge: null,
    badgeVariant: 'outline' as const
  }];

  if (loading) {
    return (
      <AdminLayout title="Enhanced User Management" breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Enhanced User Management" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Enhanced Header with Real-time Stats */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">User Management Dashboard</h2>
            <p className="text-muted-foreground">
              Advanced user lifecycle management with real-time monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadDashboardData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {dashboardStats?.last_updated && (
              <span className="text-xs text-muted-foreground">
                Updated: {new Date(dashboardStats.last_updated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Active Operations Alert */}
        {activeOperations.length > 0 && (
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{activeOperations.length} active operations running</span>
                <div className="flex gap-2">
                  {activeOperations.map((op) => (
                    <Badge key={op.id} variant="outline" className="text-xs">
                      {op.operation_type}: {op.progress_percentage}%
                    </Badge>
                  ))}
                </div>
              </div>
              {activeOperations.some(op => op.progress_percentage > 0) && (
                <Progress 
                  value={activeOperations.reduce((acc, op) => acc + op.progress_percentage, 0) / activeOperations.length} 
                  className="mt-2 h-1"
                />
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Statistics Grid */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {getStatCard('Total Users', dashboardStats.total_users, Users, 'default')}
            {getStatCard('Active Users', dashboardStats.active_users, CheckCircle2, 'success')}
            {getStatCard('Pending Review', dashboardStats.pending_verification, Clock, 'warning')}
            {getStatCard('Edit Requests', dashboardStats.edit_requests, Edit3, 'default')}
            {getStatCard('Recent Logins', dashboardStats.recent_logins_24h, TrendingUp, 'success')}
            {getStatCard('Blocked Users', dashboardStats.blocked_users, AlertTriangle, 'destructive')}
          </div>
        )}

        {/* Additional Insights */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Registration Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Last 24h:</span>
                    <span className="font-medium">{dashboardStats.recent_registrations_24h}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last 7 days:</span>
                    <span className="font-medium">{dashboardStats.recent_registrations_7d}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Profile Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>High completion (80%+):</span>
                    <span className="font-medium text-green-600">{dashboardStats.high_completion_profiles}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Needs improvement (&lt;50%):</span>
                    <span className="font-medium text-yellow-600">{dashboardStats.incomplete_profiles}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">User Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Organic:</span>
                    <span className="font-medium">{dashboardStats.organic_users}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Imported:</span>
                    <span className="font-medium">{dashboardStats.imported_users}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full h-auto p-1">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <TabsTrigger 
                  key={section.id} 
                  value={section.id} 
                  className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {section.badge !== null && section.badge > 0 && (
                      <Badge variant={section.badgeVariant} className="ml-1 px-1.5 py-0.5 text-xs">
                        {section.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-xs">{section.label}</div>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Enhanced Content Sections */}
          <div className="mt-6">
            <TabsContent value="registry" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Enhanced User Registry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedUserRegistrationManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Streamlined Verification Queue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedUserVerificationQueue />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="edits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    Profile Edit Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedUserEditRequests />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="imports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Bulk Profile Import
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedProfileImporter />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Imported User Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ImportedUserManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sync" className="space-y-6">
              <ComprehensiveSyncDashboard onRefresh={loadDashboardData} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default EnhancedAdminUsersPage;