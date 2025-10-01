import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  profile_completion_percentage: number;
  created_at: string;
  document_count?: number;
  contact_count?: number;
}

const AdminBulkVerificationTools = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [completionFilter, setCompletionFilter] = useState('all');
  const [bulkAction, setBulkAction] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          status,
          profile_completion_percentage,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'active' | 'blocked' | 'unverified' | 'pending_verification');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get document and contact counts for each user
      const usersWithCounts = await Promise.all(
        (data || []).map(async (user) => {
          const [docResult, contactResult] = await Promise.all([
            supabase
              .from('user_documents')
              .select('id', { count: 'exact' })
              .eq('user_id', user.id),
            supabase
              .from('contact_persons')
              .select('id', { count: 'exact' })
              .eq('user_id', user.id)
          ]);

          return {
            ...user,
            document_count: docResult.count || 0,
            contact_count: contactResult.count || 0
          };
        })
      );

      setUsers(usersWithCounts);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);

    const matchesCompletion = 
      completionFilter === 'all' ||
      (completionFilter === 'complete' && (user.profile_completion_percentage || 0) >= 80) ||
      (completionFilter === 'incomplete' && (user.profile_completion_percentage || 0) < 80);

    return matchesSearch && matchesCompletion;
  });

  const handleUserSelection = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0) {
      toast.error('Please select users and an action');
      return;
    }

    setLoading(true);
    try {
      const userIds = Array.from(selectedUsers);
      let successCount = 0;
      let errorCount = 0;

      for (const userId of userIds) {
        try {
          const updateData: any = { updated_at: new Date().toISOString() };
          
          switch (bulkAction) {
            case 'approve':
              updateData.status = 'active';
              updateData.is_verified = true;
              updateData.verification_reviewed_at = new Date().toISOString();
              if (bulkNotes) updateData.verification_notes = bulkNotes;
              break;
            case 'reject':
              updateData.status = 'blocked';
              updateData.verification_reviewed_at = new Date().toISOString();
              if (bulkNotes) updateData.verification_notes = bulkNotes;
              break;
            case 'pending':
              updateData.status = 'pending_verification';
              break;
            case 'unverified':
              updateData.status = 'unverified';
              updateData.is_verified = false;
              break;
          }

          const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);

          if (error) throw error;

          // Log admin action
          await supabase
            .from('admin_verification_actions')
            .insert({
              user_id: userId,
              admin_id: (await supabase.auth.getUser()).data.user?.id,
              action_type: `bulk_${bulkAction}`,
              notes: bulkNotes || `Bulk ${bulkAction} action`
            });

          successCount++;
        } catch (error) {
          console.error(`Error processing user ${userId}:`, error);
          errorCount++;
        }
      }

      toast.success(`Bulk action completed: ${successCount} successful, ${errorCount} failed`);
      
      // Reload users and clear selections
      await loadUsers();
      setSelectedUsers(new Set());
      setBulkAction('');
      setBulkNotes('');

    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error('Bulk action failed');
    } finally {
      setLoading(false);
    }
  };

  const autoApproveEligible = async () => {
    setLoading(true);
    try {
      // Find users eligible for auto-approval
      const eligibleUsers = filteredUsers.filter(user => 
        user.status === 'pending_verification' &&
        (user.profile_completion_percentage || 0) >= 80 &&
        (user.document_count || 0) >= 1 &&
        (user.contact_count || 0) >= 1
      );

      if (eligibleUsers.length === 0) {
        toast.info('No users eligible for auto-approval');
        return;
      }

      let approvedCount = 0;
      for (const user of eligibleUsers) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              status: 'active',
              is_verified: true,
              verification_reviewed_at: new Date().toISOString(),
              verification_notes: 'Auto-approved: Profile complete with documents and contacts',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (error) throw error;

          await supabase
            .from('admin_verification_actions')
            .insert({
              user_id: user.id,
              admin_id: (await supabase.auth.getUser()).data.user?.id,
              action_type: 'auto_approve',
              notes: 'Auto-approved based on completion criteria'
            });

          approvedCount++;
        } catch (error) {
          console.error(`Error auto-approving user ${user.id}:`, error);
        }
      }

      toast.success(`Auto-approved ${approvedCount} users`);
      await loadUsers();

    } catch (error) {
      console.error('Error in auto-approval:', error);
      toast.error('Auto-approval failed');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadUsers();
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending_verification':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'unverified':
        return <Badge variant="outline">Unverified</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk User Verification Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="pending_verification">Pending Verification</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Completion Filter</Label>
              <Select value={completionFilter} onValueChange={setCompletionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="complete">≥80% Complete</SelectItem>
                  <SelectItem value="incomplete">&lt;80% Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={autoApproveEligible} 
                disabled={loading}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Auto-Approve Eligible
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Bulk Action</Label>
                    <Select value={bulkAction} onValueChange={setBulkAction}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approve">Approve Users</SelectItem>
                        <SelectItem value="reject">Reject Users</SelectItem>
                        <SelectItem value="pending">Set to Pending</SelectItem>
                        <SelectItem value="unverified">Set to Unverified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="bulkNotes">Notes (Optional)</Label>
                    <Textarea
                      id="bulkNotes"
                      placeholder="Add notes for this bulk action..."
                      value={bulkNotes}
                      onChange={(e) => setBulkNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={handleBulkAction}
                      disabled={loading || !bulkAction}
                      className="w-full"
                    >
                      Apply to {selectedUsers.size} users
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 p-4 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Select All ({filteredUsers.length} users)
                </span>
                {selectedUsers.size > 0 && (
                  <Badge variant="outline">{selectedUsers.size} selected</Badge>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found matching your criteria</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-muted/25">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={(checked) => handleUserSelection(user.id, !!checked)}
                        />
                        
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          <div>
                            <p className="font-medium">{user.full_name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm">{user.phone || 'No phone'}</p>
                          </div>
                          
                          <div>
                            {getStatusBadge(user.status)}
                          </div>
                          
                          <div>
                            <div className="text-sm">
                              <span className={`font-medium ${(user.profile_completion_percentage || 0) >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                {user.profile_completion_percentage || 0}% complete
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-sm">
                            <div>Docs: {user.document_count || 0}</div>
                            <div>Contacts: {user.contact_count || 0}</div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBulkVerificationTools;