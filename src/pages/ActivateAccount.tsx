import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ActivateAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // URL decode the token to handle special characters that were encoded
  const rawToken = searchParams.get('token');
  const token = rawToken ? decodeURIComponent(rawToken) : null;

  useEffect(() => {
    if (!token) {
      toast.error('Invalid activation link');
      navigate('/login');
      return;
    }

    validateToken();
  }, [token, navigate]);

  const validateToken = async () => {
    try {
      setValidatingToken(true);
      console.log('🔍 Starting token validation for:', token?.substring(0, 10) + '...');

      // Use the new edge function for better server-side logging
      const { data: result, error } = await supabase.functions.invoke('validate-activation-token', {
        body: { token }
      });

      console.log('🔍 Edge function result:', result);
      console.log('🔍 Edge function error:', error);

      if (error) {
        console.error('❌ Edge function error:', error);
        toast.error('Error validating activation token');
        setTokenValid(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      if (!result || !result.success) {
        console.error('❌ Token validation failed:', result?.error);
        toast.error(result?.error || 'Invalid or expired activation token');
        setTokenValid(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      console.log('✅ Token validated successfully for user:', result?.profile?.full_name || result?.full_name || 'User');
      
      // Check if already activated (only when profile is present)
      if (result?.profile && result.profile.activation_status === 'activated') {
        console.log('ℹ️ Account already activated, redirecting to login');
        toast.success('Account already activated. Please login.');
        navigate('/login');
        return;
      }

      console.log('✅ All validation passed, redirecting to password setup');
      setUserProfile(result.profile ?? null);
      setTokenValid(true);

      // Redirect to password setup with activation data
      const emailForReset = (result?.profile?.email || result?.email || '').toString();
      navigate(`/reset-password?activation=true&token=${encodeURIComponent(token!)}&email=${encodeURIComponent(emailForReset)}`);

    } catch (error: any) {
      console.error('💥 Unexpected error during validation:', error);
      toast.error('An unexpected error occurred');
      setTokenValid(false);
      setTimeout(() => navigate('/login'), 2000);
    } finally {
      setValidatingToken(false);
    }
  };


  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yawatu-gold mx-auto mb-4"></div>
              <p>Validating activation token...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <img src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png" alt="Yawatu Minerals & Mining Logo" className="h-14 mx-auto mb-4" />
              <p className="text-destructive mb-4">Invalid or expired activation token</p>
              <Button onClick={() => navigate('/login')}>
                Return to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we reach here, the token was valid and we redirected to reset-password
  // This should not render, but just in case:
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yawatu-gold mx-auto mb-4"></div>
            <p>Redirecting to password setup...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivateAccount;