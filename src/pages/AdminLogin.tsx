import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [authInitialized, setAuthInitialized] = useState(false); // new
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for Supabase auth to hydrate
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthInitialized(true);
      if (session && session.user) {
        // Only check user_role as 'admin'
        const { data, error } = await supabase
          .from('profiles')
          .select('user_role, is_first_login')
          .eq('id', session.user.id)
          .single();

        const isAdmin =
          (!error && data && data.user_role && data.user_role === 'admin');

        if (isAdmin) {
          if (data.is_first_login) {
            setIsFirstLogin(true);
          } else {
            toast.success("Already logged in as admin");
            navigate('/admin');
          }
        }
      }
    };

    initAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // SECURITY FIX: Input validation
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(), // Normalize email
        password
      });

      if (error) {
        // SECURITY FIX: Generic error message to prevent user enumeration
        console.warn('Failed admin login attempt:', {
          email: email.toLowerCase().trim(),
          error: error.message,
          timestamp: new Date().toISOString()
        });
        toast.error("Invalid email or password");
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Check if user has admin role (but don't auto-create admin profiles)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_role, is_first_login')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profileData) {
          // SECURITY FIX: Don't auto-create admin profiles - this is dangerous
          await supabase.auth.signOut();
          console.warn('Admin login attempt without existing profile:', {
            userId: data.user.id,
            email: email.toLowerCase().trim(),
            timestamp: new Date().toISOString()
          });
          toast.error("Admin account not found. Contact system administrator.");
          setIsLoading(false);
          return;
        }

        const isAdmin = profileData.user_role === 'admin';

        if (isAdmin) {
          console.log('Successful admin login:', {
            userId: data.user.id,
            email: email.toLowerCase().trim(),
            timestamp: new Date().toISOString()
          });
          
          toast.success("Admin login successful");

          if (profileData.is_first_login) {
            setIsFirstLogin(true);
          } else {
            navigate('/admin');
          }
        } else {
          await supabase.auth.signOut();
          console.warn('Non-admin attempted admin login:', {
            userId: data.user.id,
            email: email.toLowerCase().trim(),
            userRole: profileData.user_role,
            timestamp: new Date().toISOString()
          });
          toast.error("Access denied: Administrator privileges required");
        }
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Update the is_first_login status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ is_first_login: false })
          .eq('id', user.id);
        
        if (updateError) throw updateError;
      }

      toast.success("Password updated successfully");
      setIsFirstLogin(false);
      // Redirect to admin dashboard after password update
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  // Adjust UI to block rendering until authInitialized is true
  if (!authInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-yawatu-gold mx-auto"></div>
          <p className="mt-4 text-lg">Checking session...</p>
        </div>
      </div>
    );
  }

  if (isFirstLogin) {
    return (
      <div className="flex min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black text-black dark:text-white">
        <div className="m-auto w-full max-w-md p-8 bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-yawatu-gold/30 shadow-xl">
          <div className="text-center mb-8">
            <img src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png" alt="Yawatu Minerals & Mining Logo" className="h-14 mx-auto mb-2" />
            <h1 className="text-2xl font-bold gold-text">Change Password</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Please set a new password for your admin account</p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-white/50 dark:bg-black/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="bg-white/50 dark:bg-black/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Set New Password"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black text-black dark:text-white">
      <div className="m-auto w-full max-w-md p-8 bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-yawatu-gold/30 shadow-xl">
        <div className="text-center mb-8">
          <img src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png" alt="Yawatu Minerals & Mining Logo" className="h-14 mx-auto mb-2" />
          <h1 className="text-2xl font-bold gold-text">Admin Login</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Access the admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/50 dark:bg-black/50"
              placeholder="admin@example.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-yawatu-gold hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/50 dark:bg-black/50"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Regular user? <Link to="/login" className="text-yawatu-gold hover:underline">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
