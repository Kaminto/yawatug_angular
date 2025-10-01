
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Clock, Mail, RefreshCw, AlertCircle, ExternalLink, ArrowRight } from "lucide-react";

function getEmailFromParamsOrStorage(location: ReturnType<typeof useLocation>) {
  const search = new URLSearchParams(location.search);
  let email = search.get("email");
  if (!email) {
    email = window.localStorage.getItem("pending_verification_email") || "";
  }
  return email;
}

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'pending' | 'verified' | 'expired'>('checking');
  const [checkingProgress, setCheckingProgress] = useState(0);

  useEffect(() => {
    const foundEmail = getEmailFromParamsOrStorage(location);
    setEmail(foundEmail);
    if (foundEmail) {
      window.localStorage.setItem("pending_verification_email", foundEmail);
    }
  }, [location]);

  useEffect(() => {
    if (!resending && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, resending]);

  // Enhanced verification polling with progress indication
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let progressInterval: NodeJS.Timeout | null = null;
    let checkCount = 0;
    const maxChecks = 20; // Check for up to 1 minute

    async function checkVerified() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email_confirmed_at) {
          setVerificationStatus('verified');
          toast({ title: "Email verified!", description: "Redirecting to profile setup..." });
          window.localStorage.removeItem("pending_verification_email");
          setTimeout(() => navigate("/profile?welcome=true"), 1500);
          return true;
        }
        
        checkCount++;
        if (checkCount >= maxChecks) {
          setVerificationStatus('pending');
          if (interval) clearInterval(interval);
          if (progressInterval) clearInterval(progressInterval);
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('Error checking verification:', error);
        return false;
      }
    }

    // Initial check
    checkVerified().then(shouldStop => {
      if (!shouldStop) {
        setVerificationStatus('pending');
        
        // Start polling
        interval = setInterval(async () => {
          const shouldStop = await checkVerified();
          if (shouldStop && interval) {
            clearInterval(interval);
            if (progressInterval) clearInterval(progressInterval);
          }
        }, 3000);

        // Progress indicator
        progressInterval = setInterval(() => {
          setCheckingProgress(prev => {
            const newProgress = (checkCount / maxChecks) * 100;
            return Math.min(newProgress, 95); // Never reach 100% through progress alone
          });
        }, 3000);
      }
    });

    return () => {
      if (interval) clearInterval(interval);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [navigate]);

  const handleResend = async () => {
    if (!email) {
      toast({ title: "Cannot resend", description: "Missing email address.", variant: "destructive" });
      return;
    }
    setResending(true);
    setCountdown(60);
    try {
      const redirectURL = `${window.location.origin}/verify-email?email=${encodeURIComponent(email)}`;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectURL }
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setResent(true);
        toast({ title: "Verification email resent!", description: `Check your inbox (${email}).` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Could not resend verification email.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const emailProviders = [
    { name: 'Gmail', url: 'https://mail.google.com' },
    { name: 'Outlook', url: 'https://outlook.live.com' },
    { name: 'Yahoo', url: 'https://mail.yahoo.com' }
  ];

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'checking':
        return <Clock className="h-12 w-12 text-blue-500 animate-pulse" />;
      case 'verified':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'expired':
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Mail className="h-12 w-12 text-yawatu-gold" />;
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'checking':
        return {
          title: 'Checking Verification Status...',
          description: 'We\'re automatically checking if you\'ve verified your email.'
        };
      case 'verified':
        return {
          title: 'Email Successfully Verified!',
          description: 'Your account is now active. Redirecting to profile setup...'
        };
      case 'expired':
        return {
          title: 'Verification Link May Have Expired',
          description: 'Please request a new verification email.'
        };
      default:
        return {
          title: 'Verify Your Email Address',
          description: 'Check your inbox and click the verification link to activate your account.'
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100 dark:from-yawatu-black-light dark:to-black px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Main Status Card */}
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              <img
                src="/lovable-uploads/1fd2bc66-b830-488d-b442-e2cf372e915b.png"
                alt="Yawatu Minerals & Mining Logo"
                className="h-12 mx-auto mb-4"
              />
              {getStatusIcon()}
            </div>
            <CardTitle className="text-xl font-bold gold-text">
              {statusInfo.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {statusInfo.description}
            </p>
            
            {email && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Email sent to:</div>
                <div className="font-medium text-yawatu-gold break-all">{email}</div>
              </div>
            )}

            {verificationStatus === 'checking' && (
              <div className="space-y-2">
                <Progress value={checkingProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Automatically checking for verification...
                </p>
              </div>
            )}

            {verificationStatus === 'verified' && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified Successfully
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Quick Email Access */}
        {verificationStatus === 'pending' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Email Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {emailProviders.map((provider) => (
                  <Button
                    key={provider.name}
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(provider.url, '_blank')}
                    className="text-xs"
                  >
                    {provider.name}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resend Section */}
        {verificationStatus !== 'verified' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Button
                onClick={handleResend}
                className="w-full"
                variant="secondary"
                disabled={resending || countdown > 0}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${resending ? 'animate-spin' : ''}`} />
                {resending
                  ? "Resending..."
                  : countdown > 0
                  ? `Resend Email (${countdown}s)`
                  : "Resend Verification Email"}
              </Button>
              
              {resent && (
                <div className="text-center text-sm text-green-600">
                  ✓ Verification email sent! Please check your inbox.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Troubleshooting */}
        {verificationStatus === 'pending' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yawatu-gold mt-2 flex-shrink-0" />
                <div>Check your spam/junk folder</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yawatu-gold mt-2 flex-shrink-0" />
                <div>Make sure you're checking the correct email account</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yawatu-gold mt-2 flex-shrink-0" />
                <div>The verification link expires after 24 hours</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("mailto:support@yawatu.com", "_blank")}
          >
            Contact Support
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.localStorage.removeItem("pending_verification_email");
              navigate("/auth");
            }}
          >
            Return to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
