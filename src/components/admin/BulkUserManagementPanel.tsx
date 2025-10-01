import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  Database,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkOperation {
  type: 'invite' | 'approve' | 'reject' | 'status_change';
  userIds: string[];
  parameters?: {
    status?: string;
    notes?: string;
    emailTemplate?: string;
  };
}

interface UserStats {
  total: number;
  imported: number;
  pending_activation: number;
  pending_verification: number;
  active: number;
  blocked: number;
}

const BulkUserManagementPanel = () => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    imported: 0,
    pending_activation: 0,
    pending_verification: 0,
    active: 0,
    blocked: 0
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation>({
    type: 'invite',
    userIds: [],
    parameters: {}
  });
  const [operationProgress, setOperationProgress] = useState(0);

  useEffect(() => {
    loadUsersAndStats();
  }, []);

  const loadUsersAndStats = async () => {
    try {
      setLoading(true);
      
      // Load all users for bulk operations
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          status,
          account_activation_status,
          import_batch_id,
          created_at,
          auth_created_at,
          is_verified
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (usersError) throw usersError;

      setUsers(usersData || []);

      // Calculate stats
      const stats = {
        total: usersData?.length || 0,
        imported: usersData?.filter(u => u.import_batch_id).length || 0,
        pending_activation: usersData?.filter(u => 
          u.account_activation_status === 'pending' && !u.auth_created_at
        ).length || 0,
        pending_verification: usersData?.filter(u => 
          u.status === 'pending_verification'
        ).length || 0,
        active: usersData?.filter(u => u.status === 'active').length || 0,
        blocked: usersData?.filter(u => u.status === 'blocked').length || 0
      };

      setUserStats(stats);
    } catch (error) {
      console.error('Error loading users and stats:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleBulkOperation = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users to process');
      return;
    }

    try {
      setProcessing(true);
      setOperationProgress(0);
      
      const operation = {
        ...bulkOperation,
        userIds: selectedUsers
      };

      let result;
      switch (operation.type) {
        case 'invite':
          result = await supabase.rpc('bulk_invite_imported_users', {
            p_user_ids: operation.userIds,
            p_batch_size: operation.userIds.length
          });
          break;

        case 'approve':
          result = await processBulkApproval(operation.userIds, operation.parameters?.notes);
          break;

        case 'reject':
          result = await processBulkRejection(operation.userIds, operation.parameters?.notes);
          break;

        case 'status_change':
          result = await processBulkStatusChange(
            operation.userIds, 
            operation.parameters?.status, 
            operation.parameters?.notes
          );
          break;
      }

      if (result?.error) throw result.error;

      // Log the bulk operation
      await supabase
        .from('bulk_operations_log')
        .insert({
          operation_type: bulkOperation.type,
          target_count: selectedUsers.length,
          success_count: result?.data?.invitations_sent || selectedUsers.length,
          operation_data: JSON.stringify(bulkOperation),
          status: 'completed'
        });

      toast.success(`Bulk ${bulkOperation.type} completed successfully`);
      setShowBulkDialog(false);
      setSelectedUsers([]);
      loadUsersAndStats();
    } catch (error) {
      console.error('Bulk operation error:', error);
      toast.error(`Failed to execute bulk ${bulkOperation.type}`);
    } finally {
      setProcessing(false);
      setOperationProgress(0);
    }
  };

  const processBulkApproval = async (userIds: string[], notes?: string) => {
    const results = [];
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      setOperationProgress((i / userIds.length) * 100);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'active',
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: notes || 'Bulk approval',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      results.push({ userId, success: !error });
    }
    return { data: results };
  };

  const processBulkRejection = async (userIds: string[], notes?: string) => {
    const results = [];
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      setOperationProgress((i / userIds.length) * 100);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'blocked',
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: notes || 'Bulk rejection',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      results.push({ userId, success: !error });
    }
    return { data: results };
  };

  const processBulkStatusChange = async (userIds: string[], status?: string, notes?: string) => {
    if (!status) throw new Error('Status is required for status change operation');
    
    const results = [];
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      setOperationProgress((i / userIds.length) * 100);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          status: status as 'active' | 'blocked' | 'unverified' | 'pending_verification',
          verification_notes: notes || `Bulk status change to ${status}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      results.push({ userId, success: !error });
    }
    return { data: results };
  };

  const getStatusBadge = (user: any) => {
    if (!user.auth_created_at && user.import_batch_id) {
      return <Badge variant="outline" className="text-yellow-600">Needs Activation</Badge>;
    }
    
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      pending_verification: 'bg-yellow-100 text-yellow-800',
      unverified: 'bg-red-100 text-red-800',
      blocked: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={statusColors[user.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {user.status?.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const reconcileStatuses = async () => {
    try {
      setProcessing(true);
      const { data, error } = await supabase.rpc('reconcile_user_statuses');
      
      if (error) throw error;
      
      toast.success(`Status reconciliation completed: ${(data as any)?.updated_profiles || 0} profiles updated`);
      loadUsersAndStats();
    } catch (error) {
      console.error('Status reconciliation error:', error);
      toast.error('Failed to reconcile user statuses');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Imported</p>
                <p className="text-2xl font-bold text-blue-600">{userStats.imported}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Need Activation</p>
                <p className="text-2xl font-bold text-yellow-600">{userStats.pending_activation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Pending Verification</p>
                <p className="text-2xl font-bold text-orange-600">{userStats.pending_verification}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Blocked</p>
                <p className="text-2xl font-bold text-red-600">{userStats.blocked}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bulk User Management</span>
            <div className="flex gap-2">
              <Button 
                onClick={reconcileStatuses} 
                variant="outline" 
                disabled={processing}
                size="sm"
              >
                <Database className="h-4 w-4 mr-2" />
                Reconcile Statuses
              </Button>
              <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={selectedUsers.length === 0 || processing}
                    size="sm"
                  >
                    Bulk Actions ({selectedUsers.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Bulk Operations</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Operation Type</Label>
                      <Select 
                        value={bulkOperation.type} 
                        onValueChange={(value: any) => 
                          setBulkOperation(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="invite">Send Invitations</SelectItem>
                          <SelectItem value="approve">Bulk Approve</SelectItem>
                          <SelectItem value="reject">Bulk Reject</SelectItem>
                          <SelectItem value="status_change">Change Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkOperation.type === 'status_change' && (
                      <div>
                        <Label>New Status</Label>
                        <Select 
                          value={bulkOperation.parameters?.status} 
                          onValueChange={(value) => 
                            setBulkOperation(prev => ({
                              ...prev,
                              parameters: { ...prev.parameters, status: value }
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending_verification">Pending Verification</SelectItem>
                            <SelectItem value="unverified">Unverified</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={bulkOperation.parameters?.notes || ''}
                        onChange={(e) => 
                          setBulkOperation(prev => ({
                            ...prev,
                            parameters: { ...prev.parameters, notes: e.target.value }
                          }))
                        }
                        placeholder="Add notes for this bulk operation..."
                      />
                    </div>

                    {processing && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Processing...</span>
                          <span>{Math.round(operationProgress)}%</span>
                        </div>
                        <Progress value={operationProgress} />
                      </div>
                    )}

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This action will affect {selectedUsers.length} users. Please review carefully before proceeding.
                      </AlertDescription>
                    </Alert>

                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowBulkDialog(false)}
                        disabled={processing}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleBulkOperation}
                        disabled={processing}
                      >
                        {processing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Execute
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedUsers.length === users.length}
                onCheckedChange={handleSelectAll}
              />
              <Label>Select All ({users.length} users)</Label>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {users.slice(0, 100).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                    />
                    <div>
                      <p className="font-medium">{user.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(user)}
                    {user.import_batch_id && (
                      <Badge variant="outline" className="text-xs">Imported</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {users.length > 100 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Showing first 100 users. Use filters to narrow down your selection for better performance.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkUserManagementPanel;