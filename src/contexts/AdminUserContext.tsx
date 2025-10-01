import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminUserContextType {
  isAdminMode: boolean;
  toggleMode: () => void;
  currentUser: any;
  originalAdmin: any;
  switchToUser: (userId: string) => Promise<void>;
  switchBackToAdmin: () => void;
  loading: boolean;
}

const AdminUserContext = createContext<AdminUserContextType | undefined>(undefined);

export const AdminUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminMode, setIsAdminMode] = useState(false); // Default to false for regular users
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [originalAdmin, setOriginalAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeContext();
  }, []);

  const initializeContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile?.user_role === 'admin') {
        setOriginalAdmin({ ...profile, email: user.email });
        setCurrentUser({ ...profile, email: user.email });
        setIsAdminMode(true);
      } else {
        setCurrentUser({ ...profile, email: user.email });
        setIsAdminMode(false);
      }
    } catch (error) {
      console.error('Error initializing admin/user context:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    if (!originalAdmin) return;
    
    if (isAdminMode) {
      // Switch to user mode but keep admin privileges
      setIsAdminMode(false);
      toast.info('Switched to User View');
    } else {
      // Switch back to admin mode
      setIsAdminMode(true);
      setCurrentUser(originalAdmin);
      toast.info('Switched to Admin View');
    }
  };

  const switchToUser = async (userId: string) => {
    if (!originalAdmin) return;

    try {
      setLoading(true);
      
      const { data: targetUser, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !targetUser) {
        toast.error('User not found');
        return;
      }

      if (targetUser.user_role === 'admin') {
        toast.error('Cannot switch to another admin account');
        return;
      }

      // Create admin session record
      await supabase
        .from('admin_user_sessions')
        .insert({
          admin_id: originalAdmin.id,
          user_id: userId,
          started_at: new Date().toISOString()
        });

      setCurrentUser(targetUser);
      setIsAdminMode(false);
      toast.success(`Switched to user: ${targetUser.full_name || 'User'}`);
    } catch (error) {
      console.error('Error switching to user:', error);
      toast.error('Failed to switch user');
    } finally {
      setLoading(false);
    }
  };

  const switchBackToAdmin = () => {
    if (!originalAdmin) return;
    
    setCurrentUser(originalAdmin);
    setIsAdminMode(true);
    toast.info('Switched back to Admin View');
  };

  return (
    <AdminUserContext.Provider value={{
      isAdminMode,
      toggleMode,
      currentUser,
      originalAdmin,
      switchToUser,
      switchBackToAdmin,
      loading
    }}>
      {children}
    </AdminUserContext.Provider>
  );
};

export const useAdminUser = () => {
  const context = useContext(AdminUserContext);
  if (!context) {
    throw new Error('useAdminUser must be used within AdminUserProvider');
  }
  return context;
};
