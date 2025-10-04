import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  RefreshCw, Loader2, Database, Wallet, User, 
  CheckCircle, AlertTriangle, XCircle, ArrowRight,
  Users, Link2, Unlink, PlayCircle, Search, Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SyncIssue {
  id: string;
  type: 'orphaned_auth' | 'orphaned_profile' | 'missing_wallet';
  email?: string;
  phone?: string;
  full_name?: string;
  severity: 'critical' | 'warning' | 'info';
  details: string;
  matchingProfile?: any;
}

interface SyncStats {
  total_users: number;
  synced_accounts: number;
  orphaned_auths: number;
  orphaned_profiles: number;
  profiles_without_wallets: number;
  health_score: number;
}

interface ComprehensiveSyncDashboardProps {
  onRefresh?: () => void;
}

const ComprehensiveSyncDashboard: React.FC<ComprehensiveSyncDashboardProps> = ({ onRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [stats, setStats] = useState<SyncStats>({
    total_users: 0,
    synced_accounts: 0,
    orphaned_auths: 0,
    orphaned_profiles: 0,
    profiles_without_wallets: 0,
    health_score: 100
  });
  const [issues, setIssues] = useState<SyncIssue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSyncStatus = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, phone, full_name, auth_created_at');

      if (profilesError) throw profilesError;

      // Get wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('user_id');

      if (walletsError) throw walletsError;

      // Check for orphaned auth users via edge function
      const { data: authCheckData } = await supabase.functions.invoke('sync-auth-profiles', {
        body: { action: 'check_sync_status' }
      });

      const walletsMap = new Map(wallets.map(w => [w.user_id, true]));
      const profileIds = new Set(profiles.map(p => p.id));
      
      // Calculate stats and issues
      const orphanedProfiles = profiles.filter(p => !p.auth_created_at);
      const profilesWithoutWallets = profiles.filter(p => !walletsMap.has(p.id));
      
      const newIssues: SyncIssue[] = [];

      // Add orphaned profiles as issues
      orphanedProfiles.forEach(p => {
        newIssues.push({
          id: p.id,
          type: 'orphaned_profile',
          email: p.email || undefined,
          phone: p.phone || undefined,
          full_name: p.full_name || undefined,
          severity: (!p.email && !p.phone) ? 'critical' : (p.email ? 'critical' : 'warning'),
          details: !p.email && !p.phone 
            ? 'Profile has no email or phone - cannot sync'
            : !p.email && p.phone
            ? 'Profile has only phone - will create activation invitation'
            : 'Profile exists but has no auth account'
        });
      });

      // Add orphaned auth users as issues
      let orphanedAuthCount = 0;
      if (authCheckData?.orphanedAuthUsers) {
        authCheckData.orphanedAuthUsers.forEach((authUser: any) => {
          if (!profileIds.has(authUser.id)) {
            const details = authUser.matchingProfile 
              ? `Auth user exists but profile ID mismatch. Matching profile found by ${authUser.matchingProfile.email === authUser.email ? 'email' : 'phone'}`
              : (!authUser.email && authUser.phone)
              ? 'Auth has only phone - will create profile, user can login via phone'
              : 'Auth user exists but has no profile';
            
            newIssues.push({
              id: authUser.id,
              type: 'orphaned_auth',
              email: authUser.email || undefined,
              phone: authUser.phone || undefined,
              full_name: authUser.user_metadata?.full_name || undefined,
              severity: authUser.matchingProfile ? 'warning' : 'critical',
              details,
              matchingProfile: authUser.matchingProfile
            });
            orphanedAuthCount++;
          }
        });
      }

      // Add profiles without wallets as issues
      profilesWithoutWallets.forEach(p => {
        newIssues.push({
          id: p.id,
          type: 'missing_wallet',
          email: p.email || undefined,
          full_name: p.full_name || undefined,
          severity: 'warning',
          details: 'Profile has no wallet records'
        });
      });

      const totalUsers = profiles.length + orphanedAuthCount;
      const syncedAccounts = profiles.filter(p => p.auth_created_at && walletsMap.has(p.id)).length;
      const healthScore = totalUsers > 0 ? Math.round((syncedAccounts / totalUsers) * 100) : 100;

      setStats({
        total_users: totalUsers,
        synced_accounts: syncedAccounts,
        orphaned_auths: orphanedAuthCount,
        orphaned_profiles: orphanedProfiles.length,
        profiles_without_wallets: profilesWithoutWallets.length,
        health_score: healthScore
      });

      setIssues(newIssues);
    } catch (error) {
      console.error('Error loading sync status:', error);
      toast.error('Failed to load sync status');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSync = async (type: 'all' | 'selected') => {
    setSyncing(true);
    try {
      const issuesToSync = type === 'all' ? issues : issues.filter(i => selectedIssues.has(i.id));
      
      if (issuesToSync.length === 0) {
        toast.info('No issues to sync');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Group issues by type for efficient bulk processing
      const walletIssues = issuesToSync.filter(i => i.type === 'missing_wallet');
      const authIssues = issuesToSync.filter(i => i.type === 'orphaned_profile');
      const profileIssues = issuesToSync.filter(i => i.type === 'orphaned_auth');

      // Process wallet creations
      for (const issue of walletIssues) {
        try {
          const { error } = await supabase
            .from('wallets')
            .insert([
              { user_id: issue.id, currency: 'UGX', balance: 0, status: 'active' },
              { user_id: issue.id, currency: 'USD', balance: 0, status: 'active' }
            ]);
          
          if (!error) successCount++;
          else failCount++;
        } catch (error) {
          console.error(`Failed to create wallet for ${issue.id}:`, error);
          failCount++;
        }
      }

      // Process auth account creations
      if (authIssues.length > 0) {
        try {
          const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
            body: { 
              action: 'create_auth_for_orphans',
              target_profile_ids: authIssues.map(i => i.id)
            }
          });
          
          if (error) throw error;
          
          if (data?.results) {
            successCount += data.results.success || 0;
            failCount += data.results.failed || 0;
            
            // Log created accounts with temp passwords
            if (data.results.created?.length > 0) {
              console.log('✅ Created auth accounts:', data.results.created);
              toast.success(
                `Created ${data.results.created.length} auth accounts. Check console for temporary passwords.`,
                { duration: 8000 }
              );
            }
            
            // Log errors
            if (data.results.errors?.length > 0) {
              console.error('❌ Failed to create auth for some profiles:', data.results.errors);
              data.results.errors.forEach((err: any) => {
                console.error(`  - ${err.email}: ${err.error}${err.error_code ? ` (${err.error_code})` : ''}`);
              });
            }
          }
        } catch (error) {
          console.error('❌ Failed to create auth accounts:', error);
          failCount += authIssues.length;
        }
      }

      // Process profile creations for orphaned auth users
      if (profileIssues.length > 0) {
        try {
          const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
            body: { 
              action: 'create_profiles_for_orphans',
              target_profile_ids: profileIssues.map(i => i.id)
            }
          });
          
          if (error) throw error;
          
          if (data?.results) {
            successCount += data.results.success || 0;
            failCount += data.results.failed || 0;
            
            if (data.results.created?.length > 0) {
              console.log('✅ Created profiles:', data.results.created);
              toast.success(`Created ${data.results.created.length} profiles`);
            }
            
            // Log errors
            if (data.results.errors?.length > 0) {
              console.error('❌ Failed to create profiles for some auth users:', data.results.errors);
              data.results.errors.forEach((err: any) => {
                console.error(`  - ${err.email}: ${err.error}${err.error_code ? ` (${err.error_code})` : ''}`);
              });
            }
          }
        } catch (error) {
          console.error('❌ Failed to create profiles:', error);
          failCount += profileIssues.length;
        }
      }

      toast.success(`Sync completed: ${successCount} succeeded, ${failCount} failed`);
      await loadSyncStatus();
      setSelectedIssues(new Set());
    } catch (error) {
      console.error('Bulk sync error:', error);
      toast.error('Bulk sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleIndividualSync = async (issue: SyncIssue) => {
    try {
      if (issue.type === 'missing_wallet') {
        const { error } = await supabase
          .from('wallets')
          .insert([
            { user_id: issue.id, currency: 'UGX', balance: 0, status: 'active' },
            { user_id: issue.id, currency: 'USD', balance: 0, status: 'active' }
          ]);
        
        if (error) throw error;
        toast.success('Wallets created successfully');
      } else if (issue.type === 'orphaned_profile') {
        // Call edge function to create auth account
        const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
          body: { 
            action: 'create_auth_for_orphans',
            target_profile_ids: [issue.id]
          }
        });
        
        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }
        
        if (data?.results?.created?.length > 0) {
          const created = data.results.created[0];
          if (created.invitation_token) {
            toast.success(
              `Invitation created for phone-only profile. User needs to activate via invitation token.`,
              { duration: 10000 }
            );
            console.log('✅ Invitation created:', created);
          } else if (created.temp_password) {
            toast.success(
              `Auth account created for ${created.email}. Temporary password: ${created.temp_password}`,
              { duration: 10000 }
            );
            console.log('✅ Auth account created:', created);
          } else {
            toast.success('Auth account created successfully');
          }
        } else if (data?.results?.errors?.length > 0) {
          const error = data.results.errors[0];
          console.error('❌ Auth creation failed:', error);
          toast.error(`Failed: ${error.error}${error.error_code ? ` (${error.error_code})` : ''}`, { duration: 8000 });
        } else {
          toast.success('Auth account created successfully');
        }
      } else if (issue.type === 'orphaned_auth') {
        // Call edge function to create profile
        const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
          body: { 
            action: 'create_profiles_for_orphans',
            target_profile_ids: [issue.id]
          }
        });
        
        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }
        
        if (data?.results?.created?.length > 0) {
          const created = data.results.created[0];
          const message = created.note || `Profile created for ${issue.email || issue.phone}`;
          toast.success(message);
          console.log('✅ Profile created:', created);
        } else if (data?.results?.errors?.length > 0) {
          const error = data.results.errors[0];
          console.error('❌ Profile creation failed:', error);
          toast.error(`Failed: ${error.error}${error.error_code ? ` (${error.error_code})` : ''}`, { duration: 8000 });
        } else {
          toast.success('Profile created successfully');
        }
      }
      
      await loadSyncStatus();
    } catch (error: any) {
      console.error('❌ Individual sync error:', error);
      toast.error(`Failed to sync: ${error.message || 'Unknown error'}`);
    }
  };

  const toggleIssueSelection = (id: string) => {
    const newSelection = new Set(selectedIssues);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIssues(newSelection);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleCleanupCriticalIssues = async () => {
    setCleaning(true);
    try {
      // Find all profiles without auth accounts
      const unsyncableProfiles = issues.filter(issue => 
        issue.type === 'orphaned_profile'
      );

      if (unsyncableProfiles.length === 0) {
        toast.info('No profiles without auth accounts found');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      console.log(`🗑️ Removing ${unsyncableProfiles.length} profiles without auth...`);
      
      for (const issue of unsyncableProfiles) {
        try {
          console.log(`  Deleting profile ${issue.id} (${issue.full_name || 'No name'})`);
          
          // Delete the auth user first (which will cascade delete the profile due to FK constraint)
          const { error: authError } = await supabase.auth.admin.deleteUser(issue.id);
          
          if (authError) {
            // If auth user doesn't exist, just delete the profile directly
            console.log(`  ⚠️ No auth user found for ${issue.id}, deleting profile only`);
            const { error: profileError } = await supabase
              .from('profiles')
              .delete()
              .eq('id', issue.id);
            
            if (profileError) {
              console.error(`  ❌ Failed to delete profile ${issue.id}:`, profileError);
              failCount++;
            } else {
              console.log(`  ✅ Deleted profile ${issue.id}`);
              successCount++;
            }
          } else {
            console.log(`  ✅ Deleted profile ${issue.id}`);
            successCount++;
          }
        } catch (error) {
          console.error(`  ❌ Error deleting profile ${issue.id}:`, error);
          failCount++;
        }
      }

      console.log(`✅ Cleanup completed: ${successCount} removed, ${failCount} failed`);
      toast.success(`Cleanup completed: ${successCount} profiles removed${failCount > 0 ? `, ${failCount} failed` : ''}`);
      await loadSyncStatus();
      
      // Notify parent to refresh profiles list
      if (onRefresh) {
        onRefresh();
      }
      
      setShowCleanupDialog(false);
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      toast.error('Cleanup failed');
    } finally {
      setCleaning(false);
    }
  };

  const getUnsyncableCount = () => {
    // Count all profiles without auth accounts
    return issues.filter(issue => 
      issue.type === 'orphaned_profile'
    ).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            <span className="font-medium">Unified Sync Dashboard</span>
          </h2>
          <p className="text-muted-foreground">
            Complete auth ↔ profile ↔ wallet relationship management. Supports phone-only and email-only users.
          </p>
        </div>
        <Button onClick={loadSyncStatus} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Info Banner */}
      {issues.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{issues.length} sync issues found.</strong> Use "Sync Selected/All" to fix recoverable issues. 
            Profiles without email AND phone cannot be synced and should be removed using "Remove Unsyncable".
          </AlertDescription>
        </Alert>
      )}

      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Health</span>
            <Badge className={getHealthColor(stats.health_score)}>
              {stats.health_score}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={stats.health_score} className="mb-2" />
          <p className="text-sm text-muted-foreground">
            {stats.synced_accounts} of {stats.total_users} accounts fully synchronized
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total_users}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.synced_accounts}</p>
                <p className="text-xs text-muted-foreground">Synced</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.orphaned_profiles}</p>
                <p className="text-xs text-muted-foreground">No Auth</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.profiles_without_wallets}</p>
                <p className="text-xs text-muted-foreground">No Wallet</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Unlink className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{issues.length}</p>
                <p className="text-xs text-muted-foreground">Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sync Issues</CardTitle>
            <div className="flex gap-2">
              {selectedIssues.size > 0 && (
                <Badge variant="secondary">
                  {selectedIssues.size} selected
                </Badge>
              )}
              <Button
                onClick={() => handleBulkSync('selected')}
                disabled={selectedIssues.size === 0 || syncing}
                size="sm"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                Sync Selected
              </Button>
              <Button
                onClick={() => handleBulkSync('all')}
                disabled={issues.length === 0 || syncing}
                size="sm"
                variant="outline"
              >
                Sync All
              </Button>
              <Button
                onClick={() => setShowCleanupDialog(true)}
                disabled={cleaning || getUnsyncableCount() === 0}
                size="sm"
                variant="destructive"
              >
                {cleaning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Remove Unsyncable ({getUnsyncableCount()})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="text-lg font-medium">All systems synchronized!</p>
              <p className="text-sm text-muted-foreground">No issues found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedIssues.size === issues.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIssues(new Set(issues.map(i => i.id)));
                          } else {
                            setSelectedIssues(new Set());
                          }
                        }}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIssues.has(issue.id)}
                          onChange={() => toggleIssueSelection(issue.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {issue.type === 'orphaned_profile' && <User className="h-3 w-3 mr-1" />}
                          {issue.type === 'missing_wallet' && <Wallet className="h-3 w-3 mr-1" />}
                          {issue.type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                       <TableCell>
                        <div>
                          <p className="font-medium">{issue.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">
                            {issue.email || issue.phone || 'No contact info'}
                          </p>
                          {!issue.email && issue.phone && issue.type === 'orphaned_profile' && (
                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                              📱 Phone-only - needs invitation
                            </p>
                          )}
                          {!issue.email && issue.phone && issue.type === 'orphaned_auth' && (
                            <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                              📱 Phone-only - can login via phone
                            </p>
                          )}
                          {issue.matchingProfile && (
                            <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                              <Search className="h-3 w-3" />
                              Match found: {issue.matchingProfile.full_name}
                            </p>
                          )}
                        </div>
                       </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {issue.details}
                      </TableCell>
                       <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleIndividualSync(issue)}
                          disabled={syncing || (!issue.email && !issue.phone)}
                          title={!issue.email && !issue.phone ? 'Cannot sync - no email or phone' : 'Sync this user'}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          {issue.type === 'orphaned_profile' && !issue.email && issue.phone ? 'Send Invite' : 'Sync'}
                        </Button>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common sync operations for maintaining system health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4"
              onClick={async () => {
                const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
                  body: { action: 'create_wallets' }
                });
                if (!error) {
                  toast.success('Wallet creation completed');
                  await loadSyncStatus();
                }
              }}
            >
              <Wallet className="h-6 w-6 mb-2" />
              <span className="font-medium">Create Missing Wallets</span>
              <span className="text-xs text-muted-foreground mt-1">
                Create UGX & USD wallets for all users
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4"
              onClick={async () => {
                const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
                  body: { action: 'full_consistency_check' }
                });
                if (!error) {
                  toast.success('Consistency check completed');
                  await loadSyncStatus();
                }
              }}
            >
              <Database className="h-6 w-6 mb-2" />
              <span className="font-medium">Full Consistency Check</span>
              <span className="text-xs text-muted-foreground mt-1">
                Verify all auth, profile, and wallet links
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4"
              onClick={async () => {
                const { data, error } = await supabase.functions.invoke('sync-auth-profiles', {
                  body: { action: 'sync' }
                });
                if (!error) {
                  toast.success('Legacy sync completed');
                  await loadSyncStatus();
                }
              }}
            >
              <RefreshCw className="h-6 w-6 mb-2" />
              <span className="font-medium">Legacy Profile Sync</span>
              <span className="text-xs text-muted-foreground mt-1">
                Update profile metadata from auth
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Confirmation Dialog */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Unsyncable Profiles?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will permanently delete <strong>{getUnsyncableCount()} profiles</strong> that cannot be synced:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>No authentication account</li>
                <li>No email AND no phone number</li>
                <li>Cannot create auth accounts or send invitations</li>
                <li>These profiles are unusable and should be removed</li>
              </ul>
              <p className="text-red-600 font-medium mt-3">⚠️ This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cleaning}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCleanupCriticalIssues}
              disabled={cleaning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cleaning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete {getUnsyncableCount()} Profiles
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComprehensiveSyncDashboard;
