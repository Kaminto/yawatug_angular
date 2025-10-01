
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, XCircle, Clock, Users, UserCheck, AlertTriangle, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  account_type: string;
  status: string;
  profile_completion_percentage: number;
  created_at: string;
  updated_at: string;
  profile_picture_url?: string;
  user_documents?: any[];
  contact_persons?: any[];
}

const EnhancedAdminVerificationManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    eligible_auto_approve: 0,
    verified: 0
  });

  useEffect(() => {
    loadUsers();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('admin_user_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' }, 
        () => loadUsers()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_documents (*),
          contact_persons (*)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const usersWithStats = data.map(user => ({
        ...user,
        user_documents: user.user_documents || [],
        contact_persons: user.contact_persons || []
      }));

      setUsers(usersWithStats);
      calculateStats(usersWithStats);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (userList: User[]) => {
    const total = userList.length;
    const pending = userList.filter(u => u.status === 'pending_verification').length;
    const verified = userList.filter(u => u.status === 'active').length;
    const eligibleAutoApprove = userList.filter(u => 
      u.status === 'pending_verification' &&
      u.profile_completion_percentage >= 80 &&
      u.user_documents.length >= 2 &&
      u.contact_persons.length >= 1
    ).length;

    setStats({ total, pending, eligible_auto_approve: eligibleAutoApprove, verified });
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'eligible_auto_approve') {
        filtered = filtered.filter(u => 
          u.status === 'pending_verification' &&
          u.profile_completion_percentage >= 80 &&
          u.user_documents.length >= 2 &&
          u.contact_persons.length >= 1
        );
      } else {
        filtered = filtered.filter(user => user.status === statusFilter);
      }
    }

    setFilteredUsers(filtered);
  };

  const handleStatusUpdate = async (userId: string, newStatus: 'active' | 'blocked' | 'unverified' | 'pending_verification', reason?: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: newStatus,
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Log admin action
      await supabase
        .from('admin_verification_actions')
        .insert({
          user_id: userId,
          action_type: newStatus === 'active' ? 'approve' : 'reject',
          notes: reason,
          admin_id: (await supabase.auth.getUser()).data.user?.id
        });

      toast.success(`User ${newStatus === 'active' ? 'approved' : 'rejected'} successfully`);
      loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const bulkAutoApprove = async () => {
    const eligibleUsers = filteredUsers.filter(u => 
      u.status === 'pending_verification' &&
      u.profile_completion_percentage >= 80 &&
      u.user_documents.length >= 2 &&
      u.contact_persons.length >= 1
    );

    if (eligibleUsers.length === 0) {
      toast.info('No users eligible for auto-approval');
      return;
    }

    try {
      for (const user of eligibleUsers) {
        await handleStatusUpdate(user.id, 'active', 'Auto-approved based on profile completion criteria');
      }
      toast.success(`Auto-approved ${eligibleUsers.length} users`);
    } catch (error) {
      toast.error('Failed to auto-approve users');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { color: 'bg-green-100 text-green-800', label: 'Verified' },
      pending_verification: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      unverified: { color: 'bg-gray-100 text-gray-800', label: 'Unverified' },
      blocked: { color: 'bg-red-100 text-red-800', label: 'Blocked' }
    };

    const variant = variants[status as keyof typeof variants] || variants.unverified;
    
    return (
      <Badge className={variant.color}>
        {variant.label}
      </Badge>
    );
  };

  const isEligibleForAutoApproval = (user: User) => {
    return user.status === 'pending_verification' &&
           user.profile_completion_percentage >= 80 &&
           user.user_documents.length >= 2 &&
           user.contact_persons.length >= 1;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Auto-Approve Ready</p>
                <p className="text-2xl font-bold text-green-600">{stats.eligible_auto_approve}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-blue-600">{stats.verified}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>User Verification Management</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={bulkAutoApprove}
                disabled={stats.eligible_auto_approve === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Auto-Approve Eligible ({stats.eligible_auto_approve})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="pending_verification">Pending Review</SelectItem>
                <SelectItem value="eligible_auto_approve">Auto-Approve Ready</SelectItem>
                <SelectItem value="active">Verified</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User List */}
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  isEligibleForAutoApproval(user) ? 'border-green-300 bg-green-50' : ''
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <Avatar>
                    {user.profile_picture_url ? (
                      <AvatarImage src={user.profile_picture_url} alt={user.full_name} />
                    ) : (
                      <AvatarFallback>
                        {user.full_name?.substring(0, 2).toUpperCase() || 'UN'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{user.full_name || 'No Name'}</h4>
                      {isEligibleForAutoApproval(user) && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Auto-Approve Ready
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>Completion: {user.profile_completion_percentage}%</span>
                      <span>Documents: {user.user_documents?.length || 0}</span>
                      <span>Contacts: {user.contact_persons?.length || 0}</span>
                      <span>Type: {user.account_type}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {getStatusBadge(user.status)}
                    <p className="text-xs text-gray-500 mt-1">
                      Updated: {new Date(user.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  {user.status === 'pending_verification' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(user.id, 'active', 'Profile approved by admin')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusUpdate(user.id, 'blocked', 'Profile rejected by admin')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  {user.status === 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(user.id, 'blocked', 'Account blocked by admin')}
                    >
                      Block
                    </Button>
                  )}
                  
                  {user.status === 'blocked' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(user.id, 'active', 'Account unblocked by admin')}
                    >
                      Unblock
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No users found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAdminVerificationManager;
