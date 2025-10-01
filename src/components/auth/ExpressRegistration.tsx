import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, User, Share, MessageCircle } from 'lucide-react';
import PasswordStrengthChecker from './PasswordStrengthChecker';
import SocialLogin from '../social/SocialLogin';
import { useUTMTracking } from '@/hooks/useUTMTracking';

const ExpressRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [socialCompleted, setSocialCompleted] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const { captureUTMParams } = useUTMTracking();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    termsAgreed: false
  });
  
  const [isPasswordRequired, setIsPasswordRequired] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const socialParam = params.get('social');
    const provider = params.get('provider');
    const referralCode = params.get('ref');
    
    console.log('ExpressRegistration mounted:', { socialParam, provider, referralCode });
    
    // Check if user is already authenticated from social login
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && socialParam === 'true') {
        console.log('Social login completed, pre-filling user data');
        setSocialCompleted(true);
        setShowRegistrationForm(true);
        
        // Pre-fill user data from social login
        const user = session.user;
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const nameParts = fullName.split(' ');
        
        setFormData(prev => ({
          ...prev,
          firstName: user.user_metadata?.first_name || nameParts[0] || '',
          lastName: user.user_metadata?.last_name || nameParts.slice(1).join(' ') || '',
          email: user.email || '',
          phone: user.phone || user.user_metadata?.phone || '',
          referralCode: referralCode || prev.referralCode
        }));
        setIsPasswordRequired(false); // No password needed for social users
      } else if (referralCode) {
        setFormData(prev => ({
          ...prev,
          referralCode
        }));
      }
    };
    
    checkAuth();
    captureUTMParams();
  }, [searchParams, captureUTMParams]);

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

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      toast.error('Please enter your first name');
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error('Please enter your last name');
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error('Please enter your phone number');
      return false;
    }
    
    // Only validate password if not a social user
    if (isPasswordRequired) {
      if (!formData.password) {
        toast.error('Please enter a password');
        return false;
      }
      if (!formData.confirmPassword) {
        toast.error('Please confirm your password');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return false;
      }
      if (!isPasswordStrong(formData.password)) {
        toast.error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
        return false;
      }
    }
    
    if (!formData.termsAgreed) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      let userId: string;
      
      if (socialCompleted && !isPasswordRequired) {
        // For social users, get current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error('Social login session not found. Please try again.');
        }
        userId = session.user.id;
        
        // Update user metadata if needed
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
          }
        });
        
        if (updateError) {
          console.error('User metadata update error:', updateError);
        }
      } else {
        // Create new user account for email registration
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/verify-email`,
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              full_name: `${formData.firstName} ${formData.lastName}`,
              phone: formData.phone,
            }
          }
        });

        if (error) throw error;
        if (!data.user) throw new Error('User creation failed');
        
        userId = data.user.id;
      }

      // Create or update profile entry
      const profilePayload = {
        id: userId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        full_name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        account_type: 'individual' as const,
        email: formData.email,
        referral_code: formData.referralCode || null,
        user_role: 'user' as const,
        status: socialCompleted && !isPasswordRequired ? 'active' as const : 'unverified' as const,
        email_notifications: true,
        sms_notifications: false,
        marketing_emails: true
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't throw here, as user account was created successfully
      }

      const successMessage = socialCompleted && !isPasswordRequired
        ? 'Profile completed successfully! Welcome to YAWATU!' 
        : 'Account created! Check your email to verify.';
        
      toast.success(successMessage);
      navigate('/join/express/success');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const shareReferralWhatsApp = () => {
    const referralCode = `${formData.firstName}${formData.lastName}`.replace(/\s+/g, '').toUpperCase() + 'REF';
    const message = `Join me on YAWATU - Uganda's premier investment platform! Use my referral code: ${referralCode} to get started with exclusive benefits. https://yawatug.com/register-new?ref=${referralCode}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const renderSocialLoginStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <User className="h-8 w-8 text-primary mx-auto mb-2" />
        <h3 className="text-lg font-semibold">Choose your signup method</h3>
        <p className="text-sm text-muted-foreground">Quick and secure registration</p>
      </div>
      
      <SocialLogin />
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-muted" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>
      
      <Button 
        onClick={() => {
          setShowRegistrationForm(true);
          setIsPasswordRequired(true); // Email registration requires password
        }}
        className="w-full h-12"
        variant="outline"
      >
        Continue with Email
      </Button>
    </div>
  );

  const renderRegistrationForm = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
        <h3 className="text-lg font-semibold">Complete your registration</h3>
        <p className="text-sm text-muted-foreground">Just a few more details to get started</p>
      </div>

      {/* Personal Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="First name"
              className="h-12"
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Last name"
              className="h-12"
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter your email address"
            className="h-12"
            required
            disabled={!!formData.email && socialCompleted} // Disable if populated from social login
          />
        </div>
        
        <div>
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+256 700 000 000"
            className="h-12"
            required
          />
        </div>
      </div>

      {/* Password Section - Only for email registration */}
      {isPasswordRequired && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Create a strong password"
              className="h-12"
              required
            />
            {formData.password && (
              <div className="mt-2">
                <PasswordStrengthChecker password={formData.password} />
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm your password"
              className="h-12"
              required
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-sm text-destructive mt-1">Passwords do not match</p>
            )}
          </div>
        </div>
      )}

      {/* Social login success message */}
      {socialCompleted && !isPasswordRequired && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-900">✅ Social login successful!</p>
          <p className="text-xs text-green-700">Complete your profile details below</p>
        </div>
      )}

      {/* Terms Agreement */}
      <div className="flex items-start gap-3 p-4 border rounded-lg">
        <input
          type="checkbox"
          id="termsAgreed"
          checked={formData.termsAgreed}
          onChange={(e) => setFormData(prev => ({ ...prev, termsAgreed: e.target.checked }))}
          className="mt-1"
        />
        <label htmlFor="termsAgreed" className="text-sm">
          I agree to the{' '}
          <Button variant="link" className="p-0 h-auto text-primary">
            Terms & Conditions
          </Button>
          {' '}and{' '}
          <Button variant="link" className="p-0 h-auto text-primary">
            Privacy Policy
          </Button>
        </label>
      </div>

      {/* Referral Code Display */}
      {formData.referralCode && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-primary">
            🎉 Referral code applied: {formData.referralCode}
          </p>
          <p className="text-xs text-primary/80">You'll get bonus rewards!</p>
        </div>
      )}

      {/* Earn Rewards Section */}
      <div className="p-4 bg-secondary/10 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Share className="h-4 w-4" />
          Earn rewards by sharing
        </h4>
        <p className="text-sm text-muted-foreground mb-3">
          Share with friends and earn bonus rewards when they invest
        </p>
        <Button
          variant="outline"
          onClick={shareReferralWhatsApp}
          className="w-full flex items-center gap-2"
          type="button"
        >
          <MessageCircle className="h-4 w-4" />
          Share on WhatsApp
        </Button>
      </div>

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit} 
        disabled={loading}
        className="w-full h-12"
      >
        {loading 
          ? (socialCompleted && !isPasswordRequired ? 'Completing Profile...' : 'Creating Account...') 
          : (socialCompleted && !isPasswordRequired ? 'Complete Profile' : 'Start Investing')
        }
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">Quick Start</h1>
          <p className="text-muted-foreground">Join thousands of smart investors</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {!showRegistrationForm ? <User className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
              {!showRegistrationForm ? 'Choose Signup Method' : 'Complete Registration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!showRegistrationForm ? renderSocialLoginStep() : renderRegistrationForm()}

            {showRegistrationForm && (
              <div className="text-center pt-4">
                 <Button 
                   variant="link" 
                   className="p-0 text-muted-foreground hover:text-muted-foreground/80" 
                   onClick={() => {
                     setShowRegistrationForm(false);
                     setSocialCompleted(false);
                     setIsPasswordRequired(true); // Reset to default
                     setFormData(prev => ({
                       ...prev,
                       firstName: '',
                       lastName: '',
                       email: '',
                       phone: '',
                       password: '',
                       confirmPassword: ''
                     }));
                   }}
                 >
                   ← Back to signup options
                 </Button>
              </div>
            )}

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button 
                  variant="link" 
                  className="p-0 text-primary hover:text-primary/80" 
                  onClick={() => navigate('/login')}
                >
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpressRegistration;