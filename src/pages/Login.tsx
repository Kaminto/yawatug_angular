import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSMSOTP } from "@/hooks/useSMSOTP";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [phoneUser, setPhoneUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false); // for resend logic
  const [showVerifyNotice, setShowVerifyNotice] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const navigate = useNavigate();

  const {
    sendOTP,
    verifyOTP,
    isLoading: otpLoading,
    isVerifying,
    otpSent,
    verified,
    error: otpError,
    countdown,
    canResend,
    formatCountdown,
    reset: resetOTP
  } = useSMSOTP({
    onVerified: () => {
      handlePhoneLoginSuccess();
    },
    onError: (error) => {
      toast.error(error);
    }
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };

    checkAuthState();
  }, [navigate]);

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const redirectURL = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: redirectURL
        }
      });
      if (error) {
        toast.error(error.message || "Failed to resend verification email");
      } else {
        toast.success("Verification email resent! Please check your inbox.");
      }
    } catch (err) {
      toast.error("Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowVerifyNotice(false);

    try {
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) {
        // Check if this is an imported user who hasn't activated their account
        if (error.message?.toLowerCase().includes("invalid login credentials")) {
          // Check if this user exists as an imported profile
          const { data: checkResult, error: checkError } = await supabase.functions.invoke('handle-imported-user-auth', {
            body: {
              action: 'check',
              email: email
            }
          });

          if (!checkError && checkResult?.exists && checkResult?.isImported && !checkResult?.hasAuthAccount) {
            toast.error("Your account needs to be activated. Please check your email for an activation link or use the forgot password option.");
            setIsLoading(false);
            return;
          }
        }

        // detect "Email not confirmed"
        if (
          error.message?.toLowerCase().includes("email not confirmed") ||
          error.message?.toLowerCase().includes("confirm your email") ||
          error.message?.toLowerCase().includes("email is not confirmed")
        ) {
          setShowVerifyNotice(true);
          // Instead of just toasting, redirect to /verify-email for the new flow
          navigate(`/verify-email?email=${encodeURIComponent(email)}`);
          setIsLoading(false);
          return;
        } else {
          toast.error(error.message || "Failed to log in");
        }
        setIsLoading(false);
        return;
      }

      // Check if this is the first login for the admin (yawatu256@gmail.com)
      if (email === "yawatu256@gmail.com") {
        const { data: userData } = await supabase.auth.getUser();
        
        // Check if the user is an admin and if they need to change password
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_role')
          .eq('id', userData.user?.id)
          .single();

        if (profileData?.user_role === 'admin') {
          setIsFirstLogin(true);
          toast.success("Please change your password for security reasons.");
          navigate("/reset-password");
          return;
        }
      }

      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Phone login attempt with:', phone);
      
      // First, let's debug what phone numbers exist in the database
      console.log('=== DEBUGGING: Fetching all phone numbers from profiles ===');
      const { data: allPhones, error: debugError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone')
        .not('phone', 'is', null)
        .limit(20);
      
      if (debugError) {
        console.error('Error fetching phone numbers for debug:', debugError);
      } else {
        console.log('All phone numbers in database:', allPhones?.map(p => ({ 
          email: p.email, 
          phone: p.phone, 
          phoneLength: p.phone?.length,
          startsWithPlus: p.phone?.startsWith('+'),
          startsWithZero: p.phone?.startsWith('0'),
          startsWithTwoFiveSix: p.phone?.startsWith('256')
        })));
      }
      
      // Clean and normalize the phone number
      let cleanPhone = phone.replace(/\D/g, ''); // Remove all non-digits
      console.log('Cleaned phone:', cleanPhone);
      
      // Try different phone number formats for lookup
      const phoneFormats = [];
      
      // Original format as entered
      phoneFormats.push(phone.trim());
      
      // Cleaned format (digits only)
      phoneFormats.push(cleanPhone);
      
      // If starts with 0, replace with 256
      if (cleanPhone.startsWith('0')) {
        phoneFormats.push('256' + cleanPhone.substring(1));
        phoneFormats.push('+256' + cleanPhone.substring(1));
      }
      
      // If doesn't start with 256, add it
      if (!cleanPhone.startsWith('256')) {
        phoneFormats.push('256' + cleanPhone);
        phoneFormats.push('+256' + cleanPhone);
      }
      
      // Add format with +256 prefix for international format
      if (!phone.startsWith('+')) {
        const withoutLeadingZero = cleanPhone.replace(/^0/, '');
        const withoutTwoFiveSix = cleanPhone.replace(/^256/, '');
        phoneFormats.push('+256' + withoutLeadingZero);
        phoneFormats.push('+256' + withoutTwoFiveSix);
      }
      
      // Remove duplicates and empty strings
      const uniqueFormats = [...new Set(phoneFormats.filter(f => f && f.length > 0))];
      console.log('Trying unique phone formats:', uniqueFormats);
      
      let userData = null;
      let lastError = null;
      
      // Try each format until we find a match
      for (const phoneFormat of uniqueFormats) {
        try {
          console.log('Searching for phone format:', phoneFormat);
          
          const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, phone, status, account_type')
            .eq('phone', phoneFormat)
            .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data found

          if (error) {
            console.log('Query error for format', phoneFormat, ':', error);
            lastError = error;
            continue;
          }
          
          if (data) {
            console.log('✅ Found user with phone format:', phoneFormat, 'User data:', data);
            userData = data;
            break;
          } else {
            console.log('❌ No user found with format:', phoneFormat);
          }
        } catch (formatError) {
          console.log('Exception trying format', phoneFormat, ':', formatError);
          lastError = formatError;
        }
      }

      if (!userData) {
        console.log('❌ FINAL RESULT: No user found with any phone format.');
        console.log('Last error:', lastError);
        console.log('Tried formats:', uniqueFormats);
        throw new Error("No account found with this phone number. Please check the number format or contact support. Tried formats: " + uniqueFormats.join(', '));
      }

      if (userData.status !== 'active') {
        console.log('❌ User found but account not active:', userData.status);
        throw new Error("Your account is not active. Please contact support.");
      }

      console.log('✅ SUCCESS: Found active user:', userData);
      
      // Store user data for later use
      setPhoneUser(userData);

      // Format phone number for SMS (always use 256 format for SMS)
      let formattedPhone = cleanPhone;
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '256' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('256')) {
        formattedPhone = '256' + formattedPhone;
      }
      
      console.log('Sending SMS to formatted phone:', formattedPhone);

      // Send OTP
      const success = await sendOTP({
        phoneNumber: formattedPhone,
        purpose: 'verification',
        userId: userData.id
      });

      if (success) {
        setShowOtpInput(true);
        toast.success('OTP sent to ' + phone);
      }
    } catch (error: any) {
      console.error('❌ Phone login error:', error);
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    if (!phoneUser) {
      toast.error("User data not found. Please try again.");
      setShowOtpInput(false);
      return;
    }

    // Format phone number for verification
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '256' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('256')) {
      formattedPhone = '256' + formattedPhone;
    }

    await verifyOTP({
      phoneNumber: formattedPhone,
      otp: otpCode,
      purpose: 'verification',
      userId: phoneUser.id
    });
  };

  const handlePhoneLoginSuccess = async () => {
    try {
      if (!phoneUser?.email) {
        toast.error("User email not found");
        return;
      }

      // For phone login, we need to create a session somehow
      // Since Supabase requires email/password, we'll use a workaround
      // We could either:
      // 1. Generate a temporary password and sign them in
      // 2. Use admin functions to create a session
      // 3. Update user with a known temporary password

      // For now, let's use the admin approach
      const { data, error } = await supabase.functions.invoke('handle-imported-user-auth', {
        body: {
          action: 'phone_login_success',
          userId: phoneUser.id,
          email: phoneUser.email
        }
      });

      if (error) {
        throw error;
      }

      // Always try to sign in with the temporary credentials
      if (data?.tempPassword) {
        console.log('Attempting to sign in with temp password');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: phoneUser.email,
          password: data.tempPassword
        });

        if (signInError) {
          console.error('Sign in with temp password failed:', signInError);
          throw new Error('Authentication failed: ' + signInError.message);
        }

        if (signInData?.user) {
          console.log('Successfully signed in user:', signInData.user.id);
          toast.success("Phone login successful!");
        }
      } else {
        throw new Error('No temporary password returned from server');
      }

      navigate("/dashboard");
    } catch (error: any) {
      toast.error("Login failed after verification: " + (error.message || "Unknown error"));
    }
  };

  const handleResendOTP = async () => {
    if (!phoneUser) return;

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '256' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('256')) {
      formattedPhone = '256' + formattedPhone;
    }

    await sendOTP({
      phoneNumber: formattedPhone,
      purpose: 'verification',
      userId: phoneUser.id
    });
  };

  const handleBackToPhone = () => {
    setShowOtpInput(false);
    setOtpCode("");
    setPhoneUser(null);
    resetOTP();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black text-black dark:text-white">
      <Navbar />
      <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-yawatu-gold/30 p-8 shadow-md">
            <div className="text-center mb-6">
              <img src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png" alt="Yawatu Minerals & Mining Logo" className="h-14 mx-auto mb-2" />
              <h1 className="text-2xl font-bold gold-text">Login to Your Account</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Access your Yawatu investment portal</p>
            </div>

            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email" data-value="email">Email</TabsTrigger>
                <TabsTrigger value="phone" data-value="phone">Phone</TabsTrigger>
              </TabsList>
              
              <TabsContent value="email">
                <form className="space-y-6" onSubmit={handleEmailLogin}>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="john@example.com" 
                      className="bg-white/50 dark:bg-black/50 border-gray-300 dark:border-yawatu-gold/30 focus:border-yawatu-gold" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      className="bg-white/50 dark:bg-black/50 border-gray-300 dark:border-yawatu-gold/30 focus:border-yawatu-gold" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {/* Verification notice if email not confirmed */}
                  {showVerifyNotice && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700 flex flex-col gap-2">
                      Your email address is not verified. Please check your email for a confirmation link to activate your account.
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="w-full"
                      >
                        {resending ? "Resending..." : "Resend Verification Email"}
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input 
                        id="remember-me" 
                        name="remember-me" 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-500 text-yawatu-gold focus:ring-yawatu-gold"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Remember me
                      </label>
                    </div>
                    <div>
                      <Link to="/forgot-password" className="text-sm text-yawatu-gold hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-yawatu-gold text-black hover:bg-yellow-400 font-bold text-lg h-12 border-2 border-yawatu-gold shadow-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="phone">
                {!showOtpInput ? (
                  <form className="space-y-6" onSubmit={handlePhoneLogin}>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="+256 700 000000" 
                        className="bg-white/50 dark:bg-black/50 border-gray-300 dark:border-yawatu-gold/30 focus:border-yawatu-gold" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-yawatu-gold text-black hover:bg-yellow-400 font-bold text-lg h-12 border-2 border-yawatu-gold shadow-lg"
                      disabled={isLoading || otpLoading}
                    >
                      {isLoading || otpLoading ? "Sending OTP..." : "Send OTP"}
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-6" onSubmit={handleOtpVerification}>
                    <div>
                      <Label>Verification Code</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Enter the 6-digit code sent to {phone}
                      </p>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={otpCode}
                          onChange={setOtpCode}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </div>

                    {countdown > 0 && (
                      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Code expires in {formatCountdown()}
                      </div>
                    )}

                    {otpError && (
                      <div className="text-center text-sm text-red-500">
                        {otpError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <Button 
                        type="submit" 
                        className="w-full bg-yawatu-gold text-black hover:bg-yellow-400 font-bold text-lg h-12 border-2 border-yawatu-gold shadow-lg"
                        disabled={isVerifying || otpCode.length !== 6}
                      >
                        {isVerifying ? "Verifying..." : "Verify & Login"}
                      </Button>
                      
                      <div className="flex justify-between">
                        <Button 
                          type="button" 
                          variant="ghost"
                          onClick={handleBackToPhone}
                          className="text-yawatu-gold hover:text-yellow-400"
                        >
                          Back to Phone
                        </Button>
                        
                        <Button 
                          type="button" 
                          variant="ghost"
                          onClick={handleResendOTP}
                          disabled={!canResend || otpLoading}
                          className="text-yawatu-gold hover:text-yellow-400"
                        >
                          {canResend ? "Resend OTP" : `Resend in ${formatCountdown()}`}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6 space-y-2">
              <div>
                Don't have an account?{" "}
                <Link to="/register-new" className="text-yawatu-gold hover:text-yellow-400 font-bold underline">
                  Register here
                </Link>
              </div>
              <div>
                Account imported but not activated?{" "}
                <Link to="/request-activation" className="text-yawatu-gold hover:text-yellow-400 font-bold underline">
                  Request activation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
