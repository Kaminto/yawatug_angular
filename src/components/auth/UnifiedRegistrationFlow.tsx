import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Smartphone, Mail, CreditCard, User, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RegistrationSuccess } from '@/components/auth/RegistrationSuccess';

interface UnifiedRegistrationFlowProps {
  variant?: 'modal' | 'page';
  onSuccess?: () => void;
}

export const UnifiedRegistrationFlow: React.FC<UnifiedRegistrationFlowProps> = ({ 
  variant = 'page', 
  onSuccess 
}) => {
  const [currentStep, setCurrentStep] = useState<'method' | 'details' | 'verification'>('method');
  const [registrationMethod, setRegistrationMethod] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    acceptedTerms: false,
    referralCode: ''
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();

  // Auto-fill referral code from URL parameters
  useEffect(() => {
    const referralCode = searchParams.get('ref');
    if (referralCode) {
      setFormData(prev => ({ ...prev, referralCode }));
    }
  }, [searchParams]);

  const handleMethodSelection = (method: 'email' | 'phone') => {
    setRegistrationMethod(method);
    setCurrentStep('details');
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast({ title: "Error", description: "Full name is required", variant: "destructive" });
      return false;
    }

    if (registrationMethod === 'email' && !formData.email.trim()) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return false;
    }

    if (registrationMethod === 'phone' && !formData.phone.trim()) {
      toast({ title: "Error", description: "Phone number is required", variant: "destructive" });
      return false;
    }

    if (!formData.password || formData.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return false;
    }

    if (!formData.acceptedTerms) {
      toast({ title: "Error", description: "Please accept the terms and conditions", variant: "destructive" });
      return false;
    }

    return true;
  };

  const handleRegistration = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Check for duplicate email/phone first
      const { data: duplicateCheck, error: duplicateError } = await supabase.rpc(
        'check_user_status_public',
        registrationMethod === 'email' 
          ? { p_email: formData.email.toLowerCase() }
          : { p_phone: formData.phone }
      );

      if (duplicateError) {
        toast({ title: "Error", description: "Unable to verify account uniqueness", variant: "destructive" });
        return;
      }

      if ((duplicateCheck as any)?.exists) {
        toast({ 
          title: "Account Already Exists", 
          description: `An account with this ${registrationMethod} already exists. Please use the login form or request account activation if needed.`,
          variant: "destructive" 
        });
        return;
      }

      // For phone-only registration, we still need an email for Supabase auth
      // Use a standardized format that won't conflict with real emails
      const authEmail = registrationMethod === 'email' 
        ? formData.email 
        : `phone+${formData.phone.replace(/[^\d]/g, '')}@yawatu.app`;

      const { error } = await signUp(
        authEmail,
        formData.password,
        formData.fullName,
        registrationMethod === 'phone' ? formData.phone : undefined,
        formData.referralCode || undefined,
        registrationMethod
      );

      if (error) {
        toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
        return;
      }

      // Fetch user's referral code from profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('id', user.id)
          .single();
        
        if (profile?.referral_code) {
          setRegistrationNumber(profile.referral_code);
          setFormData(prev => ({ ...prev, referralCode: profile.referral_code }));
        }
      }

      // Always show verification step for email registration
      setCurrentStep('verification');
      
      // Don't automatically navigate - user needs to verify first
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
      
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Create Your Account</h2>
        <p className="text-muted-foreground">Choose your preferred registration method</p>
      </div>
      
      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full h-16 justify-start space-x-4 hover:bg-primary/10"
          onClick={() => handleMethodSelection('email')}
        >
          <Mail className="h-6 w-6" />
          <div className="text-left">
            <div className="font-medium">Email Registration</div>
            <div className="text-sm text-muted-foreground">Register with your email address</div>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
        
        <Button
          variant="outline"
          className="w-full h-16 justify-start space-x-4 hover:bg-primary/10"
          onClick={() => handleMethodSelection('phone')}
        >
          <Smartphone className="h-6 w-6" />
          <div className="text-left">
            <div className="font-medium">Phone Registration</div>
            <div className="text-sm text-muted-foreground">Register with your phone number</div>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </div>
    </div>
  );

  const renderDetailsForm = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Account Details</h2>
        <p className="text-muted-foreground">
          {registrationMethod === 'email' ? 'Email' : 'Phone'} Registration
        </p>
      </div>

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleRegistration(); }}>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
            required
          />
        </div>

        {registrationMethod === 'email' ? (
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={formData.acceptedTerms}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptedTerms: !!checked }))}
              className="mt-1 h-4 w-4 flex-shrink-0"
            />
            <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer text-left">
              By creating an account, I agree to the{' '}
              <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
            </Label>
          </div>
          
          {/* Show referral code if present */}
          {formData.referralCode && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                🎉 Referral code applied: <strong>{formData.referralCode}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep('method')}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </div>
  );

  const renderVerification = () => {
    if (registrationNumber) {
      return (
        <RegistrationSuccess
          registrationNumber={registrationNumber}
          registrationMethod={registrationMethod}
          email={registrationMethod === 'email' ? formData.email : undefined}
          phone={registrationMethod === 'phone' ? formData.phone : undefined}
          variant="modal"
          onClose={() => navigate('/login')}
        />
      );
    }

    return (
      <div className="space-y-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-green-600">Account Created Successfully!</h2>
          <p className="text-muted-foreground">
            We've sent verification instructions to your {registrationMethod}.
          </p>
        </div>
        
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm">
            <strong>Next Steps:</strong>
          </p>
          <ol className="text-sm text-left mt-2 space-y-1 list-decimal list-inside">
            <li>Check your {registrationMethod} for the verification message</li>
            <li>Click the verification link to confirm your account</li>
            <li>Complete your profile setup</li>
            <li>Start investing in ethical gold mining</li>
          </ol>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => navigate('/login')}
            className="flex-1"
          >
            Back to Login
          </Button>
          <Button
            onClick={() => navigate('/verify-email', { state: { email: formData.email } })}
            className="flex-1"
          >
            Check Email
          </Button>
        </div>
      </div>
    );
  };

  const content = (
    <div className="w-full max-w-md mx-auto">
      {currentStep === 'method' && renderMethodSelection()}
      {currentStep === 'details' && renderDetailsForm()}
      {currentStep === 'verification' && renderVerification()}
    </div>
  );

  if (variant === 'modal') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          {content}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          {content}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedRegistrationFlow;