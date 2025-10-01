import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Users, Trash2, Wallet, Database, BarChart3, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const AuthProfileSyncManager = () => {
  const [syncing, setSyncing] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [creatingWallets, setCreatingWallets] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);
  const [creatingAuth, setCreatingAuth] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [orphanedUsers, setOrphanedUsers] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [orphanedProfiles, setOrphanedProfiles] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load sync status on component mount and with auto-refresh
  useEffect(() => {
    loadSyncStatus();
    
    if (autoRefresh) {
      const interval = setInterval(loadSyncStatus, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadSyncStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
        body: { action: 'get_status' }
      });

      if (error) {
        console.error('Error loading sync status:', error);
        return;
      }

      setSyncStatus(data);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
        body: { action: 'sync' }
      });

      if (error) {
        toast.error('Failed to sync profiles');
        console.error('Sync error:', error);
        return;
      }

      setSyncResults(data);
      toast.success('Profile sync completed successfully');
      
      // Refresh status after sync
      setTimeout(loadSyncStatus, 1000);
    } catch (error) {
      toast.error('An error occurred during sync');
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleCleanupOrphans = async () => {
    setCleaningUp(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
        body: { action: 'cleanup_orphans' }
      });

      if (error) {
        toast.error('Failed to cleanup orphaned users');
        console.error('Cleanup error:', error);
        return;
      }

      setOrphanedUsers(data.orphanedAuthUsers || []);
      toast.info(`Found ${data.orphanedAuthUsers?.length || 0} orphaned auth users`);
    } catch (error) {
      toast.error('An error occurred during cleanup');
      console.error('Cleanup error:', error);
    } finally {
      setCleaningUp(false);
    }
  };

  const handleCreateWallets = async () => {
    setCreatingWallets(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
        body: { action: 'create_wallets' }
      });

      if (error) {
        toast.error('Failed to create wallets');
        console.error('Wallet creation error:', error);
        return;
      }

      setSyncResults(data);
      toast.success(`Created ${data.wallets_created || 0} wallets successfully`);
      
      // Refresh status after wallet creation
      setTimeout(loadSyncStatus, 1000);
    } catch (error) {
      toast.error('An error occurred while creating wallets');
      console.error('Wallet creation error:', error);
    } finally {
      setCreatingWallets(false);
    }
  };

  const handleFullConsistencyCheck = async () => {
    setRunningCheck(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
        body: { action: 'full_consistency_check' }
      });

      if (error) {
        toast.error('Failed to run consistency check');
        console.error('Consistency check error:', error);
        return;
      }

      setSyncResults(data);
      if (data.orphanedProfiles) {
        setOrphanedProfiles(data.orphanedProfiles);
      }
      toast.success('Consistency check completed successfully');
      
      // Refresh status after check
      setTimeout(loadSyncStatus, 1000);
    } catch (error) {
      toast.error('An error occurred during consistency check');
      console.error('Consistency check error:', error);
    } finally {
      setRunningCheck(false);
    }
  };

  const handleCreateAuthForOrphans = async () => {
    setCreatingAuth(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
        body: { action: 'create_auth_for_orphans' }
      });

      if (error) {
        toast.error('Failed to process orphaned profiles');
        console.error('Auth creation error:', error);
        return;
      }

      setSyncResults(data);
      if (data.profilesNeedingAuth) {
        setOrphanedProfiles(data.profilesNeedingAuth);
      }
      toast.success(data.message || 'Orphaned profiles processed successfully');
      
      // Refresh status after processing
      setTimeout(loadSyncStatus, 1000);
    } catch (error) {
      toast.error('An error occurred while processing orphaned profiles');
      console.error('Auth creation error:', error);
    } finally {
      setCreatingAuth(false);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Enhanced Auth & Profile Sync Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Status Overview */}
        {syncStatus && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">Total Profiles</h3>
              <p className="text-2xl font-bold">{syncStatus.total_profiles}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">Auth Accounts</h3>
              <p className="text-2xl font-bold">{syncStatus.auth_accounts_estimated}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">Orphaned Profiles</h3>
              <p className="text-2xl font-bold text-red-600">{syncStatus.orphaned_profiles}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">Missing Wallets</h3>
              <p className="text-2xl font-bold text-yellow-600">{syncStatus.profiles_without_wallets}</p>
            </div>
          </div>
        )}

        {/* Health Score */}
        {syncStatus && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Sync Health Score</h3>
              <Badge className={getHealthScoreBadge(syncStatus.sync_health_score)}>
                {syncStatus.sync_health_score}/100
              </Badge>
            </div>
            <Progress value={syncStatus.sync_health_score} className="w-full" />
            <p className="text-xs text-muted-foreground mt-1">
              Last checked: {new Date(syncStatus.last_checked).toLocaleString()}
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleFullConsistencyCheck} 
            disabled={runningCheck}
            className="flex items-center gap-2"
          >
            {runningCheck ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {runningCheck ? 'Checking...' : 'Full Consistency Check'}
          </Button>
          
          <Button 
            onClick={handleCreateWallets} 
            disabled={creatingWallets}
            variant="outline"
            className="flex items-center gap-2"
          >
            {creatingWallets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            {creatingWallets ? 'Creating...' : 'Create Missing Wallets'}
          </Button>

          <Button 
            onClick={handleCreateAuthForOrphans} 
            disabled={creatingAuth}
            variant={orphanedProfiles.length > 0 ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            {creatingAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            {creatingAuth ? 'Processing...' : 'Process Orphaned Profiles'}
          </Button>
          
          <Button 
            onClick={handleSync} 
            disabled={syncing}
            variant="outline"
            className="flex items-center gap-2"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'Syncing...' : 'Legacy Sync'}
          </Button>
          
          <Button 
            onClick={handleCleanupOrphans} 
            disabled={cleaningUp}
            variant="outline"
            className="flex items-center gap-2"
          >
            {cleaningUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {cleaningUp ? 'Cleaning...' : 'Find Orphaned Auth'}
          </Button>

          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)} 
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            {autoRefresh ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4" />}
            Auto Refresh
          </Button>
        </div>

        {/* Results Display */}
        {syncResults && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                {syncResults.success ? (
                  <div className="text-green-600">
                    <strong>{syncResults.message || 'Operation completed successfully!'}</strong>
                    {syncResults.results && syncResults.results.profilesUpdated && (
                      <p>Updated profiles: {syncResults.results.profilesUpdated}</p>
                    )}
                    {syncResults.wallets_created && (
                      <p>Created wallets: {syncResults.wallets_created}</p>
                    )}
                    {syncResults.walletsCreated && (
                      <p>Wallets created: {syncResults.walletsCreated}</p>
                    )}
                    {syncResults.orphaned_count && (
                      <p>Orphaned users found: {syncResults.orphaned_count}</p>
                    )}
                    {syncResults.authAccountsNeeded && (
                      <p>Profiles needing auth: {syncResults.authAccountsNeeded}</p>
                    )}
                    {syncResults.recommendations && (
                      <div className="mt-2">
                        <strong>Recommendations:</strong>
                        <ul className="list-disc list-inside">
                          {syncResults.recommendations.map((rec: string, index: number) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-600">
                    <strong>Operation failed:</strong> {syncResults.error}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Orphaned Users List */}
        {orphanedUsers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-yellow-600">Orphaned Auth Users (No Profiles)</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {orphanedUsers.map((user: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg bg-yellow-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.email || 'No email'}</p>
                      <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive">Orphaned Auth</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orphaned Profiles List */}
        {orphanedProfiles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-red-600">Orphaned Profiles (Need Auth Accounts)</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {orphanedProfiles.map((profile: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg bg-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{profile.full_name || 'No name'}</p>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive">No Auth</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthProfileSyncManager;