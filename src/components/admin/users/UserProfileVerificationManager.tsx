
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, User, UserCheck, UserX, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EnhancedVerificationReviewModal from './EnhancedVerificationReviewModal';

type UserStatus = 'active' | 'blocked' | 'unverified' | 'pending_verification';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  account_type: string;
  user_role: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  profile_picture_url?: string;
  profile_completion_percentage: number;
  user_documents?: any[];
  contact_persons?: any[];
}

const UserProfileVerificationManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadUsers();
    // Remove createMissingProfiles() call as it requires service role permissions
  }, [currentPage, debouncedSearchTerm, statusFilter]);

  // Reset page when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, searchTerm]);

  // Removed createMissingProfiles function as it requires service role permissions

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Loading users for verification...');
      
      // Build the query with filters
      let countQuery = supabase.from('profiles').select('*', { count: 'exact', head: true });
      let dataQuery = supabase
        .from('profiles')
        .select(`
          *,
          user_documents (*),
          contact_persons (*)
        `)
        .order('verification_submitted_at', { ascending: false, nullsFirst: false });
      
      // Apply search filter
      if (debouncedSearchTerm) {
        const searchFilter = `full_name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        countQuery = countQuery.eq('status', statusFilter as UserStatus);
        dataQuery = dataQuery.eq('status', statusFilter as UserStatus);
      }
      
      // Get total count with filters
      const { count: totalUsers, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(totalUsers || 0);
      
      // Get paginated data with filters
      const { data, error } = await dataQuery
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;
      console.log(`Loaded ${data?.length || 0} users (page ${currentPage} of ${Math.ceil((totalUsers || 0) / pageSize)}, total: ${totalUsers})`);
      
      // Calculate profile completion for each user
      const usersWithCompletion = data?.map(user => {
        const documents = user.user_documents || [];
        const contacts = user.contact_persons || [];
        
        // Calculate completion based on our new criteria
        const hasBasicInfo = !!(user.full_name && user.phone && user.date_of_birth && user.account_type);
        const hasProfilePicture = !!user.profile_picture_url;
        const hasTwoDocuments = documents.length >= 2;
        const hasContact = contacts.length >= 1;
        
        let completionPercentage = 0;
        if (hasBasicInfo) completionPercentage += 65; // 55 + 10 for account type
        if (hasProfilePicture) completionPercentage += 10;
        if (hasTwoDocuments) completionPercentage += 20;
        if (hasContact) completionPercentage += 5;
        
        return {
          ...user,
          profile_completion_percentage: Math.min(completionPercentage, 100),
          isAutoVerificationEligible: hasBasicInfo && hasProfilePicture && hasTwoDocuments && hasContact
        };
      }) || [];
      
      setUsers(usersWithCompletion);
      setFilteredUsers(usersWithCompletion); // Set filtered users to loaded users since filtering is now server-side
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: UserStatus, notes?: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status: newStatus,
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`User status updated to ${newStatus}`);
      loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleQuickApproval = async (userId: string) => {
    await updateUserStatus(userId, 'active', 'Quick approval by admin');
  };

  const handleQuickBlock = async (userId: string) => {
    await updateUserStatus(userId, 'blocked', 'Blocked by admin');
  };

  const handleAutoApproval = async () => {
    try {
      const eligibleUsers = filteredUsers.filter(user => 
        (user.status === 'pending_verification' || user.status === 'unverified') &&
        (user as any).isAutoVerificationEligible
      );

      if (eligibleUsers.length === 0) {
        toast.info('No users eligible for auto-approval');
        return;
      }

      for (const user of eligibleUsers) {
        await updateUserStatus(user.id, 'active', 'Auto-approved - met all verification criteria');
      }

      toast.success(`Auto-approved ${eligibleUsers.length} users`);
    } catch (error) {
      console.error('Error in auto approval:', error);
      toast.error('Failed to auto-approve users');
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending_verification: 'bg-yellow-100 text-yellow-800',
      unverified: 'bg-red-100 text-red-800',
      blocked: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Profile Verification</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleAutoApproval} 
            variant="outline"
            disabled={filteredUsers.filter(user => 
              (user.status === 'pending_verification' || user.status === 'unverified') &&
              (user as any).isAutoVerificationEligible
            ).length === 0}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Auto Approve Eligible ({filteredUsers.filter(user => 
              (user.status === 'pending_verification' || user.status === 'unverified') &&
              (user as any).isAutoVerificationEligible
            ).length})
          </Button>
          <Button onClick={loadUsers} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1); // Reset to first page when filtering
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_verification">Pending Verification</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({totalCount} total, showing {filteredUsers.length} on page {currentPage})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {user.profile_picture_url ? (
                        <img 
                          src={user.profile_picture_url} 
                          alt="Profile" 
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{user.full_name}</h4>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusBadge(user.status)}
                        <span className={`text-sm ${getCompletionColor(user.profile_completion_percentage || 0)}`}>
                          {user.profile_completion_percentage || 0}% Complete
                        </span>
                        <span className="text-xs text-gray-500">
                          Docs: {user.user_documents?.length || 0} | Contacts: {user.contact_persons?.length || 0}
                        </span>
                        {(user as any).isAutoVerificationEligible && (
                          <Badge variant="secondary" className="text-xs">
                            Auto-Verification Eligible
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowReviewModal(true);
                      }}
                    >
                      Review
                    </Button>
                    {user.status !== 'active' && (
                      <Button
                        size="sm"
                        onClick={() => handleQuickApproval(user.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    {user.status === 'blocked' ? (
                      <Button
                        size="sm"
                        onClick={() => handleQuickApproval(user.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Unblock
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleQuickBlock(user.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Block
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No users found</p>
            </div>
          )}

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
        </CardContent>
      </Card>

      {/* Enhanced Review Modal */}
      <EnhancedVerificationReviewModal
        user={selectedUser}
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedUser(null);
        }}
        onStatusUpdate={updateUserStatus}
        onRefresh={loadUsers}
      />
    </div>
  );
};

export default UserProfileVerificationManager;
