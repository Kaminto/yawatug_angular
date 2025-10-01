import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AdminGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  showError?: boolean;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ 
  children, 
  redirectTo = '/dashboard',
  showError = true 
}) => {
  const { user, loading: authLoading } = useAuthContext();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAdminStatus = async () => {
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
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          if (showError) {
            toast.error('Failed to verify admin permissions');
          }
        } else {
          const adminStatus = profile?.user_role === 'admin';
          setIsAdmin(adminStatus);
          
          if (!adminStatus && showError) {
            toast.error('Access denied: Administrator privileges required');
          }
        }
      } catch (error) {
        console.error('Admin check error:', error);
        setIsAdmin(false);
        if (showError) {
          toast.error('Authentication error');
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading, showError]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yawatu-gold"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (isAdmin === false) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;