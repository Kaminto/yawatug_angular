
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users, Filter, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_verified: boolean;
  profile_completion_percentage: number;
  created_at: string;
  status: string;
}

interface EnhancedRecipientSelectorProps {
  selectedUsers: string[];
  onSelectionChange: (users: string[]) => void;
  multiSelect?: boolean;
  showFilters?: boolean;
}

const EnhancedRecipientSelector: React.FC<EnhancedRecipientSelectorProps> = ({
  selectedUsers,
  onSelectionChange,
  multiSelect = true,
  showFilters = true
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    verified: false,
    unverified: false,
    minCompletion: 0,
    recentOnly: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 20;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, is_verified, profile_completion_percentage, created_at, status')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Error loading users:', error);
        toast.error('Failed to load users');
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.phone?.toLowerCase().includes(term)
      );
    }

    // Verification status filter
    if (filters.verified && !filters.unverified) {
      filtered = filtered.filter(user => user.is_verified);
    } else if (filters.unverified && !filters.verified) {
      filtered = filtered.filter(user => !user.is_verified);
    }

    // Profile completion filter
    if (filters.minCompletion > 0) {
      filtered = filtered.filter(user => 
        (user.profile_completion_percentage || 0) >= filters.minCompletion
      );
    }

    // Recent users filter (last 30 days)
    if (filters.recentOnly) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = filtered.filter(user => 
        new Date(user.created_at) >= thirtyDaysAgo
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const handleUserSelect = (userId: string) => {
    if (multiSelect) {
      if (selectedUsers.includes(userId)) {
        onSelectionChange(selectedUsers.filter(id => id !== userId));
      } else {
        onSelectionChange([...selectedUsers, userId]);
      }
    } else {
      onSelectionChange([userId]);
    }
  };

  const handleSelectAll = () => {
    const currentPageUsers = getCurrentPageUsers();
    const allSelected = currentPageUsers.every(user => selectedUsers.includes(user.id));
    
    if (allSelected) {
      // Deselect all on current page
      const remainingSelected = selectedUsers.filter(id => 
        !currentPageUsers.some(user => user.id === id)
      );
      onSelectionChange(remainingSelected);
    } else {
      // Select all on current page
      const newSelections = currentPageUsers
        .filter(user => !selectedUsers.includes(user.id))
        .map(user => user.id);
      onSelectionChange([...selectedUsers, ...newSelections]);
    }
  };

  const clearFilters = () => {
    setFilters({
      verified: false,
      unverified: false,
      minCompletion: 0,
      recentOnly: false
    });
    setSearchTerm('');
  };

  const getCurrentPageUsers = () => {
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-center">
          <Users className="h-8 w-8 mx-auto mb-2" />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Recipients ({selectedUsers.length} selected)
          </CardTitle>
          <Button onClick={loadUsers} variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verified"
                  checked={filters.verified}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, verified: !!checked }))}
                />
                <label htmlFor="verified" className="text-sm">Verified Users</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unverified"
                  checked={filters.unverified}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, unverified: !!checked }))}
                />
                <label htmlFor="unverified" className="text-sm">Unverified Users</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recent"
                  checked={filters.recentOnly}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, recentOnly: !!checked }))}
                />
                <label htmlFor="recent" className="text-sm">Recent Users (30 days)</label>
              </div>

              <div className="flex items-center space-x-2">
                <label htmlFor="completion" className="text-sm">Min Completion:</label>
                <Input
                  id="completion"
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minCompletion}
                  onChange={(e) => 
                    setFilters(prev => ({ ...prev, minCompletion: parseInt(e.target.value) || 0 }))}
                  className="w-20"
                />
                <span className="text-sm">%</span>
              </div>

              <Button onClick={clearFilters} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {getCurrentPageUsers().length} of {filteredUsers.length} users
          </span>
          {multiSelect && (
            <Button onClick={handleSelectAll} variant="outline" size="sm">
              {getCurrentPageUsers().every(user => selectedUsers.includes(user.id)) ? 'Deselect' : 'Select'} All on Page
            </Button>
          )}
        </div>

        {/* User List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {getCurrentPageUsers().map((user) => (
            <div
              key={user.id}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedUsers.includes(user.id) 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleUserSelect(user.id)}
            >
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => {}} // Handled by parent div click
                />
                <div>
                  <div className="font-medium">{user.full_name || 'Unknown'}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  {user.phone && (
                    <div className="text-xs text-muted-foreground">{user.phone}</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {user.is_verified ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary">Unverified</Badge>
                )}
                
                <Badge variant="outline">
                  {user.profile_completion_percentage || 0}% Complete
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        )}

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No users found matching your criteria</p>
            <Button onClick={clearFilters} variant="outline" size="sm" className="mt-2">
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedRecipientSelector;
