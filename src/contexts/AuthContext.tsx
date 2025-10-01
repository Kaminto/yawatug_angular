
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProfileCache } from '@/hooks/useProfileCache';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string, 
    password: string, 
    fullName?: string, 
    phone?: string, 
    referralCode?: string,
    registrationMethod?: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refreshSession: () => Promise<void>;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthContext = useAuth;

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  
  const { updateCache: updateProfileCache } = useProfileCache();

  // Create or update profile when user changes
  const createOrUpdateProfile = async (user: User, retryCount = 0) => {
    const maxRetries = 3;
    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
    
    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id, user_role, email')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!existingProfile) {
        // Profile creation is now handled by database trigger
        console.log('Profile will be created by database trigger for user:', user.id);
        
        // Process referral if referral code was provided during signup
        if (user.user_metadata?.referral_code) {
          try {
            const { error: referralError } = await supabase.rpc('process_signup_referral', {
              p_user_id: user.id,
              p_referral_code: user.user_metadata.referral_code
            });
            
            if (referralError) {
              console.error('Referral processing error:', referralError);
            } else {
              console.log('Referral processed successfully for user:', user.id);
            }
          } catch (error) {
            console.error('Error processing referral:', error);
          }
        }
        
        // Update profile cache with basic info
        updateProfileCache(user.id, {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          user_role: user.email === 'yawatu256@gmail.com' ? 'admin' : 'user',
          status: 'unverified'
        });
      } else {
        // Update existing profile with latest email if needed
        if (user.email !== existingProfile.email) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              email: user.email,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) {
            throw updateError;
          }
        }
        
        // Update profile cache
        updateProfileCache(user.id, {
          email: user.email || '',
        });
      }
    } catch (error: any) {
      console.error('Error in createOrUpdateProfile:', error);
      
      // Retry with exponential backoff for network errors
      if (retryCount < maxRetries && 
          (error.message?.includes('fetch') || error.message?.includes('network'))) {
        console.log(`Profile operation retry ${retryCount + 1}/${maxRetries} in ${delay}ms`);
        setTimeout(() => createOrUpdateProfile(user, retryCount + 1), delay);
        return;
      }
      
      // Don't show error toast for non-critical profile operations
      if (!error.message?.includes('already exists')) {
        console.error('Failed to create/update profile after retries:', error);
      }
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setIsEmailVerified(!!data.session.user.email_confirmed_at);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth event:', event, 'Session exists:', !!session);
        
        // Only synchronous state updates here
        setSession(session);
        setUser(session?.user ?? null);
        setIsEmailVerified(!!session?.user?.email_confirmed_at);
        
        // Defer profile operations with setTimeout to prevent deadlock
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(() => {
            if (mounted) {
              createOrUpdateProfile(session.user);
            }
          }, 0);
        }
        
        setLoading(false);
      }
    );

    // THEN get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsEmailVerified(!!session?.user?.email_confirmed_at);
          
          if (session?.user) {
            // Defer profile creation to prevent auth deadlock
            setTimeout(() => {
              if (mounted) {
                createOrUpdateProfile(session.user);
              }
            }, 0);
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateProfileCache]);

  const signIn = async (email: string, password: string) => {
    try {
      // SECURITY FIX: Input validation and sanitization
      if (!email || !password) {
        return { error: { message: 'Email and password are required' } };
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Please enter a valid email address' } };
      }

      // Password length validation
      if (password.length < 6) {
        return { error: { message: 'Password must be at least 6 characters long' } };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(), // Normalize email
        password,
      });

      if (error) {
        // SECURITY FIX: Don't expose detailed error information
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          toast.error('Please verify your email address before signing in.');
          return { error: { ...error, emailNotConfirmed: true } };
        }
        
        // Log failed login attempts for security monitoring
        console.warn('Failed login attempt:', {
          email: email.toLowerCase().trim(),
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        return { error: { message: 'Invalid email or password' } }; // Generic error message
      }

      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        toast.error('Please verify your email address before signing in.');
        return { error: { message: 'Email not confirmed', emailNotConfirmed: true } };
      }

      // Log successful login for security monitoring
      console.log('Successful login:', {
        userId: data.user?.id,
        email: email.toLowerCase().trim(),
        timestamp: new Date().toISOString()
      });

      return { error: null };
    } catch (error: any) {
      console.error('Login error:', error);
      return { error: { message: 'An unexpected error occurred. Please try again.' } };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName?: string, 
    phone?: string, 
    referralCode?: string,
    registrationMethod?: string
  ) => {
    try {
      // SECURITY FIX: Input validation and sanitization
      if (!email || !password) {
        return { error: { message: 'Email and password are required' } };
      }

      // For phone registration, allow temporary email format
      const isPhoneRegistration = registrationMethod === 'phone';
      if (!isPhoneRegistration) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return { error: { message: 'Please enter a valid email address' } };
        }
      }

      // Strong password validation
      if (password.length < 8) {
        return { error: { message: 'Password must be at least 8 characters long' } };
      }

      const passwordRequirements = [
        /[A-Z]/.test(password), // uppercase
        /[a-z]/.test(password), // lowercase  
        /\d/.test(password),     // number
        /[!@#$%^&*(),.?":{}|<>]/.test(password) // special char
      ];

      if (passwordRequirements.filter(Boolean).length < 3) {
        return { error: { 
          message: 'Password must contain at least 3 of: uppercase, lowercase, number, special character' 
        }};
      }

      // Validate full name if provided
      if (fullName && (fullName.length < 2 || fullName.length > 100)) {
        return { error: { message: 'Full name must be between 2 and 100 characters' } };
      }

      const redirectUrl = `${window.location.origin}/verify`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(), // Normalize email
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName?.trim(),
            phone: phone?.trim(),
            referral_code: referralCode?.trim(),
            registration_method: registrationMethod || 'email',
            account_type: 'individual'
          },
        },
      });

      if (!error && data.user && !data.session) {
        // User created but needs email verification
        toast.success('Registration successful! Please check your email for verification.');
        
        // Log successful registration for security monitoring
        console.log('Successful registration:', {
          userId: data.user.id,
          email: email.toLowerCase().trim(),
          timestamp: new Date().toISOString()
        });
      } else if (!error && data.session) {
        // User was auto-signed in (email confirmation disabled)
        toast.error('Please enable email confirmation in Supabase Authentication settings.');
      }

      return { error };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { error: { message: 'An unexpected error occurred. Please try again.' } };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsEmailVerified(false);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshSession,
    isEmailVerified,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
