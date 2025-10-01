import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Shield, Clock, Mail, Smartphone, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface WalletSecurityVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (verificationData: { otp?: string; pin?: string }) => void;
  transactionAmount: number;
  transactionType: string;
  requirePin?: boolean;
  requireOTP?: boolean;
}

type VerificationMethod = 'sms' | 'email' | 'dual';

interface OtpChannels {
  sms: boolean;
  email: boolean;
}

export default function WalletSecurityVerification({
  isOpen,
  onClose,
  onVerified,
  transactionAmount,
  transactionType,
  requirePin = false,
  requireOTP = true
}: WalletSecurityVerificationProps) {
  const [otpCode, setOtpCode] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [dualOtpSent, setDualOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('sms');
  const [userPhone, setUserPhone] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [otpChannels, setOtpChannels] = useState<OtpChannels>({sms: false, email: false});

  useEffect(() => {
    if (isOpen) {
      loadUserData();
      resetState();
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone, email')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserPhone(profile.phone || '');
          setUserEmail(profile.email || '');
          
          const hasPhone = Boolean(profile.phone);
          const hasEmail = Boolean(profile.email);
          
          if (hasPhone && hasEmail) {
            setVerificationMethod('sms'); // Default to SMS when both are available
          } else if (hasPhone) {
            setVerificationMethod('sms');
          } else if (hasEmail) {
            setVerificationMethod('email');
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const resetState = () => {
    setOtpCode('');
    setDualOtpSent(false);
    setOtpSent(false);
    setIsLoading(false);
    setIsVerifying(false);
    setError(null);
    setCountdown(0);
    setOtpChannels({sms: false, email: false});
  };

  const handleSendOTP = async () => {
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

    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to continue');
        return;
      }

      if (verificationMethod === 'dual') {
        // For dual method, send both SMS and email with single OTP generation
        const dualRequest = {
          recipient: `${userEmail},${userPhone}`, // Comma-separated for dual channel
          subject: 'YAWATU Transaction Verification',
          message: 'Your YAWATU transaction verification code is: [OTP_CODE]. Valid for 10 minutes.',
          channel: 'both' as const,
          templateType: 'transaction_otp',
          templateData: {
            amount: transactionAmount,
            transactionType: transactionType
          },
          otpRequest: {
            purpose: 'transaction_verification',
            userId: user.id,
            transactionType: transactionType,
            amount: transactionAmount,
            generateOTP: true
          }
        };
        
        // Send to both channels at once
        const dualResult = await supabase.functions.invoke('unified-communication-sender', {
          body: dualRequest
        });
        
        if (dualResult.data?.success) {
          setDualOtpSent(true);
          setCountdown(600);
          setOtpChannels({ sms: true, email: true });
          toast.success('Verification code sent via SMS and Email');
        } else {
          console.error('Dual channel error:', dualResult.error);
          throw new Error(dualResult.error?.message || 'Failed to send verification codes via both channels');
        }
      } else {
        // Single channel verification
        const { data: verificationData, error: verificationError } = await supabase.functions.invoke('unified-communication-sender', {
          body: {
            recipient: verificationMethod === 'email' ? userEmail : userPhone,
            subject: verificationMethod === 'email' ? 'YAWATU Transaction Verification' : undefined,
            message: 'Your YAWATU transaction verification code is: [OTP_CODE]. Valid for 10 minutes.',
            channel: verificationMethod === 'email' ? 'email' : 'sms',
            templateType: 'transaction_otp',
            templateData: {
              amount: transactionAmount,
              transactionType: transactionType
            },
            otpRequest: {
              purpose: 'transaction_verification',
              userId: user.id,
              transactionType: transactionType,
              amount: transactionAmount,
              generateOTP: true
            }
          }
        });
        
        if (verificationError) {
          console.error('Single channel error:', verificationError);
          throw new Error(verificationError.message || `Failed to send ${verificationMethod} verification`);
        }
        
        if (verificationData?.success) {
          setOtpSent(true);
          setCountdown(600);
          setOtpChannels({
            sms: verificationMethod === 'sms',
            email: verificationMethod === 'email'
          });
          
          const channel = verificationMethod === 'email' ? 'Email' : 'SMS';
          toast.success(`Verification code sent via ${channel}`);
        } else {
          console.error('Verification failed:', verificationData);
          throw new Error(verificationData?.message || `Failed to send ${verificationMethod} verification`);
        }
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      const errorMessage = error.message || 'Failed to send verification codes';
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

      const { data: verificationResult, error: verificationError } = await supabase.functions.invoke('verify-unified-otp', {
        body: {
          userId: user.id,
          otp: otpCode.trim(),
          purpose: 'transaction_verification',
          phoneNumber: userPhone || undefined
        }
      });

      if (verificationError) {
        throw new Error(verificationError.message || 'Failed to verify OTP');
      }

      if (verificationResult?.verified) {
        toast.success('Verification successful');
        onVerified({ otp: otpCode, pin: pin || undefined });
      } else {
        throw new Error(verificationResult?.error || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      const errorMessage = error.message || 'Failed to verify code';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const formatCountdown = () => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const canResend = countdown === 0 && !isLoading;
  const hasValidChannels = otpChannels.sms || otpChannels.email;
  const shouldShowOtpInput = (otpSent || dualOtpSent) && hasValidChannels;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold">Security Verification Required</CardTitle>
          <CardDescription>
            Verify this transaction to protect your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Transaction Details */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-800">Transaction Details</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Amount: <span className="font-semibold">UGX {transactionAmount.toLocaleString()}</span>
                </p>
                <p className="text-sm text-amber-700">
                  Type: <span className="font-semibold capitalize">{transactionType}</span>
                </p>
              </div>
            </div>
          </div>

          {requireOTP && (
            <>
              {!shouldShowOtpInput && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Choose verification method:</Label>
                  <RadioGroup
                    value={verificationMethod}
                    onValueChange={(value) => setVerificationMethod(value as VerificationMethod)}
                    className="space-y-2"
                  >
                    {userPhone && (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="sms" id="sms" />
                        <Smartphone className="w-4 h-4 text-blue-600" />
                        <Label htmlFor="sms" className="flex-1 cursor-pointer">
                          SMS to {userPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-**$3')}
                        </Label>
                      </div>
                    )}
                    {userEmail && (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="email" id="email" />
                        <Mail className="w-4 h-4 text-green-600" />
                        <Label htmlFor="email" className="flex-1 cursor-pointer">
                          Email to {userEmail.replace(/(.{2}).*(@.*)/, '$1***$2')}
                        </Label>
                      </div>
                    )}
                    {userPhone && userEmail && (
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="dual" id="dual" />
                        <Users className="w-4 h-4 text-purple-600" />
                        <Label htmlFor="dual" className="flex-1 cursor-pointer">
                          Both SMS and Email (Recommended)
                        </Label>
                      </div>
                    )}
                  </RadioGroup>

                  <Button
                    onClick={handleSendOTP}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Sending...' : 'Send Verification Code'}
                  </Button>
                </div>
              )}

              {shouldShowOtpInput && (
                <div className="space-y-4">
                  <div className="text-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {countdown > 0 ? (
                      <>Code expires in {formatCountdown()}</>
                    ) : (
                      'Verification code has expired'
                    )}
                  </div>

                  {otpChannels.sms && otpChannels.email && (
                    <div className="text-center text-sm text-green-600 bg-green-50 p-2 rounded">
                      Verification code sent to both SMS and Email
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-lg tracking-widest"
                    />
                  </div>

                  {canResend && (
                    <Button
                      variant="outline"
                      onClick={handleSendOTP}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Resend Code
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {requirePin && (
            <>
              {requireOTP && <Separator />}
              <div className="space-y-2">
                <Label htmlFor="pin">Transaction PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter your 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  className="text-center text-lg tracking-widest"
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading || isVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyOTP}
              disabled={
                isVerifying ||
                (requireOTP && !shouldShowOtpInput) ||
                (requireOTP && !otpCode.trim()) ||
                (requirePin && !pin.trim())
              }
              className="flex-1"
            >
              {isVerifying ? 'Verifying...' : 'Verify & Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}