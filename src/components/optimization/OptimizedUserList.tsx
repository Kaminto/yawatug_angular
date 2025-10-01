import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  Eye, 
  MoreHorizontal,
  User,
  Shield,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface OptimizedUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  profile_picture_url?: string;
  status: string;
  profile_completion_percentage: number;
  account_type: string;
  user_role: string;
  created_at: string;
  last_login?: string;
  login_count: number;
  is_imported: boolean;
}

interface OptimizedUserListProps {
  viewMode?: 'compact' | 'detailed' | 'card';
  maxItems?: number;
  showFilters?: boolean;
  onUserSelect?: (user: OptimizedUser) => void;
  priorityFilter?: 'all' | 'pending_verification' | 'new_users' | 'imported';
}

const OptimizedUserList: React.FC<OptimizedUserListProps> = ({
  viewMode = 'compact',
  maxItems = 50,
  showFilters = true,
  onUserSelect,
  priorityFilter = 'all'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');

  // Use optimized view for better performance
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['optimized-users', priorityFilter, maxItems],
    queryFn: async () => {
      let query = supabase
        .from('user_profile_essentials')
        .select('*')
        .limit(maxItems);

      // Apply priority-based filtering
      switch (priorityFilter) {
        case 'pending_verification':
          query = query.eq('status', 'pending_verification');
          break;
        case 'new_users':
          query = query
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .eq('is_imported', false);
          break;
        case 'imported':
          query = query.eq('is_imported', true);
          break;
      }

      query = query.order(sortBy, { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as OptimizedUser[];
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000 // Auto-refresh every minute
  });

  // Client-side filtering for real-time search
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const handleUserClick = useCallback((user: OptimizedUser) => {
    onUserSelect?.(user);
  }, [onUserSelect]);

  if (isLoading) {
    return <UserListSkeleton viewMode={viewMode} count={10} />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 text-center">
          <p className="text-destructive">Failed to load users</p>
          <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
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
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Joined</SelectItem>
                  <SelectItem value="last_login">Last Login</SelectItem>
                  <SelectItem value="profile_completion_percentage">Profile Completion</SelectItem>
                  <SelectItem value="full_name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users?.length || 0} users
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'compact' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {/* setViewMode('compact') */}}
          >
            Compact
          </Button>
          <Button
            variant={viewMode === 'detailed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {/* setViewMode('detailed') */}}
          >
            Detailed
          </Button>
        </div>
      </div>

      {/* User List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredUsers.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                viewMode={viewMode}
                onClick={() => handleUserClick(user)}
              />
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Optimized UserListItem component
const UserListItem: React.FC<{
  user: OptimizedUser;
  viewMode: 'compact' | 'detailed' | 'card';
  onClick: () => void;
}> = ({ user, viewMode, onClick }) => {
  const getStatusBadge = (status: string) => {
    const variants = {
      'active': 'default',
      'pending_verification': 'secondary',
      'unverified': 'outline',
      'blocked': 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (viewMode === 'compact') {
    return (
      <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors" onClick={onClick}>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profile_picture_url} />
            <AvatarFallback>
              {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.full_name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(user.status)}
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium">{user.profile_completion_percentage}%</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 hover:bg-muted/50 cursor-pointer transition-colors" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.profile_picture_url} />
            <AvatarFallback>
              {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{user.full_name}</p>
              {user.user_role === 'admin' && <Shield className="h-4 w-4 text-primary" />}
              {user.is_imported && <Badge variant="outline" className="text-xs">Imported</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Account: {user.account_type}</span>
              <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
              {user.last_login && (
                <span>Last login: {new Date(user.last_login).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(user.status)}
          <div className="text-right">
            <div className="flex items-center gap-1">
              <div className="w-20 bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all" 
                  style={{ width: `${user.profile_completion_percentage}%` }}
                />
              </div>
              <span className="text-xs font-medium">{user.profile_completion_percentage}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Profile Complete</p>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Loading skeleton
const UserListSkeleton: React.FC<{ viewMode: string; count: number }> = ({ viewMode, count }) => (
  <div className="space-y-4">
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="p-4">
              {viewMode === 'compact' ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export default OptimizedUserList;