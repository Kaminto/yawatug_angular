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
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import type { AccountType, UserStatus } from '@/types/profile';

interface FormData {
  fullName: string;
  phone: string;
  email: string;
  accountType: AccountType | '';
  password: string;
  confirmPassword: string;
}

const ExpressRegistrationFlow: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { utmParams, getReferralCode } = useUTMTracking();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    phone: '',
    email: '',
    accountType: '',
    password: '',
    confirmPassword: ''
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
      title: 'Contact',
      description: 'How to reach you',
      icon: <Phone className="w-5 h-5" />
    },
    {
      id: 3,
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
        return formData.phone.trim().length >= 10 && 
               formData.email.trim().length >= 5 && 
               formData.email.includes('@');
      case 3:
        return formData.password.length >= 8 && 
               formData.password === formData.confirmPassword;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
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
    if (!validateStep(3)) {
      toast.error('Please complete all fields correctly');
      return;
    }

    setLoading(true);

    try {
      // Quick registration with minimal verification
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding?source=${source}&focus=${focus}`,
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            account_type: formData.accountType,
            referral_code: referralCode,
            express_registration: true,
            utm_source: source,
            utm_campaign: utmParams.utm_campaign
          }
        }
      });

      if (error) {
        toast.error(error.message || 'Registration failed');
        return;
      }

      if (data.user) {
        // Create profile with express registration flag
        const profilePayload = {
          id: data.user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          account_type: formData.accountType as AccountType,
          email: formData.email,
          referral_code: referralCode || null,
          user_role: 'user' as const,
          status: 'unverified' as UserStatus,
          express_registration: true,
          utm_source: source,
          utm_campaign: utmParams.utm_campaign
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .insert([profilePayload]);

        if (insertError) {
          console.error('Error creating profile:', insertError);
          toast.error('Account created but profile setup failed. Please contact support.');
          return;
        }

        // Process referral if exists
        if (referralCode) {
          await supabase.rpc('process_signup_referral', {
            p_user_id: data.user.id,
            p_referral_code: referralCode
          });
        }

        toast.success('Welcome to Yawatu! Let\'s get you started.');
        
        // Skip email verification for express users - redirect to onboarding
        navigate(`/onboarding?source=${source}&focus=${focus}&express=true`);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Create Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Minimum 8 characters"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Re-enter your password"
                className="mt-1"
              />
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
                {loading ? 'Processing...' : currentStep === 3 ? 'Create Account' : 'Next'}
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
  );
};

export default ExpressRegistrationFlow;