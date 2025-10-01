import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus, 
  Upload, 
  Filter, 
  Search,
  Eye,
  MoreVertical,
  Calendar,
  Mail,
  Phone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  account_type: string;
  user_role: string;
  created_at: string;
  profile_picture_url?: string;
  nationality?: string;
  import_batch_id?: string;
  account_activation_status?: string;
  profile_completion_percentage?: number;
}

const UserRegistrationManager = () => {
  const [activeView, setActiveView] = useState('all');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [counts, setCounts] = useState({
    all: 0,
    organic: 0,
    imported: 0
  });
  const usersPerPage = 25;

  useEffect(() => {
    loadUsers();
  }, [activeView, searchQuery, statusFilter, typeFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Build query with server-side filtering
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply search filter on server-side
      if (searchQuery.trim()) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'active' | 'blocked' | 'pending_verification' | 'unverified');
      }

      // Apply type filter  
      if (typeFilter !== 'all') {
        query = query.eq('account_type', typeFilter);
      }

      // Apply view filter
      if (activeView === 'organic') {
        query = query.is('import_batch_id', null);
      } else if (activeView === 'imported') {
        query = query.not('import_batch_id', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      setFilteredUsers(data || []);
      setCurrentPage(1);
      
      // Load counts separately (only on initial load or view change)
      if (!searchQuery && statusFilter === 'all' && typeFilter === 'all') {
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
      // Get total count
      const { count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get organic count  
      const { count: organicCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('import_batch_id', null);

      // Get imported count
      const { count: importedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('import_batch_id', 'is', null);

      setCounts({
        all: totalCount || 0,
        organic: organicCount || 0,
        imported: importedCount || 0
      });
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'blocked' | 'pending_verification' | 'unverified') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User status updated to ${newStatus}`);
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending_verification: 'secondary',
      blocked: 'destructive',
      unverified: 'outline'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getActivationBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      activated: 'default',
      invited: 'secondary', 
      pending: 'outline'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">User Registration Manager</h3>
          <p className="text-sm text-muted-foreground">
            Unified view of all registered users with management controls
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="organic" className="flex items-center gap-2">
            Organic ({counts.organic})
          </TabsTrigger>
          <TabsTrigger value="imported" className="flex items-center gap-2">
            Imported ({counts.imported})
          </TabsTrigger>
        </TabsList>

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
              <SelectItem value="pending_verification">Pending Verification</SelectItem>
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
              <SelectItem value="corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <TabsContent value={activeView} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium">
                    {activeView === 'all' ? 'All registered users with management controls' : 
                     activeView === 'organic' ? 'Users who registered organically through the app' : 
                     'Users imported from external systems with activation controls'}
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
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      {activeView === 'imported' && <TableHead>Activation</TableHead>}
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers
                      .slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)
                      .map((user) => (
                      <TableRow key={user.id}>
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
                              <p className="text-xs text-muted-foreground">
                                {user.profile_completion_percentage ? `${user.profile_completion_percentage}% complete` : 'Profile incomplete'}
                              </p>
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
                        {activeView === 'imported' && (
                          <TableCell>
                            {user.account_activation_status && getActivationBadge(user.account_activation_status)}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(user.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(`/admin/users/${user.id}`, '_blank')}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              {user.status !== 'active' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'active')}>
                                  Activate User
                                </DropdownMenuItem>
                              )}
                              {user.status !== 'blocked' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'blocked')}>
                                  Block User
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    </div>
  );
};

export default UserRegistrationManager;