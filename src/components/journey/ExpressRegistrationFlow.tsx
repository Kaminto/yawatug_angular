import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  User, 
  Phone, 
  Mail, 
  Shield,
  Clock,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import PasswordStrengthChecker from '@/components/auth/PasswordStrengthChecker';
import type { AccountType, UserStatus } from '@/types/profile';
import { RegistrationSuccess } from '@/components/auth/RegistrationSuccess';

interface FormData {
  fullName: string;
  phone: string;
  email: string;
  accountType: AccountType | '';
  password: string;
  confirmPassword: string;
  registrationMethod: 'email' | 'phone' | 'both';
}

const ExpressRegistrationFlow: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { utmParams, getReferralCode } = useUTMTracking();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phone: '',
    email: '',
    accountType: '',
    password: '',
    confirmPassword: '',
    registrationMethod: 'both'
  });

  const focus = searchParams.get('focus') || 'general';
  const source = searchParams.get('utm_source') || utmParams.utm_source;
  const referralCode = getReferralCode();

  const steps = [
    {
      id: 1,
      title: 'Basic Info',
      description: 'Tell us about yourself',
      icon: <User className="w-5 h-5" />
    },
    {
      id: 2,
      title: 'Registration Method',
      description: 'Choose email or phone',
      icon: <Mail className="w-5 h-5" />
    },
    {
      id: 3,
      title: 'Contact Details',
      description: 'How to reach you',
      icon: <Phone className="w-5 h-5" />
    },
    {
      id: 4,
      title: 'Security',
      description: 'Secure your account',
      icon: <Shield className="w-5 h-5" />
    }
  ];

  const getPersonalizedContent = () => {
    if (source === 'facebook') {
      return {
        headline: "Join Your Facebook Friends",
        subheadline: "Quick registration • Start with UGX 10,000",
        benefit: "Your friends earn an average of 12% monthly returns"
      };
    }
    return {
      headline: "Start Investing in 3 Steps",
      subheadline: "Express registration • No paperwork needed",
      benefit: "Join 2,800+ investors earning passive income"
    };
  };

  const content = getPersonalizedContent();

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.fullName.trim().length >= 2 && formData.accountType !== '';
      case 2:
        return true; // Method is always set by default
      case 3:
        // Validate based on chosen method
        if (formData.registrationMethod === 'email' || formData.registrationMethod === 'both') {
          if (!formData.email.trim() || !formData.email.includes('@')) return false;
        }
        if (formData.registrationMethod === 'phone' || formData.registrationMethod === 'both') {
          if (formData.phone.trim().length < 10) return false;
        }
        return true;
      case 4:
        return formData.password.length >= 8 && 
               formData.password === formData.confirmPassword;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    } else {
      toast.error('Please fill in all required fields correctly');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast.error('Please complete all fields correctly');
      return;
    }

    setLoading(true);

    try {
      // Determine auth email - use real email or generate temp for phone-only
      const authEmail = formData.registrationMethod === 'phone' && !formData.email
        ? `phone+${formData.phone.replace(/[^\d]/g, '')}@yawatu.app`
        : formData.email;

      // Pre-check for duplicates
      const { data: duplicateCheck } = await supabase.rpc('check_user_status_public', {
        p_email: formData.email || null,
        p_phone: formData.phone || null
      });

      if ((duplicateCheck as any)?.exists) {
        const method = formData.registrationMethod === 'email' ? 'email' : 'phone number';
        if ((duplicateCheck as any)?.needs_activation) {
          toast.warning(`This ${method} is already registered but not activated. Please check for activation instructions.`);
        } else {
          toast.error(`This ${method} is already registered. Try logging in or resetting your password.`);
        }
        setLoading(false);
        return;
      }

      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: formData.fullName,
            phone: formData.phone || null,
            account_type: formData.accountType,
            referral_code: referralCode || null,
            registration_method: formData.registrationMethod,
            utm_source: source,
            utm_campaign: utmParams.utm_campaign
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This account already exists. Please try logging in instead.');
        } else {
          toast.error(error.message || 'Registration failed');
        }
        return;
      }

      if (data.user) {
        // Fetch the generated registration number
        const { data: profile } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('id', data.user.id)
          .single();

        if (profile?.referral_code) {
          setRegistrationNumber(profile.referral_code);
        }

        toast.success(`Welcome to YAWATU! Your registration number is ${profile?.referral_code || 'being generated'}`);
        setShowSuccess(true);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter your full name"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="accountType">Account Type *</Label>
              <Select 
                value={formData.accountType} 
                onValueChange={(value: AccountType) => setFormData(prev => ({ ...prev, accountType: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Investor</SelectItem>
                  <SelectItem value="business">Business Account</SelectItem>
                  <SelectItem value="organisation">Organisation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {referralCode && (
              <div className="p-3 bg-secondary/10 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-secondary" />
                  <span>Referral code: <strong>{referralCode}</strong></span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll get bonus rewards when you make your first investment
                </p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h4 className="font-medium mb-3">How would you like to register?</h4>
              <div className="space-y-2">
                <Button
                  variant={formData.registrationMethod === 'email' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setFormData(prev => ({ ...prev, registrationMethod: 'email' }))}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Only
                </Button>
                <Button
                  variant={formData.registrationMethod === 'phone' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setFormData(prev => ({ ...prev, registrationMethod: 'phone' }))}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Phone Only
                </Button>
                <Button
                  variant={formData.registrationMethod === 'both' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setFormData(prev => ({ ...prev, registrationMethod: 'both' }))}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Both (Recommended)
                </Button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {(formData.registrationMethod === 'email' || formData.registrationMethod === 'both') && (
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@example.com"
                  className="mt-1"
                />
              </div>
            )}
            
            {(formData.registrationMethod === 'phone' || formData.registrationMethod === 'both') && (
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+256 700 000 000"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for transaction alerts and support
                </p>
              </div>
            )}
            
            {formData.registrationMethod === 'email' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 You can add your phone number later for transaction alerts
                </p>
              </div>
            )}
            
            {formData.registrationMethod === 'phone' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 You can add your email later for account notifications
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Create Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 8 characters"
                  className="mt-1"
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
              {formData.password && (
                <div className="mt-2">
                  <PasswordStrengthChecker password={formData.password} />
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-enter your password"
                  className="mt-1"
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
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-sm text-destructive mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="p-3 bg-primary/5 rounded-lg">
              <div className="flex items-start gap-2 text-sm">
                <Zap className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Express Registration Benefits:</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Instant access to demo features</li>
                    <li>• Start investing immediately</li>
                    <li>• Complete verification later</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {showSuccess && registrationNumber ? (
        <RegistrationSuccess
          registrationNumber={registrationNumber}
          registrationMethod={formData.registrationMethod === 'phone' ? 'phone' : 'email'}
          email={formData.email}
          phone={formData.phone}
          variant="page"
        />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">{content.headline}</h1>
              <p className="text-muted-foreground">{content.subheadline}</p>
              <Badge variant="secondary" className="mt-2">
                <Clock className="w-3 h-3 mr-1" />
                2 minutes to complete
              </Badge>
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center mb-4">
                  <CardTitle className="text-lg">
                    Step {currentStep} of {steps.length}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {steps[currentStep - 1].icon}
                    <span className="text-sm font-medium">{steps[currentStep - 1].title}</span>
                  </div>
                </div>
                <Progress value={(currentStep / steps.length) * 100} />
              </CardHeader>

              <CardContent>
                <div className="mb-6">
                  <h3 className="font-medium mb-1">{steps[currentStep - 1].title}</h3>
                  <p className="text-sm text-muted-foreground">{steps[currentStep - 1].description}</p>
                </div>

                {renderStepContent()}

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  
                  <Button
                    onClick={handleNext}
                    disabled={!validateStep(currentStep) || loading}
                    className="flex-1"
                  >
                    {loading ? 'Processing...' : currentStep === 4 ? 'Create Account' : 'Next'}
                    {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Benefits footer */}
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">{content.benefit}</p>
              <div className="flex justify-center items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>✓ No setup fees</span>
                <span>✓ Start with UGX 10K</span>
                <span>✓ Instant access</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpressRegistrationFlow;