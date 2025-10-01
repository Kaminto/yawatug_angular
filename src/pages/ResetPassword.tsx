
import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PasswordStrengthChecker from "@/components/auth/PasswordStrengthChecker";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkResetToken = async () => {
      // Check URL parameters for reset tokens or activation
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      const isActivation = searchParams.get('activation') === 'true';
      const activationTokenRaw = searchParams.get('token');
      const activationToken = activationTokenRaw ? decodeURIComponent(activationTokenRaw) : null;
      const activationEmail = searchParams.get('email');

      console.log('🔧 Reset Password Debug Info:', {
        type, 
        isActivation,
        activationTokenPresent: !!activationToken,
        activationEmail: !!activationEmail,
        userId: searchParams.get('user_id'),
        fullUrl: window.location.href,
        tokenPreview: activationToken ? activationToken.substring(0, 10) + '...' : 'none'
      });

      // Handle activation flow
      if (isActivation && activationToken) {
        console.log('🔍 Validating activation token in reset-password via edge function...');
        
        // Validate the activation token using the edge function for consistent server-side logging
        const { data: result, error } = await supabase.functions.invoke('validate-activation-token', {
          body: { token: activationToken }
        });

        console.log('📊 Token validation result:', { result, error });

        if (error || !result?.success) {
          console.error('❌ Activation token validation failed:', error || result?.error);
          setIsValidToken(false);
          setIsCheckingToken(false);
          toast.error('Invalid or expired activation token');
          return;
        }

        console.log('✅ Activation token validated successfully for user:', result.user_id);
        setIsValidToken(true);
        setIsCheckingToken(false);
        toast.success("Set your password to complete account activation");
        return;
      }

      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Session error:', error);
            throw error;
          }

          console.log('Session set successfully:', data);
          setIsValidToken(true);
          toast.success("You can now set your new password");
        } catch (error: any) {
          console.error('Reset token error:', error);
          toast.error("Invalid or expired reset link");
          setIsValidToken(false);
        }
      } else {
        // Check if user is already authenticated (direct navigation)
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Current session:', session);
        
        if (session) {
          setIsValidToken(true);
        } else {
          toast.error("Invalid reset link. Please request a new password reset.");
          setIsValidToken(false);
        }
      }
      setIsCheckingToken(false);
    };

    checkResetToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const isActivation = searchParams.get('activation') === 'true';
      const activationTokenRaw = searchParams.get('token');
      const activationToken = activationTokenRaw ? decodeURIComponent(activationTokenRaw) : null;
      const activationEmail = searchParams.get('email');
      const userId = searchParams.get('user_id');

      if (isActivation && activationToken && activationEmail) {
        // Handle account activation
        try {
          console.log('🚀 Activating account with token and password...');
          
          const { data: activationResult, error } = await supabase.functions.invoke('handle-imported-user-auth', {
            body: {
              action: 'activate',
              email: activationEmail,
              password: newPassword,
              activation_token: activationToken
            }
          });

          console.log('📊 Activation result:', { activationResult, error });

          if (error) {
            console.error('❌ Activation error:', error);
            toast.error('Failed to activate account: ' + (error.message || 'Unknown error'));
            return;
          }

          if (!activationResult?.success) {
            console.error('❌ Activation failed:', activationResult);
            toast.error('Account activation failed. Please try again.');
            return;
          }

          console.log('✅ Account activated successfully! Attempting sign in...');

          // Automatically sign the user in with the new password
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: (activationEmail || '').toLowerCase().trim(),
            password: newPassword
          });

          if (signInError) {
            console.error('⚠️ Auto sign-in after activation failed:', signInError);
            toast.success('Account activated! Please login with your new password.');
            navigate('/login');
            return;
          }

          toast.success('Account activated and you are now logged in!');
          navigate('/dashboard');
          
        } catch (error: any) {
          console.error('❌ Unexpected activation error:', error);
          toast.error('Failed to activate account. Please try again.');
        }
      } else {
        // Handle regular password reset
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;

        toast.success("Password updated successfully!");
        
        // Sign out and redirect to login
        await supabase.auth.signOut();
        navigate("/login");
      }

    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black text-black dark:text-white">
        <Navbar />
        <main className="flex-grow pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-md mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-yawatu-gold/30 p-8 shadow-md text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yawatu-gold mx-auto mb-4"></div>
              <p>Verifying reset link...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black text-black dark:text-white">
        <Navbar />
        <main className="flex-grow pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-md mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-yawatu-gold/30 p-8 shadow-md text-center">
              <div className="text-center mb-6">
                <img src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png" alt="Yawatu Minerals & Mining Logo" className="h-14 mx-auto mb-4" />
                <h1 className="text-2xl font-bold gold-text mb-2">Invalid Reset Link</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
                <Link 
                  to="/forgot-password" 
                  className="inline-block bg-yawatu-gold text-black px-6 py-2 rounded hover:bg-yawatu-gold-dark transition-colors"
                >
                  Request New Reset Link
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black text-black dark:text-white">
      <Navbar />
      <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-yawatu-gold/30 p-8 shadow-md">
            <div className="text-center mb-6">
              <img src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png" alt="Yawatu Minerals & Mining Logo" className="h-14 mx-auto mb-2" />
              <h1 className="text-2xl font-bold gold-text">
                {searchParams.get('activation') === 'true' ? 'Complete Account Activation' : 'Set New Password'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {searchParams.get('activation') === 'true' 
                  ? 'Create a password to activate your account'
                  : 'Create a strong password for your account'
                }
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  className="bg-white/50 dark:bg-black/50 border-gray-300 dark:border-yawatu-gold/30 focus:border-yawatu-gold" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Enter your new password"
                />
              </div>

              {newPassword && (
                <PasswordStrengthChecker password={newPassword} />
              )}

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  className="bg-white/50 dark:bg-black/50 border-gray-300 dark:border-yawatu-gold/30 focus:border-yawatu-gold" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Confirm your new password"
                />
              </div>

              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}

              <Button 
                type="submit" 
                className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark"
                disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              >
                {isLoading 
                  ? (searchParams.get('activation') === 'true' ? "Activating Account..." : "Updating...")
                  : (searchParams.get('activation') === 'true' ? "Activate Account" : "Update Password")
                }
              </Button>

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Remember your password?{" "}
                <Link to="/login" className="text-yawatu-gold hover:underline">
                  Login here
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
