
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PasswordStrengthChecker from '@/components/auth/PasswordStrengthChecker';
import type { AccountType, UserStatus } from '@/types/profile';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    accountType: '' as AccountType | '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [loading, setLoading] = useState(false);

  // Extract referral code from URL parameters on component mount
  useEffect(() => {
    const referralCodeFromUrl = searchParams.get('ref');
    if (referralCodeFromUrl) {
      setFormData(prev => ({ ...prev, referralCode: referralCodeFromUrl }));
    }
  }, [searchParams]);

  const handleInputChange = (field: string, value: string | AccountType) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

  const checkIfEmailExists = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (error) {
        console.error("Error checking email existence", error);
        return false;
      }
      return data != null;
    } catch (err) {
      console.error("Supabase error", err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.fullName || !formData.phone || !formData.accountType) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isPasswordStrong(formData.password)) {
      toast.error('Password does not meet strength requirements');
      return;
    }

    setLoading(true);

    const emailExists = await checkIfEmailExists(formData.email);
    if (emailExists) {
      toast.error('Email is already in use.');
      setLoading(false);
      return;
    }

    try {
      // Register user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email?email=${encodeURIComponent(formData.email)}`,
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            account_type: formData.accountType
          }
        }
      });

      if (error) {
        console.error('Supabase signUp error:', error);
        toast.error(error.message || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      if (data && data.user) {
        const profilePayload = {
          id: data.user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          account_type: formData.accountType as AccountType,
          email: formData.email,
          // referral_code removed; handled via backend referral processing
          user_role: 'user' as const,
          status: 'unverified' as UserStatus
        };

        // Try update first
        const { error: profileError, count } = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('id', data.user.id)
          .select('id');

        let userRowsUpdated = Array.isArray(count) ? count.length : 0;

        if (userRowsUpdated === 0 || profileError) {
          // Try insert if update fails
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([profilePayload]);
          if (insertError) {
            console.error('Error inserting user profile:', insertError);
            toast.success('Account created! Please check your email for verification.');
          } else {
            toast.success('Registration successful! Please check your email for verification.');
          }
        } else {
          toast.success('Registration successful! Please check your email for verification.');
        }
        
        // Process referral signup if referral code was provided
        if (formData.referralCode) {
          try {
            const { data: referralResult, error: referralError } = await supabase
              .rpc('process_signup_referral', {
                p_user_id: data.user.id,
                p_referral_code: formData.referralCode
              });
            
            if (referralError) {
              console.error('Referral processing error:', referralError);
              // Don't fail registration for referral issues
            } else if ((referralResult as any)?.success) {
              toast.success('Welcome! You\'ve been successfully referred.');
            }
          } catch (referralErr) {
            console.error('Referral processing failed:', referralErr);
            // Don't fail registration for referral issues
          }
        }
        
        // Redirect to registration success page
        navigate(`/registration-success?email=${encodeURIComponent(formData.email)}&userId=${data.user.id}`);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Join YAWATU and start your investment journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+256 700 000 000"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="accountType">Account Type *</Label>
                <Select value={formData.accountType} onValueChange={(value: AccountType) => handleInputChange('accountType', value)}>
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
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
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
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                <Input
                  id="referralCode"
                  type="text"
                  value={formData.referralCode}
                  onChange={(e) => handleInputChange('referralCode', e.target.value)}
                  placeholder="Enter referral code if you have one"
                  readOnly={!!searchParams.get('ref')}
                  className={searchParams.get('ref') ? 'bg-green-50 border-green-200' : ''}
                />
                {searchParams.get('ref') && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      🎉 Welcome! You're joining through a referral
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      You and your referrer will both earn 5% commission on investments
                    </p>
                  </div>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !isPasswordStrong(formData.password)}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/auth" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
