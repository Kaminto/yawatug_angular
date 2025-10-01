import React, { Suspense, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Eye,
  TrendingUp,
  Users,
  CreditCard,
  Activity,
  Zap,
  UserPlus
} from 'lucide-react';
import { useOptimizedDashboardData } from '@/hooks/useOptimizedDashboardData';

// Placeholder components for lazy loading
const DetailedAnalytics = React.lazy(() => Promise.resolve({ 
  default: () => (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Advanced analytics coming soon...</p>
      </CardContent>
    </Card>
  )
}));

const AdvancedReports = React.lazy(() => Promise.resolve({ 
  default: () => (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Advanced reporting features coming soon...</p>
      </CardContent>
    </Card>
  )
}));

interface PriorityBasedDashboardProps {
  userRole?: 'admin' | 'user';
  priorityLevel?: 'essential' | 'extended' | 'full';
}

const PriorityBasedDashboard: React.FC<PriorityBasedDashboardProps> = ({
  userRole = 'admin',
  priorityLevel = 'essential'
}) => {
  const { metrics, priorityActions, loading, error, refresh } = useOptimizedDashboardData();
  const [expandedView, setExpandedView] = useState(false);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load dashboard data</span>
          </div>
          <Button onClick={refresh} variant="outline" className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = priorityActions.filter(a => a.priority_level === 'critical').length;
  const highCount = priorityActions.filter(a => a.priority_level === 'high').length;

  return (
    <div className="space-y-6">
      {/* PRIORITY LEVEL 1: Critical Alerts & Key Metrics */}
      <div className="space-y-4">
        {/* Critical Alert Banner */}
        {criticalCount > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-destructive animate-pulse" />
                  <span className="font-semibold text-destructive">
                    {criticalCount} Critical Action{criticalCount !== 1 ? 's' : ''} Required
                  </span>
                </div>
                <Button size="sm" variant="destructive">
                  Review Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Essential Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Active Users"
            value={metrics?.active_users || 0}
            icon={TrendingUp}
            variant="success"
            priority="high"
          />
          <MetricCard
            title="Pending Actions"
            value={priorityActions.length}
            icon={Clock}
            variant={criticalCount > 0 ? 'destructive' : 'default'}
            priority="high"
            badge={criticalCount > 0 ? `${criticalCount} Critical` : undefined}
          />
          {priorityLevel !== 'essential' && (
            <>
              <MetricCard
                title="Total Users"
                value={metrics?.total_users || 0}
                icon={Users}
                variant="default"
                priority="medium"
              />
              <MetricCard
                title="New This Week"
                value={metrics?.new_registrations_week || 0}
                icon={UserPlus}
                variant="secondary"
                priority="medium"
              />
            </>
          )}
        </div>
      </div>

      {/* PRIORITY LEVEL 2: Quick Actions */}
      {(priorityLevel === 'extended' || priorityLevel === 'full') && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Priority Queue
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpandedView(!expandedView)}
              >
                {expandedView ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="critical" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="critical" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Critical
                  {criticalCount > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                      {criticalCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="high">
                  High Priority
                  {highCount > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                      {highCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">All ({priorityActions.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="critical" className="space-y-3 mt-4">
                {priorityActions
                  .filter(action => action.priority_level === 'critical')
                  .slice(0, expandedView ? 10 : 3)
                  .map(action => (
                    <ActionItem key={action.id} action={action} />
                  ))}
                {criticalCount === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No critical actions required
                  </div>
                )}
              </TabsContent>

              <TabsContent value="high" className="space-y-3 mt-4">
                {priorityActions
                  .filter(action => action.priority_level === 'high')
                  .slice(0, expandedView ? 10 : 5)
                  .map(action => (
                    <ActionItem key={action.id} action={action} />
                  ))}
              </TabsContent>

              <TabsContent value="all" className="space-y-3 mt-4">
                {priorityActions
                  .slice(0, expandedView ? 20 : 8)
                  .map(action => (
                    <ActionItem key={action.id} action={action} />
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* PRIORITY LEVEL 3: Advanced Features (Lazy Loaded) */}
      {priorityLevel === 'full' && (
        <Suspense fallback={<AdvancedFeaturesSkeleton />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DetailedAnalytics />
            <AdvancedReports />
          </div>
        </Suspense>
      )}
    </div>
  );
};

// Optimized sub-components
const MetricCard: React.FC<{
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'destructive' | 'secondary' | 'success';
  priority: 'high' | 'medium' | 'low';
  badge?: string;
}> = ({ title, value, icon: Icon, variant, badge }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive': return 'border-destructive text-destructive';
      case 'secondary': return 'border-secondary text-secondary';
      case 'success': return 'border-green-500 text-green-600';
      default: return 'border-border text-foreground';
    }
  };

  return (
    <Card className={`${getVariantStyles()}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
          {badge && (
            <Badge variant={variant === 'destructive' ? 'destructive' : 'secondary'} className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ActionItem: React.FC<{ action: any }> = ({ action }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-destructive text-destructive';
      case 'high': return 'border-orange-500 text-orange-600';
      case 'medium': return 'border-primary text-primary';
      default: return 'border-muted text-muted-foreground';
    }
  };

  return (
    <div className={`p-3 border rounded-lg ${getPriorityColor(action.priority_level)}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{action.full_name}</p>
          <p className="text-sm text-muted-foreground">
            Waiting {Math.floor(action.hours_waiting)}h • {action.profile_completion_percentage}% complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4 mr-1" />
            Review
          </Button>
          {action.priority_level === 'critical' && (
            <Button size="sm" variant="destructive">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Loading skeletons
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardHeader className="space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-3 border rounded-lg">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3 mt-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

const AdvancedFeaturesSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {[1, 2].map(i => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export default PriorityBasedDashboard;