
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import PasswordStrengthChecker from './PasswordStrengthChecker';
import type { AccountType, UserStatus } from '@/types/profile';

type AuthMode = 'login' | 'register' | 'admin';

interface AuthFlowProps {
  mode?: AuthMode;
}

const AuthFlow: React.FC<AuthFlowProps> = ({ mode: initialMode = 'login' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(
    (searchParams.get('mode') as AuthMode) || initialMode
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'sms' | 'google' | null>(null);
  const [pendingUser, setPendingUser] = useState<any>(null);

  // Register form
  const [registerData, setRegisterData] = useState({
    fullName: '',
    email: '',
    phone: '',
    accountType: '' as AccountType | '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkAuth();
  }, [navigate]);

  const isPasswordStrong = (password: string) => {
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ];
    return checks.filter(Boolean).length >= 4;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, check if this is an imported user without auth account
      const { data: userStatus } = await supabase.functions.invoke('handle-imported-user-auth', {
        body: { email: loginData.email, action: 'check' }
      });

      console.log('User status check:', userStatus);

      if (userStatus?.exists && userStatus?.isImported && userStatus?.needsActivation) {
        // Generate activation token and show activation notice
        const { data: inviteResult } = await supabase.functions.invoke('handle-imported-user-auth', {
          body: { email: loginData.email, action: 'create_invitation' }
        });

        if (inviteResult?.success) {
          toast.info(
            `Account activation required. An activation link has been sent to ${loginData.email}. Please check your email and activate your account.`,
            { duration: 8000 }
          );
          navigate(`/activate-account?token=${encodeURIComponent(inviteResult.invitation_token)}`);
          return;
        }
      }

      // Proceed with normal login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (error) {
        // Check if this might be an imported user who needs activation
        if (error.message?.includes('Invalid login credentials') && userStatus?.exists && userStatus?.isImported) {
          toast.error(
            'Account not activated. Please check your email for activation instructions or contact support.',
            { duration: 8000 }
          );
          return;
        }
        toast.error(error.message);
        return;
      }

      if (data.user) {
        // Check if user has 2FA enabled
        const { data: twoFactorSettings } = await supabase
          .from('two_factor_auth')
          .select('sms_enabled, google_auth_enabled')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (twoFactorSettings?.sms_enabled || twoFactorSettings?.google_auth_enabled) {
          // Sign out the user and require 2FA verification
          await supabase.auth.signOut();
          setPendingUser(data.user);
          setRequires2FA(true);
          setTwoFactorMethod(twoFactorSettings.sms_enabled ? 'sms' : 'google');
          
          // Send SMS OTP if SMS 2FA is enabled
          if (twoFactorSettings.sms_enabled) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('phone')
              .eq('id', data.user.id)
              .single();

            if (profile?.phone) {
              const { error: smsError } = await supabase.functions.invoke('send-sms-otp', {
                body: {
                  phoneNumber: profile.phone,
                  purpose: 'two_factor_auth',
                  userId: data.user.id
                }
              });

              if (smsError) {
                console.error('Error sending SMS OTP:', smsError);
                toast.error('Failed to send SMS verification code');
                return;
              } else {
                toast.success('Verification code sent to your phone');
              }
            }
          } else {
            toast.info('Please enter your Google Authenticator code');
          }
          return;
        }

        // Check user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_role, status')
          .eq('id', data.user.id)
          .single();

        if (mode === 'admin' && profile?.user_role !== 'admin') {
          await supabase.auth.signOut();
          toast.error('Access denied. Admin credentials required.');
          return;
        }

        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (twoFactorMethod === 'sms') {
        // Verify SMS OTP
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', pendingUser.id)
          .single();

        if (!profile?.phone) {
          toast.error('Phone number not found');
          return;
        }

        const { data: verifyResult, error } = await supabase.functions.invoke('verify-sms-otp', {
          body: {
            phoneNumber: profile.phone,
            otp: twoFactorCode,
            purpose: 'two_factor_auth',
            userId: pendingUser.id
          }
        });

        if (error || !verifyResult?.verified) {
          toast.error('Invalid verification code');
          return;
        }
      } else if (twoFactorMethod === 'google') {
        // Verify Google Authenticator TOTP code
        if (!twoFactorCode || twoFactorCode.length !== 6) {
          toast.error('Please enter a valid 6-digit code');
          return;
        }

        const { data: totpResult, error: totpError } = await supabase.functions.invoke('verify-totp', {
          body: {
            userId: pendingUser.id,
            token: twoFactorCode
          }
        });

        if (totpError || !totpResult?.verified) {
          toast.error('Invalid Google Authenticator code');
          return;
        }
      }

      // 2FA verification successful - sign the user back in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (authError || !authData.user) {
        toast.error('Authentication failed after 2FA verification');
        return;
      }

      // Check user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role, status')
        .eq('id', authData.user.id)
        .single();

      if (mode === 'admin' && profile?.user_role !== 'admin') {
        await supabase.auth.signOut();
        toast.error('Access denied. Admin credentials required.');
        return;
      }

      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('2FA verification error:', error);
      toast.error(error.message || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  const cancel2FA = async () => {
    // Sign out the user since they haven't completed 2FA
    await supabase.auth.signOut();
    setRequires2FA(false);
    setPendingUser(null);
    setTwoFactorCode('');
    setTwoFactorMethod(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.fullName || !registerData.email || !registerData.phone || !registerData.accountType) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isPasswordStrong(registerData.password)) {
      toast.error('Password does not meet strength requirements');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?mode=login`,
          data: {
            full_name: registerData.fullName,
            phone: registerData.phone,
            account_type: registerData.accountType,
            referral_code: registerData.referralCode
          }
        }
      });

      if (error) {
        toast.error(error.message || 'Registration failed');
        return;
      }

      if (data.user) {
        // Profile will be created automatically by database trigger
        // Referral will be processed automatically by process_referral_signup trigger
        toast.success('Registration successful! Please check your email for verification.');
        setMode('login');
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-yawatu-gold">
              {mode === 'admin' ? 'Admin Access' : 'Welcome to YAWATU'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                {requires2FA ? (
                  <form onSubmit={handle2FAVerification} className="space-y-4">
                    <div className="text-center space-y-2">
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        {twoFactorMethod === 'sms' 
                          ? 'Enter the verification code sent to your phone'
                          : 'Enter the code from your Google Authenticator app'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="2fa-code">Verification Code</Label>
                      <Input
                        id="2fa-code"
                        type="text"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        required
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={cancel2FA}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" 
                        disabled={loading || twoFactorCode.length !== 6}
                      >
                        {loading ? 'Verifying...' : 'Verify'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          value={loginData.password}
                          onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    
                    <div className="text-center text-sm space-y-2 mt-4">
                      <div>
                        <Link to="/forgot-password" className="text-muted-foreground hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <div>
                        Don't have an account?{" "}
                        <Link to="/register-new" className="text-yawatu-gold hover:underline font-medium">
                          Register here
                        </Link>
                      </div>
                      <div>
                        Account imported but not activated?{" "}
                        <Link to="/request-activation" className="text-yawatu-gold hover:underline font-medium">
                          Request activation
                        </Link>
                      </div>
                    </div>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="register-name">Full Name *</Label>
                    <Input
                      id="register-name"
                      value={registerData.fullName}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="register-phone">Phone Number *</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      value={registerData.phone}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+256 700 000 000"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="register-account-type">Account Type *</Label>
                    <Select 
                      value={registerData.accountType} 
                      onValueChange={(value: AccountType) => setRegisterData(prev => ({ ...prev, accountType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="organisation">Organisation</SelectItem>
                        <SelectItem value="minor">Minor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="register-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      >
                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {registerData.password && (
                      <div className="mt-2">
                        <PasswordStrengthChecker password={registerData.password} />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="register-confirm-password">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="register-referral">Referral Code (Optional)</Label>
                    <Input
                      id="register-referral"
                      value={registerData.referralCode}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, referralCode: e.target.value }))}
                      placeholder="Enter referral code"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
                    disabled={loading || !isPasswordStrong(registerData.password)}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                  
                  <div className="text-center text-sm mt-4">
                    <div>
                      Already have an account?{" "}
                      <Link to="/auth" className="text-yawatu-gold hover:underline font-medium">
                        Sign in here
                      </Link>
                    </div>
                  </div>
                </form>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthFlow;
