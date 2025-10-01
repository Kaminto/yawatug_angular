
import React from "react";
import UserListItem from "./UserListItem";
import { Button } from "@/components/ui/button";
import UserSwitcher from "@/components/admin/UserSwitcher";

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
  profile_picture_url?: string;
  nationality?: string;
  country_of_residence?: string;
  user_documents?: any[];
  gender?: string;
  date_of_birth?: string;
  address?: string;
  tin?: string;
}

interface AdminUserListProps {
  users: User[];
  onlyAdminVisible: boolean;
  handleViewUser: (user: User) => void;
  updateUserStatus: (userId: string, status: UserStatus) => void;
}

const AdminUserList: React.FC<AdminUserListProps> = ({
  users,
  onlyAdminVisible,
  handleViewUser,
  updateUserStatus,
}) => (
  <div className="space-y-3">
    {onlyAdminVisible && (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded mb-2">
        Only one user profile (your admin account) exists in the database.<br />
        Add more users to see the full list.
      </div>
    )}
    {users.map((user) => (
      <div key={user.id} className="border rounded-lg">
        <div className="flex items-center justify-between p-4">
          <UserListItem
            user={user}
            onViewUser={handleViewUser}
            onUpdateStatus={updateUserStatus}
          />
          {/* Only show switch button for non-admin users */}
          {user.user_role !== 'admin' && (
            <div className="ml-4 flex-shrink-0">
              <UserSwitcher
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Switch to User
                  </Button>
                }
                userId={user.id}
              />
            </div>
          )}
        </div>
      </div>
    ))}
    {users.length === 0 && (
      <div className="text-center text-gray-500 py-8">
        No users found matching your criteria.
      </div>
    )}
  </div>
);

export default AdminUserList;
