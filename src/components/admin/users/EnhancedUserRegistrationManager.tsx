import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Users, 
  UserPlus, 
  Search,
  Eye,
  MoreVertical,
  Calendar,
  Mail,
  Phone,
  Settings,
  Shield,
  Ban,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  UserCog,
  Filter,
  RefreshCw,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import CreateUserModal from './CreateUserModal';
import UserSwitcher from '@/components/admin/UserSwitcher';
import EnhancedUserDetailsModal from './EnhancedUserDetailsModal';

type UserStatus = 'active' | 'blocked' | 'unverified' | 'pending_verification';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: UserStatus;
  account_type: string;
  user_role: string;
  created_at: string;
  profile_picture_url?: string;
  nationality?: string;
  import_batch_id?: string;
  account_activation_status?: string;
  profile_completion_percentage?: number;
  last_login?: string;
  login_count?: number;
  user_type: string;
  is_verified?: boolean;
}

const EnhancedUserRegistrationManager = () => {
  const [activeView, setActiveView] = useState('all');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [counts, setCounts] = useState({
    all: 0,
    organic: 0,
    imported: 0,
    active: 0,
    pending: 0,
    blocked: 0
  });
  const usersPerPage = 25;

  useEffect(() => {
    loadUsers();
  }, [activeView, searchQuery, statusFilter, typeFilter, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as UserStatus);
      }

      if (typeFilter !== 'all') {
        query = query.eq('account_type', typeFilter);
      }

      if (roleFilter !== 'all') {
        query = query.eq('user_role', roleFilter);
      }

      if (activeView === 'organic') {
        query = query.is('import_batch_id', null);
      } else if (activeView === 'imported') {
        query = query.not('import_batch_id', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      setFilteredUsers(data || []);
      setCurrentPage(1);
      setSelectedUsers([]);
      
      if (!searchQuery && statusFilter === 'all' && typeFilter === 'all' && roleFilter === 'all') {
        await loadCounts();
      }
      
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const queries = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).is('import_batch_id', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).not('import_batch_id', 'is', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending_verification'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'blocked')
      ]);

      setCounts({
        all: queries[0].count || 0,
        organic: queries[1].count || 0,
        imported: queries[2].count || 0,
        active: queries[3].count || 0,
        pending: queries[4].count || 0,
        blocked: queries[5].count || 0
      });
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const handleBulkStatusChange = async (newStatus: UserStatus) => {
    if (selectedUsers.length === 0) return;
    
    setBulkLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .in('id', selectedUsers);

      if (error) throw error;

      toast.success(`Updated ${selectedUsers.length} users to ${newStatus}`);
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      console.error('Error updating users:', error);
      toast.error('Failed to update users');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    
    setBulkLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', selectedUsers);

      if (error) throw error;

      toast.success(`Deleted ${selectedUsers.length} users`);
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      console.error('Error deleting users:', error);
      toast.error('Failed to delete users');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkActivation = async () => {
    if (selectedUsers.length === 0) return;
    
    setBulkLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Get full user details for selected users
      const { data: selectedUserData, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', selectedUsers);

      if (fetchError) throw fetchError;

      // Filter for imported users that need activation
      const usersToActivate = selectedUserData?.filter(u => 
        u.import_batch_id && 
        u.email &&
        (!u.account_activation_status || u.account_activation_status === 'pending')
      ) || [];

      if (usersToActivate.length === 0) {
        toast.error('No eligible users for activation. Users must be imported and have an email.');
        setBulkLoading(false);
        return;
      }

      toast.info(`Sending activation emails to ${usersToActivate.length} users...`);

      for (const user of usersToActivate) {
        try {
          // Generate invitation token
          const { data: tokenData, error: tokenError } = await supabase
            .rpc('generate_invitation_token', {
              p_user_id: user.id
            });

          if (tokenError) {
            console.error(`Token generation failed for ${user.email}:`, tokenError);
            failCount++;
            continue;
          }

          const activationUrl = `${window.location.origin}/activate?token=${tokenData}`;

          // Send activation email
          const { error: emailError } = await supabase.functions.invoke('unified-communication-sender', {
            body: {
              recipient: user.email,
              recipient_name: user.full_name || 'User',
              communication_type: 'activation_email',
              channels: ['email'],
              email_data: {
                subject: 'Activate Your Yawatu Account',
                activation_url: activationUrl,
                user_name: user.full_name || 'User'
              }
            }
          });

          if (emailError) {
            console.error(`Email send failed for ${user.email}:`, emailError);
            failCount++;
          } else {
            // Update activation status
            await supabase
              .from('profiles')
              .update({ account_activation_status: 'invited' })
              .eq('id', user.id);
            
            successCount++;
          }

        } catch (error) {
          console.error(`Failed to activate user ${user.email}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} activation emails`);
      }
      if (failCount > 0) {
        toast.error(`Failed to send ${failCount} activation emails`);
      }

      setSelectedUsers([]);
      loadUsers();

    } catch (error) {
      console.error('Error in bulk activation:', error);
      toast.error('Failed to process bulk activation');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User status updated to ${newStatus}`);
      loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User role updated to ${newRole}`);
      loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleViewUserProfile = async (user: User) => {
    console.log('🔍 Attempting to view user profile:', user);
    try {
      // Load user with documents
      const { data: userWithDocs, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_documents (*),
          contact_persons (*)
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error fetching user details:', error);
        throw error;
      }

      console.log('✅ User details loaded:', userWithDocs);
      console.log('🔄 Setting modal states - user:', userWithDocs, 'show modal: true');
      
      setSelectedUserForDetails(userWithDocs);
      setShowUserDetailsModal(true);
      
      console.log('✅ Modal states set successfully');
    } catch (error) {
      console.error('❌ Error loading user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Status', 'Type', 'Role', 'Registered', 'Last Login'].join(','),
      ...filteredUsers.map(user => [
        user.full_name || '',
        user.email || '',
        user.phone || '',
        user.status || '',
        user.account_type || '',
        user.user_role || '',
        new Date(user.created_at).toLocaleDateString(),
        user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${activeView}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: UserStatus) => {
    const variants: Record<string, any> = {
      active: { variant: 'default', icon: CheckCircle },
      pending_verification: { variant: 'secondary', icon: Clock },
      blocked: { variant: 'destructive', icon: Ban },
      unverified: { variant: 'outline', icon: AlertTriangle }
    };
    
    const config = variants[status] || { variant: 'outline', icon: AlertTriangle };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="flex items-center gap-1">
        <Shield className="h-3 w-3" />
        {role}
      </Badge>
    );
  };

  const isAllSelected = filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length;
  const isIndeterminate = selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.all}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{counts.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{counts.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{counts.blocked}</p>
                <p className="text-sm text-muted-foreground">Blocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Enhanced User Management</h3>
          <p className="text-sm text-muted-foreground">
            Advanced controls for user registration and management
          </p>
        </div>
      </div>

      {/* Enhanced Toolbar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            {/* Main Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Create User
                </Button>
                <Button variant="outline" onClick={loadUsers} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" onClick={exportUsers} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
              
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedUsers.length} selected
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={bulkLoading}>
                        Bulk Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('active')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Set Status: Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('blocked')}>
                        <Ban className="h-4 w-4 mr-2" />
                        Set Status: Blocked
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('pending_verification')}>
                        <Clock className="h-4 w-4 mr-2" />
                        Set Status: Pending
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Activation Emails
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Send Activation Emails</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will send activation emails to all selected imported users who have email addresses and are pending activation. Each user will receive a unique activation link valid for 30 days.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkActivation}>
                              Send Emails
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {selectedUsers.length} users?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the selected users and their data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_verification">Pending</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="organisation">Organisation</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="organic">Organic ({counts.organic})</TabsTrigger>
          <TabsTrigger value="imported">Imported ({counts.imported})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeView} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium">
                    {activeView === 'all' ? 'All registered users' : 
                     activeView === 'organic' ? 'Organically registered users' : 
                     'Imported users with activation controls'}
                  </h4>
                </div>
                <Badge variant="outline">{filteredUsers.length} users</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(filteredUsers.map(u => u.id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers
                      .slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)
                      .map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers([...selectedUsers, user.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {user.profile_picture_url ? (
                                <AvatarImage src={user.profile_picture_url} alt={user.full_name || ""} />
                              ) : (
                                <AvatarFallback className="text-xs">
                                  {(user.full_name || "").substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user.full_name || 'No Name'}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">
                                  {user.profile_completion_percentage ? `${user.profile_completion_percentage}% complete` : 'Incomplete'}
                                </p>
                                {user.is_verified && (
                                  <Badge variant="outline" className="text-xs">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {user.account_type || 'Not set'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.user_role || 'user')}</TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                            <div>
                              Logins: {user.login_count || 0}
                            </div>
                            {user.last_login && (
                              <div>
                                Last: {new Date(user.last_login).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserSwitcher userId={user.id} />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewUserProfile(user)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open('/admin/settings', '_blank')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Audit Log
                              </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.status !== 'active' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'active')}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Activate User
                                  </DropdownMenuItem>
                                )}
                                {user.status !== 'blocked' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'blocked')}>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Block User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {user.user_role !== 'admin' && (
                                  <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')}>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Make Admin
                                  </DropdownMenuItem>
                                )}
                                {user.user_role === 'admin' && (
                                  <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'user')}>
                                    <UserCog className="h-4 w-4 mr-2" />
                                    Remove Admin
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {filteredUsers.length > usersPerPage && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {Math.ceil(filteredUsers.length / usersPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(Math.ceil(filteredUsers.length / usersPerPage), currentPage + 1))}
                      disabled={currentPage === Math.ceil(filteredUsers.length / usersPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateUserModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserCreated={loadUsers}
      />

      <EnhancedUserDetailsModal
        user={selectedUserForDetails}
        isOpen={showUserDetailsModal}
        onClose={() => {
          setShowUserDetailsModal(false);
          setSelectedUserForDetails(null);
        }}
        onUserUpdated={() => {
          console.log('Refreshing user list after profile update...');
          loadUsers();
        }}
      />
    </div>
  );
};

export default EnhancedUserRegistrationManager;