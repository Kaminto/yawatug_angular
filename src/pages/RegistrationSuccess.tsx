
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Mail, Clock, ArrowRight, RefreshCw, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RegistrationSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [userNumber, setUserNumber] = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const userIdParam = searchParams.get('userId');
    
    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem('pending_verification_email', emailParam);
    } else {
      const storedEmail = localStorage.getItem('pending_verification_email');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }

    // Fetch user number if userId is provided
    if (userIdParam) {
      fetchUserNumber(userIdParam);
    }
  }, [searchParams]);

  const fetchUserNumber = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        // The referral code is now the registration number in YWT format
        setUserNumber(data.referral_code || 'YWT00000');
      }
    } catch (error) {
      console.error('Error fetching user number:', error);
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('Email address not found');
      return;
    }

    setResending(true);
    setCountdown(60);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email?email=${encodeURIComponent(email)}`
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Verification email sent!');
      }
    } catch (error) {
      toast.error('Failed to resend email');
    } finally {
      setResending(false);
    }
  };

  const emailProviders = [
    { name: 'Gmail', url: 'https://mail.google.com', color: 'bg-red-500' },
    { name: 'Outlook', url: 'https://outlook.live.com', color: 'bg-blue-500' },
    { name: 'Yahoo', url: 'https://mail.yahoo.com', color: 'bg-purple-500' },
    { name: 'Apple Mail', url: 'https://icloud.com/mail', color: 'bg-gray-800' }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black px-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Success Header */}
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-yawatu-gold">
              Registration Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Welcome to YAWATU! We've sent a verification email to:
            </p>
            <div className="font-medium text-yawatu-gold break-all bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              {email || 'your email address'}
            </div>
            {userNumber && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Hash className="h-4 w-4" />
                  <span className="font-medium">Your Registration Number</span>
                </div>
                <div className="text-lg font-bold text-green-800 dark:text-green-200 mt-1">
                  {userNumber}
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  This is your registration number and referral code!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">1</Badge>
                <div>
                  <p className="font-medium">Check Your Email</p>
                  <p className="text-sm text-muted-foreground">
                    Click the verification link in your email to activate your account
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">2</Badge>
                <div>
                  <p className="font-medium">Complete Your Profile</p>
                  <p className="text-sm text-muted-foreground">
                    Add personal information and upload required documents
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">3</Badge>
                <div>
                  <p className="font-medium">Get Verified</p>
                  <p className="text-sm text-muted-foreground">
                    Our team will review and approve your account within 1-3 business days
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Client Quick Access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Access to Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {emailProviders.map((provider) => (
                <Button
                  key={provider.name}
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(provider.url, '_blank')}
                  className="flex items-center gap-2"
                >
                  <div className={`w-3 h-3 rounded-full ${provider.color}`} />
                  {provider.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resend Email */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or resend it.
              </p>
              <Button
                onClick={handleResendEmail}
                disabled={resending || countdown > 0}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate('/auth')}>
            Back to Login
          </Button>
          <Button onClick={() => navigate('/verify-email')}>
            <Mail className="h-4 w-4 mr-2" />
            Check Verification Status
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
