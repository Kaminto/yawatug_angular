
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye } from 'lucide-react';

type UserStatus = 'active' | 'blocked' | 'unverified' | 'pending_verification';

// UPDATED: expect account_type and user_role
interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  account_type: string; // <-- the real one
  user_role: string;    // <-- admin/user
  status: UserStatus;
  created_at: string;
  profile_picture_url?: string;
  user_documents?: any[];
  gender?: string;
  date_of_birth?: string;
  address?: string;
  tin?: string;
  nationality?: string;
  country_of_residence?: string;
}

interface UserListItemProps {
  user: User;
  onViewUser: (user: User) => void;
  onUpdateStatus: (userId: string, status: UserStatus) => void;
}

const UserListItem = ({ user, onViewUser, onUpdateStatus }: UserListItemProps) => {
  const getStatusBadge = (status: UserStatus) => {
    const variants = {
      active: 'default',
      pending_verification: 'secondary',
      blocked: 'destructive',
      unverified: 'outline'
    } as const;

    const labels = {
      active: 'Verified',
      pending_verification: 'Pending',
      blocked: 'Blocked',
      unverified: 'Unverified'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3 sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <Avatar className="flex-shrink-0">
          <AvatarImage src={user.profile_picture_url} alt={user.full_name} />
          <AvatarFallback>
            {(user.full_name || 'U').substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{user.full_name || 'No Name'}</h4>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
            {getStatusBadge(user.status)}
            <Badge variant="outline" className="text-xs">{user.account_type || 'unknown'}</Badge>
            {user.user_role === 'admin' ? (
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">User</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {user.user_documents?.length || 0} docs
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewUser(user)}
          className="text-xs"
        >
          <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
          <span className="hidden sm:inline">View</span>
        </Button>
        
        <Select 
          value={user.status} 
          onValueChange={(value: UserStatus) => onUpdateStatus(user.id, value)}
        >
          <SelectTrigger className="w-24 sm:w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Verify</SelectItem>
            <SelectItem value="pending_verification">Pending</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            {user.status === 'blocked' ? (
              <SelectItem value="active">Unblock</SelectItem>
            ) : (
              <SelectItem value="blocked">Block</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default UserListItem;
