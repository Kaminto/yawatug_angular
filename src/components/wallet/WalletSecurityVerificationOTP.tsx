import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Clock, Smartphone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getPreferredOTPMethod, getOTPMethodsAvailable } from '@/config/otpConfig';

interface SecurityVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  transactionAmount: number;
  transactionType: string;
  requiresOTP?: boolean;
}

const WalletSecurityVerificationOTP: React.FC<SecurityVerificationProps> = ({
  isOpen,
  onClose,
  onVerified,
  transactionAmount,
  transactionType,
  requiresOTP = true
}) => {
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'sms' | 'dual'>('sms');
  const [otpCode, setOtpCode] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userCurrency, setUserCurrency] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<Array<{value: 'sms' | 'email' | 'dual', label: string, icon: string, preferred: boolean}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user profile data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadUserProfile();
    }
  }, [isOpen]);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone, country_of_residence, email')
          .eq('id', user.id)
          .single();

        if (profile?.phone) {
          setUserPhone(profile.phone);
        }

        if (profile?.email) {
          setUserEmail(profile.email);
        }

        // Get user's currency from their wallet (assuming primary currency)
        const { data: wallet } = await supabase
          .from('wallets')
          .select('currency')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .single();

        const currency = wallet?.currency || 'UGX';
        setUserCurrency(currency);

        // Determine available methods and preferred method
        const methods = getOTPMethodsAvailable(profile?.country_of_residence, currency);
        setAvailableMethods(methods);
        
        // Set verification method based on availability and user data
        const hasPhone = !!profile?.phone;
        const hasEmail = !!profile?.email;
        
        if (hasPhone && hasEmail) {
          setVerificationMethod('sms'); // Default to SMS when both are available
        } else if (hasPhone) {
          setVerificationMethod('sms');
        } else if (hasEmail) {
          setVerificationMethod('email');
        } else {
          toast.error('No phone number or email found. Please update your profile.');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Default to SMS for local users
      setVerificationMethod('sms');
    }
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to continue');
        return;
      }

      if (verificationMethod === 'sms' && !userPhone) {
        toast.error('Phone number not found');
        return;
      }

      if (verificationMethod === 'email' && !userEmail) {
        toast.error('Email not found');
        return;
      }

      if (verificationMethod === 'dual' && (!userPhone || !userEmail)) {
        toast.error('Both phone and email are required for dual verification');
        return;
      }

      console.log('Sending verification with method:', verificationMethod);

      // Use the new unified send-dual-verification function
      const { data: verificationData, error: verificationError } = await supabase.functions.invoke('send-dual-verification', {
        body: {
          userId: user.id,
          phoneNumber: userPhone,
          email: userEmail,
          purpose: 'wallet_transaction',
          method: verificationMethod,
          transactionType: transactionType,
          amount: transactionAmount
        }
      });

      console.log('Verification send result:', { verificationData, verificationError });

      if (!verificationError && verificationData?.success) {
        setEmailOtpSent(true);
        const channelsText = verificationData.channels_sent?.join(' and ') || verificationMethod;
        toast.success(`Verification code sent via ${channelsText}`);
      } else {
        const errorMessage = verificationData?.error || verificationError?.message || `Failed to send verification code via ${verificationMethod}`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      const errorMessage = error.message || 'Failed to send verification code';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to continue');
        return;
      }

      console.log('Verifying OTP with SMS method:', { 
        userId: user.id, 
        otp: otpCode.substring(0, 2) + '****',
        purpose: 'transaction_verification' 
      });

      // Use the working SMS OTP verification function
      const { data: verificationData, error: verificationError } = await supabase.functions.invoke('verify-sms-otp', {
        body: {
          userId: user.id,
          otp: otpCode.trim(),
          phoneNumber: user.phone || '', // Add phone number as required by verify-sms-otp
          purpose: 'transaction_verification'
        }
      });

      console.log('Verification response:', { verificationData, verificationError });

      if (!verificationError && verificationData?.verified) {
        toast.success('Transaction verified successfully!');
        onVerified();
        onClose();
        setOtpCode('');
        return;
      }

      // If verification failed
      const errorMessage = verificationData?.error || 'Invalid verification code. Please check your SMS or email for the correct code.';
      throw new Error(errorMessage);
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      const errorMessage = error.message || 'Invalid verification code. Please check your SMS or email for the correct code.';
      setError(errorMessage);
      toast.error(errorMessage);
      setOtpCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const formatCountdownDisplay = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    setOtpCode('');
    setEmailOtpSent(false);
    setError(null);
    setIsLoading(false);
    setIsVerifying(false);
    setVerificationMethod('sms'); // Reset to default
    onClose();
  };

  const handleResend = () => {
    setOtpCode('');
    setError(null);
    handleSendOTP();
  };

  if (!requiresOTP) {
    onVerified();
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Verification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Please verify your identity to authorize this transaction: {' '}
              <span className="font-semibold">
                {userCurrency} {transactionAmount.toLocaleString()}
              </span>{' '}
              ({transactionType})
            </AlertDescription>
          </Alert>

          {!(emailOtpSent) ? (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Choose verification method</Label>
                <div className="mt-3 space-y-3">
                  {userPhone && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="sms"
                        name="verification"
                        value="sms"
                        checked={verificationMethod === 'sms'}
                        onChange={(e) => setVerificationMethod('sms')}
                        className="text-primary focus:ring-primary"
                      />
                      <label htmlFor="sms" className="flex items-center space-x-2 text-sm">
                        <Smartphone className="h-4 w-4" />
                        <span className="font-medium">SMS Verification</span>
                        <span className="text-muted-foreground">
                          (***{userPhone.slice(-4)})
                        </span>
                      </label>
                    </div>
                  )}
                  
                  {userEmail && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="email"
                        name="verification"
                        value="email"
                        checked={verificationMethod === 'email'}
                        onChange={(e) => setVerificationMethod('email')}
                        className="text-primary focus:ring-primary"
                      />
                      <label htmlFor="email" className="flex items-center space-x-2 text-sm">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">Email Verification</span>
                        <span className="text-muted-foreground">
                          (***{userEmail.slice(-10)})
                        </span>
                      </label>
                    </div>
                  )}
                  
                  {userPhone && userEmail && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="dual"
                        name="verification"
                        value="dual"
                        checked={verificationMethod === 'dual'}
                        onChange={(e) => setVerificationMethod('dual')}
                        className="text-primary focus:ring-primary"
                      />
                      <label htmlFor="dual" className="flex items-center space-x-2 text-sm">
                        <Smartphone className="h-4 w-4" />
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">SMS + Email Verification</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          Recommended
                        </span>
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {verificationMethod === 'dual' 
                    ? 'Verification codes will be sent to both your phone and email for better reliability.'
                    : verificationMethod === 'sms'
                      ? 'Verification code will be sent to your phone number.'
                      : 'Verification code will be sent to your email address.'
                  }
                </p>
              </div>

              <Button 
                onClick={handleSendOTP} 
                className="w-full" 
                disabled={isLoading || (verificationMethod === 'sms' && !userPhone) || (verificationMethod === 'email' && !userEmail) || (verificationMethod === 'dual' && (!userPhone || !userEmail))}
              >
                {isLoading ? 'Sending...' : `Send ${verificationMethod === 'dual' ? 'Verification Codes' : 'Verification Code'}`}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Enter Verification Code</Label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-wider"
                />
                {error && (
                  <p className="text-sm text-destructive mt-1">{error}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleVerifyOTP} 
                  className="flex-1" 
                  disabled={isVerifying || !otpCode.trim()}
                >
                  {isVerifying ? 'Verifying...' : 'Verify Code'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleResend}
                  disabled={isLoading}
                  className="flex items-center gap-1"
                >
                  Resend
                </Button>
              </div>

              <div className="text-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setEmailOtpSent(false);
                    setError(null);
                  }}
                >
                  Change Method
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletSecurityVerificationOTP;