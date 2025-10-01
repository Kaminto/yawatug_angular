
import { useState, useEffect, useContext } from 'react';
import { useAdminUser } from '@/contexts/AdminUserContext';
import { supabase } from '@/integrations/supabase/client';

export const useContextualData = () => {
  const { currentUser, originalAdmin } = useAdminUser();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserMode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if admin is viewing as another user
        if (currentUser?.id && currentUser.id !== user.id && originalAdmin) {
          setIsAdminMode(false); // Admin viewing as user
          setCurrentUserId(currentUser.id);
        } else if (originalAdmin) {
          setIsAdminMode(true); // Admin in admin mode
          setCurrentUserId(user.id);
        } else {
          setIsAdminMode(false); // Regular user
          setCurrentUserId(user.id);
        }

        // Get user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_role')
          .eq('id', user.id)
          .single();
        
        setUserRole(profile?.user_role || 'user');
      }
    };

    checkUserMode();
  }, [currentUser, originalAdmin]);

  return {
    isAdminMode,
    currentUserId,
    userRole,
    isAdmin: userRole === 'admin',
    effectiveUserId: currentUserId // The user whose data we're viewing
  };
};
