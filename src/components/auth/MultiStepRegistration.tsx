import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, User, Shield, FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import PasswordStrengthChecker from './PasswordStrengthChecker';
import type { AccountType, UserStatus } from '@/types/profile';

interface StepProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

const Step: React.FC<StepProps> = ({ title, description, icon, completed }) => (
  <div className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
    completed ? 'bg-primary/5 border-primary' : 'bg-muted/50'
  }`}>
    <div className={`p-2 rounded-full ${completed ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
      {completed ? <CheckCircle className="h-4 w-4" /> : icon}
    </div>
    <div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const MultiStepRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data for all steps
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    fullName: '',
    email: '',
    phone: '',
    accountType: '' as AccountType | '',
    
    // Step 2: Account Details
    password: '',
    confirmPassword: '',
    referralCode: '',
    agreeToTerms: false,
    
    // Step 3: Verification Preferences
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false
  });

  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

  // Auto-fill referral code from URL parameters and handle express mode
  useEffect(() => {
    const referralCode = searchParams.get('ref');
    const expressMode = searchParams.get('express');
    
    if (referralCode) {
      setFormData(prev => ({ ...prev, referralCode }));
    }
    
    // Store UTM tracking data for campaign attribution
    const utmParams = {
      utm_source: searchParams.get('utm_source'),
      utm_medium: searchParams.get('utm_medium'),
      utm_campaign: searchParams.get('utm_campaign'),
      utm_content: searchParams.get('utm_content'),
    };
    
    if (Object.values(utmParams).some(v => v)) {
      localStorage.setItem('utm_params', JSON.stringify(utmParams));
    }
  }, [searchParams]);

  const steps = [
    {
      title: 'Basic Information',
      description: 'Tell us about yourself',
      icon: <User className="h-4 w-4" />,
      completed: currentStep > 1
    },
    {
      title: 'Account Security',
      description: 'Set up your credentials',
      icon: <Shield className="h-4 w-4" />,
      completed: currentStep > 2
    },
    {
      title: 'Verification Setup',
      description: 'Choose your preferences',
      icon: <FileText className="h-4 w-4" />,
      completed: currentStep > 3
    }
  ];

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

  const validateStep1 = () => {
    if (!formData.fullName || !formData.email || !formData.phone || !formData.accountType) {
      toast.error('Please fill in all required fields');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.password || !formData.confirmPassword) {
      toast.error('Please fill in password fields');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    if (!isPasswordStrong(formData.password)) {
      toast.error('Password does not meet strength requirements');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?mode=login`,
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            account_type: formData.accountType,
            referral_code: formData.referralCode
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const profilePayload = {
          id: data.user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          account_type: formData.accountType as AccountType,
          email: formData.email,
          referral_code: formData.referralCode || null,
          user_role: 'user' as const,
          status: 'unverified' as UserStatus,
          email_notifications: formData.emailNotifications,
          sms_notifications: formData.smsNotifications,
          marketing_emails: formData.marketingEmails
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .insert([profilePayload]);

        if (insertError) throw insertError;

        // Process referral if exists
        if (formData.referralCode) {
          await supabase.rpc('process_signup_referral', {
            p_user_id: data.user.id,
            p_referral_code: formData.referralCode
          });
        }

        // Navigate to success page with welcome flow
        navigate('/registration-success?welcome=true');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="fullName">Full Name *</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
          placeholder="Enter your full name"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Enter your email address"
          required
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
          required
        />
      </div>
      
      <div>
        <Label htmlFor="accountType">Account Type *</Label>
        <Select 
          value={formData.accountType} 
          onValueChange={(value: AccountType) => setFormData(prev => ({ ...prev, accountType: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your account type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">
              <div className="flex flex-col">
                <span>Individual</span>
                <span className="text-xs text-muted-foreground">Personal account</span>
              </div>
            </SelectItem>
            <SelectItem value="business">
              <div className="flex flex-col">
                <span>Business</span>
                <span className="text-xs text-muted-foreground">For companies</span>
              </div>
            </SelectItem>
            <SelectItem value="organisation">
              <div className="flex flex-col">
                <span>Organisation</span>
                <span className="text-xs text-muted-foreground">Non-profit organizations</span>
              </div>
            </SelectItem>
            <SelectItem value="minor">
              <div className="flex flex-col">
                <span>Minor</span>
                <span className="text-xs text-muted-foreground">Under 18 years old</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          placeholder="Create a strong password"
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
          required
        />
        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <p className="text-sm text-destructive mt-1">Passwords do not match</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="referralCode">Referral Code (Optional)</Label>
        <Input
          id="referralCode"
          value={formData.referralCode}
          onChange={(e) => setFormData(prev => ({ ...prev, referralCode: e.target.value }))}
          placeholder="Enter referral code if you have one"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Get rewards by using a friend's referral code
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Communication Preferences</h3>
        
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-xs text-muted-foreground">Receive important account updates</p>
          </div>
          <input
            type="checkbox"
            checked={formData.emailNotifications}
            onChange={(e) => setFormData(prev => ({ ...prev, emailNotifications: e.target.checked }))}
            className="h-4 w-4"
          />
        </div>
        
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">SMS Notifications</p>
            <p className="text-xs text-muted-foreground">Get instant alerts via SMS</p>
          </div>
          <input
            type="checkbox"
            checked={formData.smsNotifications}
            onChange={(e) => setFormData(prev => ({ ...prev, smsNotifications: e.target.checked }))}
            className="h-4 w-4"
          />
        </div>
        
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">Marketing Emails</p>
            <p className="text-xs text-muted-foreground">Receive updates about new features</p>
          </div>
          <input
            type="checkbox"
            checked={formData.marketingEmails}
            onChange={(e) => setFormData(prev => ({ ...prev, marketingEmails: e.target.checked }))}
            className="h-4 w-4"
          />
        </div>
      </div>
      
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">What happens next?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• You'll receive an email verification link</li>
          <li>• Complete your profile for faster verification</li>
          <li>• Upload required documents when ready</li>
          <li>• Start trading once verified</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Join YAWATU</h1>
          <p className="text-muted-foreground">Create your account in just a few simple steps</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Steps Sidebar */}
          <div className="space-y-4">
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            {steps.map((step, index) => (
              <Step
                key={index}
                title={step.title}
                description={step.description}
                icon={step.icon}
                completed={step.completed}
              />
            ))}
          </div>

          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {steps[currentStep - 1].icon}
                  Step {currentStep}: {steps[currentStep - 1].title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  {currentStep < totalSteps ? (
                    <Button onClick={handleNext}>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={loading}>
                      {loading ? 'Creating Account...' : 'Create Account'}
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                     <Button variant="link" className="p-0 text-yawatu-gold hover:text-yawatu-gold/80" onClick={() => navigate('/login')}>
                      Sign in here
                    </Button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiStepRegistration;