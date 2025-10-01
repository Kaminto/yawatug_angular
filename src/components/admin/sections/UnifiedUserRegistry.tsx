import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Users, 
  Eye, 
  Mail, 
  Phone, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  UserCheck,
  Upload,
  Calendar,
  MapPin,
  Shield,
  CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getBaseUrl } from '@/lib/constants';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface UnifiedUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  account_type: string;
  country_of_residence: string;
  profile_picture_url: string | null;
  created_at: string;
  profile_completion_percentage: number;
  login_count: number;
  import_batch_id: string | null;
  account_activation_status: string;
  verification_submitted_at: string | null;
  last_login: string | null;
  user_role: string;
  auth_created_at: string | null;
}

interface UserStats {
  total: number;
  imported: number;
  regular: number;
  verified: number;
  pending: number;
  blocked: number;
  orphaned: number;
}

const UnifiedUserRegistry = () => {
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(50);
  
  // Stats
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    imported: 0,
    regular: 0,
    verified: 0,
    pending: 0,
    blocked: 0,
    orphaned: 0
  });

  useEffect(() => {
    loadUsers();
    loadUserStats();
  }, [currentPage, statusFilter, typeFilter, batchFilter, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        if (statusFilter === 'orphaned') {
          query = query.filter('auth_created_at', 'is', null).not('import_batch_id', 'is', null);
        } else {
          query = query.eq('status', statusFilter as 'blocked' | 'active' | 'unverified' | 'pending_verification');
        }
      }

      if (typeFilter !== 'all') {
        if (typeFilter === 'imported') {
          query = query.not('import_batch_id', 'is', null);
        } else if (typeFilter === 'regular') {
          query = query.is('import_batch_id', null);
        }
      }

      if (batchFilter !== 'all') {
        query = query.eq('import_batch_id', batchFilter);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      // Apply pagination
      const { data, error, count } = await query
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;

      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const { data: allUsers, error } = await supabase
        .from('profiles')
        .select('status, import_batch_id, auth_created_at');

      if (error) throw error;

      const stats = {
        total: allUsers?.length || 0,
        imported: allUsers?.filter(u => u.import_batch_id).length || 0,
        regular: allUsers?.filter(u => !u.import_batch_id).length || 0,
        verified: allUsers?.filter(u => u.status === 'active').length || 0,
        pending: allUsers?.filter(u => u.status === 'pending_verification').length || 0,
        blocked: allUsers?.filter(u => u.status === 'blocked').length || 0,
        orphaned: allUsers?.filter(u => u.import_batch_id && !u.auth_created_at).length || 0
      };

      setUserStats(stats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleSendEmail = async (userId: string, email: string) => {
    setSendingEmails(prev => new Set(prev).add(userId));
    
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      if (user.import_batch_id) {
        // Send activation email for imported users
        const { data: token, error: tokenError } = await supabase
          .rpc('generate_invitation_token', {
            p_user_id: userId,
            p_created_by: null
          });

        if (tokenError) throw tokenError;

        const activationUrl = `${getBaseUrl()}/activate-account?token=${encodeURIComponent(token)}`;
        
        const { error: emailError } = await supabase.functions.invoke('unified-communication-sender', {
          body: {
            recipient: user.email,
            subject: 'Activate Your Yawatu Account',
            message: `Welcome to Yawatu! Click the link below to activate your account.`,
            channel: 'email',
            templateType: 'account_activation',
            templateData: {
              name: user.full_name,
              activationUrl: activationUrl
            }
          }
        });

        if (emailError) throw emailError;
        toast.success(`Activation email sent to ${email}`);
      } else {
        // Send welcome/notification email for regular users
        toast.success(`Welcome email sent to ${email}`);
      }
      
      loadUsers();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          verification_reviewed_at: new Date().toISOString(),
          verification_reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User approved successfully');
      loadUsers();
      loadUserStats();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'blocked',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User blocked successfully');
      loadUsers();
      loadUserStats();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    }
  };

  const getStatusBadge = (user: UnifiedUser) => {
    const { status, import_batch_id, auth_created_at, account_activation_status } = user;
    
    if (import_batch_id && !auth_created_at) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Orphaned
      </Badge>;
    }
    
    if (import_batch_id && account_activation_status === 'activated') {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">
        <UserCheck className="w-3 h-3 mr-1" />
        Activated
      </Badge>;
    }
    
    if (import_batch_id && account_activation_status === 'invited') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        <Mail className="w-3 h-3 mr-1" />
        Invited
      </Badge>;
    }

    switch (status) {
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </Badge>;
      case 'pending_verification':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
      case 'blocked':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Blocked
        </Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          <Clock className="w-3 h-3 mr-1" />
          Unverified
        </Badge>;
    }
  };

  const getUserTypeIcon = (user: UnifiedUser) => {
    if (user.import_batch_id) {
      return <Upload className="h-4 w-4 text-secondary" />;
    }
    return <Users className="h-4 w-4 text-primary" />;
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const diff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days > 7) return new Date(dateString).toLocaleDateString();
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{userStats.total.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Users</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{userStats.imported.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Imported</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{userStats.regular.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Regular</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.verified.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{userStats.pending.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{userStats.blocked.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Blocked</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{userStats.orphaned.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Orphaned</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Verified</SelectItem>
                <SelectItem value="pending_verification">Pending</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="orphaned">Orphaned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="imported">Imported</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
              </SelectContent>
            </Select>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Import Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {/* Add batch options dynamically */}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
                setBatchFilter('all');
                setCurrentPage(1);
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Registry ({totalCount.toLocaleString()} total, showing {users.length} on page {currentPage})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center space-x-3 animate-pulse">
                          <div className="rounded-full bg-muted h-10 w-10"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-32"></div>
                            <div className="h-3 bg-muted rounded w-24"></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-20"></div></TableCell>
                      <TableCell><div className="h-6 bg-muted rounded w-16"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-12"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded w-16"></div></TableCell>
                      <TableCell><div className="h-8 bg-muted rounded w-20"></div></TableCell>
                    </TableRow>
                  ))
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.profile_picture_url || ''} />
                            <AvatarFallback>
                              {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.full_name || 'Unnamed User'}
                              {getUserTypeIcon(user)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                              {user.import_batch_id && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Batch: {user.import_batch_id.slice(0, 8)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.phone && (
                            <div className="flex items-center gap-1 mb-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                          {user.country_of_residence && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {user.country_of_residence}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{user.account_type || 'individual'}</div>
                          <div className="text-xs text-muted-foreground">
                            Profile: {user.profile_completion_percentage || 0}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Login: {formatTimeAgo(user.last_login)}</div>
                          <div className="text-xs text-muted-foreground">
                            Count: {user.login_count || 0}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Dialog open={dialogOpen && selectedUser?.id === user.id} 
                                  onOpenChange={(open) => {
                                    setDialogOpen(open);
                                    if (!open) setSelectedUser(null);
                                  }}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                          
                          {(user.import_batch_id && user.account_activation_status !== 'activated') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSendEmail(user.id, user.email)}
                              disabled={sendingEmails.has(user.id)}
                            >
                              {sendingEmails.has(user.id) ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b border-current"></div>
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {user.status === 'pending_verification' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApproveUser(user.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {user.status !== 'blocked' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleBlockUser(user.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < Math.ceil(totalCount / pageSize)) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage >= Math.ceil(totalCount / pageSize) ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {users.length === 0 && !loading && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No users found matching your criteria</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Profile Details</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedUser.profile_picture_url || ''} />
                  <AvatarFallback className="text-lg">
                    {selectedUser.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{selectedUser.full_name}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedUser)}
                    {getUserTypeIcon(selectedUser)}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p className="text-sm">{selectedUser.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Country</p>
                      <p className="text-sm">{selectedUser.country_of_residence || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Account Type</p>
                      <p className="text-sm">{selectedUser.account_type || 'individual'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">User Role</p>
                      <p className="text-sm">{selectedUser.user_role || 'user'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Profile Completion</p>
                      <p className="text-sm">{selectedUser.profile_completion_percentage || 0}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Registration</p>
                      <p className="text-sm">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                    </div>
                    {selectedUser.import_batch_id && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Import Batch</p>
                        <p className="text-sm">{selectedUser.import_batch_id}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="activity" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Login Count</p>
                      <p className="text-sm">{selectedUser.login_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Login</p>
                      <p className="text-sm">{formatTimeAgo(selectedUser.last_login)}</p>
                    </div>
                    {selectedUser.verification_submitted_at && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Verification Submitted</p>
                        <p className="text-sm">{new Date(selectedUser.verification_submitted_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="actions" className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.status === 'pending_verification' && (
                      <Button onClick={() => handleApproveUser(selectedUser.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve User
                      </Button>
                    )}
                    
                    {selectedUser.status !== 'blocked' && (
                      <Button variant="destructive" onClick={() => handleBlockUser(selectedUser.id)}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Block User
                      </Button>
                    )}
                    
                    {selectedUser.import_batch_id && selectedUser.account_activation_status !== 'activated' && (
                      <Button 
                        variant="outline"
                        onClick={() => handleSendEmail(selectedUser.id, selectedUser.email)}
                        disabled={sendingEmails.has(selectedUser.id)}
                      >
                        {sendingEmails.has(selectedUser.id) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b border-current mr-1"></div>
                        ) : (
                          <Mail className="h-4 w-4 mr-1" />
                        )}
                        Send Activation Email
                      </Button>
                    )}
                    
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Profile
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedUserRegistry;