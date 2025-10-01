import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export const useAdminPermissions = () => {
  const { user } = useAuthContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminPermissions = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(profile?.user_role === 'admin');
        }
      } catch (error) {
        console.error('Error checking admin permissions:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminPermissions();
  }, [user]);

  return { isAdmin, loading };
};