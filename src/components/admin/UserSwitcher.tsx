
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserSwitcherProps {
  trigger?: React.ReactNode;
  userId?: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  profile_picture_url: string | null;
}

const UserSwitcher: React.FC<UserSwitcherProps> = ({ 
  trigger, 
  userId 
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_picture_url')
        .eq('user_role', 'user')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const switchToUser = async (targetUserId: string) => {
    try {
      setLoading(true);
      
      // Get current admin ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in as an admin");
        return;
      }
      
      // Check if the target user exists
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, user_role')
        .eq('id', targetUserId)
        .single();
      
      if (userError || !userData) {
        toast.error("User not found");
        return;
      }
      
      // Ensure we're not switching to another admin account
      if (userData.user_role === 'admin') {
        toast.error("Cannot switch to another admin account");
        return;
      }
      
      // Create a new admin user session
      const { error: sessionError } = await supabase
        .from('admin_user_sessions')
        .insert({
          admin_id: user.id,
          user_id: targetUserId,
          started_at: new Date().toISOString()
        });
      
      if (sessionError) {
        console.error("Failed to create admin session:", sessionError);
        toast.error("Failed to create admin session");
        return;
      }
      
      toast.success(`Switched to user account: ${userData.full_name || "User"}`);
      setOpen(false);
      
      // Redirect to user dashboard with userView=true
      navigate('/dashboard?userView=true');
    } catch (error) {
      console.error("Error switching user:", error);
      toast.error("Failed to switch user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant={userId ? "default" : "outline"}
            className={userId ? "bg-yawatu-gold text-black hover:bg-yawatu-gold-dark" : ""}
          >
            {userId ? "View User" : "Switch to User Account"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Switch to User Account</DialogTitle>
          <DialogDescription>
            Select a user account to view the application from their perspective. This allows you to see what they see without affecting their data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="w-6 h-6 border-2 border-yawatu-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    onClick={() => switchToUser(user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {user.profile_picture_url ? (
                          <AvatarImage src={user.profile_picture_url} alt={user.full_name || ""} />
                        ) : (
                          <AvatarFallback>
                            {(user.full_name || "").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || "N/A"}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">Select</Button>
                  </div>
                ))
              ) : (
                <p className="text-center py-4 text-gray-500">No users found</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserSwitcher;
