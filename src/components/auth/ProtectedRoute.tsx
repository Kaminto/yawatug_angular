
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requireEmailVerification?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  adminOnly = false,
  requireEmailVerification = true 
}) => {
  const { user, session, loading, isEmailVerified } = useAuthContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user || !session) {
        setCheckingPermissions(false);
        return;
      }

      try {
        if (adminOnly) {
          const { data } = await supabase
            .from('profiles')
            .select('user_role')
            .eq('id', user.id)
            .single();
          
          setIsAdmin(data?.user_role === 'admin');
        }
      } catch (error) {
        console.error("Permission check failed:", error);
        setIsAdmin(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, [user, session, adminOnly]);

  // Show loading spinner while checking auth state
  if (loading || checkingPermissions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-yawatu-gold border-t-transparent"></div>
            <p className="mt-4 text-sm text-gray-600">
              {loading ? 'Checking authentication...' : 'Verifying permissions...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check email verification requirement
  if (requireEmailVerification && !isEmailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="mb-4 text-yellow-600">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold">Email Verification Required</h2>
            <p className="mb-4 text-sm text-gray-600">
              Please verify your email address to access this feature. Check your inbox for a verification link.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="rounded bg-yawatu-gold px-4 py-2 text-sm font-medium text-black hover:bg-yawatu-gold/90"
            >
              Back to Login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check admin permissions
  if (adminOnly && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="mb-4 text-red-600">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold">Access Denied</h2>
            <p className="mb-4 text-sm text-gray-600">
              You don't have permission to access this page. Administrator privileges required.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="rounded bg-yawatu-gold px-4 py-2 text-sm font-medium text-black hover:bg-yawatu-gold/90"
            >
              Go to Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
