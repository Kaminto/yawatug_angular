import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
interface AdminUserToolbarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  onCreateUser: () => void;
}
const AdminUserToolbar: React.FC<AdminUserToolbarProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onCreateUser
}) => <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <div className="flex items-center gap-2 relative flex-1 sm:flex-initial">
        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3 sm:relative sm:left-0 sm:top-0" />
        <Input 
          placeholder="Search users..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="w-full sm:w-64 pl-10 sm:pl-3" 
        />
      </div>
      <select 
        value={statusFilter} 
        onChange={e => setStatusFilter(e.target.value)} 
        className="px-3 py-2 border rounded-md w-full sm:w-auto text-sm"
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="pending_verification">Pending</option>
        <option value="unverified">Unverified</option>
        <option value="blocked">Blocked</option>
      </select>
    </div>
  </div>;
export default AdminUserToolbar;