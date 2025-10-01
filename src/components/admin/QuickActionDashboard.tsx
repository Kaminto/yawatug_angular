import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Users, 
  TrendingUp,
  DollarSign,
  Activity,
  Zap,
  Timer,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface QuickActionItem {
  id: string;
  type: 'verification' | 'transaction' | 'support' | 'alert';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  amount?: number;
  timestamp: string;
  actionUrl?: string;
}

const QuickActionDashboard: React.FC = () => {
  const [actionItems, setActionItems] = useState<QuickActionItem[]>([]);
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    pendingTransactions: 0,
    activeUsers: 0,
    dailyVolume: 0,
    criticalAlerts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    setupRealTimeUpdates();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch pending verifications
      const { data: pendingVerifications } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture_url, updated_at')
        .eq('status', 'pending_verification')
        .order('updated_at', { ascending: true })
        .limit(5);

      // Fetch recent user stats
      const { data: userStats } = await supabase
        .from('profiles')
        .select('status')
        .not('status', 'is', null);

      // Fetch pending wallet requests
      const { data: pendingTransactions } = await supabase
        .from('wallet_requests')
        .select('id, amount, request_type, status, created_at, user_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5);

      // Process action items
      const items: QuickActionItem[] = [];

      // Add verification items
      pendingVerifications?.forEach(user => {
        const hoursSinceSubmission = Math.floor(
          (Date.now() - new Date(user.updated_at).getTime()) / (1000 * 60 * 60)
        );
        
        items.push({
          id: `verification-${user.id}`,
          type: 'verification',
          priority: hoursSinceSubmission > 24 ? 'high' : hoursSinceSubmission > 12 ? 'medium' : 'low',
          title: 'Identity Verification Pending',
          description: `${user.full_name} submitted ${hoursSinceSubmission}h ago`,
          user: {
            id: user.id,
            name: user.full_name,
            avatar: user.profile_picture_url
          },
          timestamp: user.updated_at,
          actionUrl: `/admin/users?tab=verification&userId=${user.id}`
        });
      });

      // Add transaction items (simplified without user details for now)
      pendingTransactions?.forEach(transaction => {
        const hoursSincePending = Math.floor(
          (Date.now() - new Date(transaction.created_at).getTime()) / (1000 * 60 * 60)
        );
        
        items.push({
          id: `transaction-${transaction.id}`,
          type: 'transaction',
          priority: hoursSincePending > 2 ? 'high' : 'medium',
          title: `${transaction.request_type} Approval Needed`,
          description: `UGX ${transaction.amount?.toLocaleString()} - ${hoursSincePending}h pending`,
          amount: transaction.amount,
          timestamp: transaction.created_at,
          actionUrl: `/admin/wallet/approvals?transactionId=${transaction.id}`
        });
      });

      // Sort by priority and timestamp
      items.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

      setActionItems(items);

      // Calculate stats
      const stats = {
        pendingVerifications: pendingVerifications?.length || 0,
        pendingTransactions: pendingTransactions?.length || 0,
        activeUsers: userStats?.filter(u => u.status === 'active').length || 0,
        dailyVolume: 0, // TODO: Calculate from recent transactions
        criticalAlerts: items.filter(i => i.priority === 'high').length
      };

      setStats(stats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeUpdates = () => {
    const subscription = supabase
      .channel('admin_dashboard_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' }, 
        loadDashboardData
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'wallet_requests' }, 
        loadDashboardData
      )
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const handleQuickApproval = async (itemId: string, action: 'approve' | 'reject') => {
    try {
      const item = actionItems.find(i => i.id === itemId);
      if (!item) return;

      if (item.type === 'verification') {
        const userId = item.id.replace('verification-', '');
        const newStatus = action === 'approve' ? 'active' : 'blocked';
        
        await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('id', userId);
      } else if (item.type === 'transaction') {
        const transactionId = item.id.replace('transaction-', '');
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        
        await supabase
          .from('wallet_requests')
          .update({ status: newStatus })
          .eq('id', transactionId);
      }

      toast.success(`Item ${action}d successfully`);
      loadDashboardData();
    } catch (error) {
      console.error(`Error ${action}ing item:`, error);
      toast.error(`Failed to ${action} item`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'verification': return <CheckCircle2 className="h-4 w-4" />;
      case 'transaction': return <DollarSign className="h-4 w-4" />;
      case 'support': return <AlertTriangle className="h-4 w-4" />;
      case 'alert': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className={stats.criticalAlerts > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.criticalAlerts > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.criticalAlerts > 0 ? 'text-red-600' : ''}`}>
              {stats.criticalAlerts}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingVerifications}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
            <Timer className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingTransactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">98%</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yawatu-gold" />
            Immediate Actions Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actionItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <p className="text-muted-foreground">All caught up! No immediate actions needed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actionItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                    item.priority === 'high' ? 'border-l-red-500 bg-red-50' :
                    item.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                    'border-l-green-500 bg-green-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      item.priority === 'high' ? 'bg-red-100' :
                      item.priority === 'medium' ? 'bg-yellow-100' :
                      'bg-green-100'
                    }`}>
                      {getTypeIcon(item.type)}
                    </div>
                    
                    {item.user && (
                      <Avatar className="h-8 w-8">
                        {item.user.avatar ? (
                          <AvatarImage src={item.user.avatar} alt={item.user.name} />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {item.user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{item.title}</h4>
                        <Badge className={getPriorityColor(item.priority)} variant="outline">
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {item.type === 'verification' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleQuickApproval(item.id, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleQuickApproval(item.id, 'approve')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </>
                    )}
                    
                    {item.actionUrl && (
                      <Button asChild variant="secondary" size="sm">
                        <Link to={item.actionUrl}>
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickActionDashboard;