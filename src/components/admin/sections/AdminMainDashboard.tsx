import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye,
  TrendingUp,
  Users,
  CreditCard,
  FileText,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CriticalAlert {
  id: string;
  type: 'verification' | 'financial' | 'system' | 'compliance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
  actionRequired: string;
  userId?: string;
}

interface ActionItem {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timeAgo: string;
  userId?: string;
  actionUrl?: string;
}

const AdminMainDashboard = () => {
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [keyMetrics, setKeyMetrics] = useState({
    totalUsers: 0,
    pendingVerifications: 0,
    importedUsers: 0,
    activeUsers: 0,
    criticalIssues: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load key metrics
      const [profilesResult, pendingVerificationsResult] = await Promise.all([
        supabase.from('profiles').select('id, status, import_batch_id, verification_submitted_at').limit(10000),
        supabase.from('profiles').select('id').eq('status', 'pending_verification').limit(1000)
      ]);

      if (profilesResult.data) {
        const profiles = profilesResult.data;
        setKeyMetrics({
          totalUsers: profiles.length,
          pendingVerifications: pendingVerificationsResult.data?.length || 0,
          importedUsers: profiles.filter(p => p.import_batch_id).length,
          activeUsers: profiles.filter(p => p.status === 'active').length,
          criticalIssues: 3 // Mock for now
        });

        // Generate critical alerts based on data
        const alerts: CriticalAlert[] = [];
        const overdueVerifications = profiles.filter(p => 
          p.status === 'pending_verification' && 
          p.verification_submitted_at &&
          new Date(p.verification_submitted_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        if (overdueVerifications.length > 0) {
          alerts.push({
            id: 'overdue-verifications',
            type: 'verification',
            priority: 'high',
            title: `${overdueVerifications.length} Overdue Verifications`,
            description: 'Users waiting for verification for over 24 hours',
            timestamp: new Date().toISOString(),
            actionRequired: 'Review and process immediately'
          });
        }

        setCriticalAlerts(alerts);

        // Generate action items
        const items: ActionItem[] = overdueVerifications.slice(0, 10).map((profile, index) => ({
          id: `verification-${profile.id}`,
          type: 'verification',
          title: 'User verification pending',
          description: `User submitted verification ${Math.floor((Date.now() - new Date(profile.verification_submitted_at).getTime()) / (1000 * 60 * 60))} hours ago`,
          priority: 'high' as const,
          timeAgo: `${Math.floor((Date.now() - new Date(profile.verification_submitted_at).getTime()) / (1000 * 60 * 60))}h ago`,
          userId: profile.id,
          actionUrl: `/admin/users?tab=registrations&userId=${profile.id}`
        }));

        setActionItems(items);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string, itemId: string) => {
    try {
      if (action === 'approve_verification') {
        const userId = itemId.replace('verification-', '');
        const { error } = await supabase
          .from('profiles')
          .update({ 
            status: 'active',
            verification_reviewed_at: new Date().toISOString(),
            verification_reviewed_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('id', userId);

        if (error) throw error;
        toast.success('User verification approved');
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error performing quick action:', error);
      toast.error('Failed to perform action');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive border-destructive';
      case 'medium': return 'text-primary border-primary';
      case 'low': return 'text-muted-foreground border-muted';
      default: return 'text-muted-foreground border-muted';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle2 className="h-4 w-4" />;
      default: return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Critical Alerts ({criticalAlerts.length})
          </h3>
          {criticalAlerts.map(alert => (
            <Alert key={alert.id} className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{alert.title}</span> - {alert.description}
                  <div className="text-xs text-muted-foreground mt-1">
                    Action required: {alert.actionRequired}
                  </div>
                </div>
                <Button size="sm" variant="destructive">
                  Take Action
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{keyMetrics.pendingVerifications}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imported Users</CardTitle>
            <FileText className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{keyMetrics.importedUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Batch imported</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{keyMetrics.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Verified & active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{keyMetrics.criticalIssues}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Priority Action Queue ({actionItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="high" className="w-full">
            <TabsList>
              <TabsTrigger value="high" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                High Priority
                <Badge variant="destructive" className="ml-1">
                  {actionItems.filter(i => i.priority === 'high').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="medium">Medium Priority</TabsTrigger>
              <TabsTrigger value="all">All Items</TabsTrigger>
            </TabsList>

            <TabsContent value="high" className="space-y-3 mt-4">
              {actionItems.filter(item => item.priority === 'high').map(item => (
                <div key={item.id} className={`p-4 border rounded-lg ${getPriorityColor(item.priority)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getPriorityIcon(item.priority)}
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      {item.type === 'verification' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleQuickAction('approve_verification', item.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Quick Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="medium" className="space-y-3 mt-4">
              {actionItems.filter(item => item.priority === 'medium').map(item => (
                <div key={item.id} className={`p-4 border rounded-lg ${getPriorityColor(item.priority)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getPriorityIcon(item.priority)}
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="all" className="space-y-3 mt-4">
              {actionItems.map(item => (
                <div key={item.id} className={`p-4 border rounded-lg ${getPriorityColor(item.priority)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getPriorityIcon(item.priority)}
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      {item.type === 'verification' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleQuickAction('approve_verification', item.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Quick Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMainDashboard;