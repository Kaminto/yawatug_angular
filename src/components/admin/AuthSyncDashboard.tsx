import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Users, AlertTriangle, CheckCircle } from 'lucide-react';

interface AuthSyncStats {
  totalProfiles: number;
  importedProfiles: number;
  activatedProfiles: number;
  pendingActivation: number;
  authAccounts: number;
}

interface SyncLogEntry {
  id: string;
  profile_id: string;
  sync_status: string;
  error_message?: string;
  attempt_count: number;
  last_attempt_at?: string;
  created_at: string;
  profile?: {
    email: string;
    full_name: string;
  };
}

const AuthSyncDashboard: React.FC = () => {
  const [stats, setStats] = useState<AuthSyncStats>({
    totalProfiles: 0,
    importedProfiles: 0,
    activatedProfiles: 0,
    pendingActivation: 0,
    authAccounts: 0
  });
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // Get stats from profiles table
      const { data: profileStats } = await supabase
        .from('profiles')
        .select('import_batch_id, account_activation_status, auth_created_at')
        .order('created_at', { ascending: false });

      if (profileStats) {
        const imported = profileStats.filter(p => p.import_batch_id).length;
        const activated = profileStats.filter(p => p.auth_created_at).length;
        const pending = profileStats.filter(p => 
          p.import_batch_id && 
          p.account_activation_status === 'pending'
        ).length;

        setStats({
          totalProfiles: profileStats.length,
          importedProfiles: imported,
          activatedProfiles: activated,
          pendingActivation: pending,
          authAccounts: activated // Approximation
        });
      }

      // Get sync logs
      const { data: logs } = await supabase
        .from('auth_profile_sync_log')
        .select(`
          *,
          profile:profiles!auth_profile_sync_log_profile_id_fkey(email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (logs) {
        setSyncLogs(logs);
      }
    } catch (error) {
      console.error('Error fetching auth sync data:', error);
      toast.error('Failed to load sync dashboard data');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleBulkActivation = async () => {
    try {
      // Get all imported users without auth accounts
      const { data: pendingUsers } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .not('import_batch_id', 'is', null)
        .is('auth_created_at', null)
        .limit(10); // Process in batches

      if (!pendingUsers || pendingUsers.length === 0) {
        toast.info('No pending users found for activation');
        return;
      }

      toast.info(`Starting bulk activation for ${pendingUsers.length} users...`);

      // Process each user
      for (const user of pendingUsers) {
        try {
          const { data } = await supabase.functions.invoke('handle-imported-user-auth', {
            body: { email: user.email, action: 'create_invitation' }
          });

          if (data?.success) {
            console.log(`Invitation sent to ${user.email}`);
          }
        } catch (error) {
          console.error(`Failed to process ${user.email}:`, error);
        }
      }

      toast.success('Bulk activation invitations sent!');
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Bulk activation error:', error);
      toast.error('Failed to process bulk activation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Auth Sync Dashboard</h2>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleBulkActivation} className="bg-primary">
            Send Bulk Invitations
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profiles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProfiles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imported Users</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.importedProfiles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activated</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activatedProfiles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingActivation}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.importedProfiles > 0 
                ? Math.round((stats.activatedProfiles / stats.importedProfiles) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[150px]">Full Name</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[80px]">Attempts</TableHead>
                  <TableHead className="min-w-[120px]">Last Attempt</TableHead>
                  <TableHead className="min-w-[200px]">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.profile?.email || 'N/A'}
                    </TableCell>
                    <TableCell>{log.profile?.full_name || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(log.sync_status)}</TableCell>
                    <TableCell>{log.attempt_count}</TableCell>
                    <TableCell className="text-sm">
                      {log.last_attempt_at ? new Date(log.last_attempt_at).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {log.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthSyncDashboard;