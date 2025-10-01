
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, Smartphone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateSecretKey, generateQRCodeUrl } from '@/utils/totpGenerator';

const TwoFactorSetup: React.FC = () => {
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [googleAuthCode, setGoogleAuthCode] = useState('');
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testingGoogle, setTestingGoogle] = useState(false);

  useEffect(() => {
    loadTwoFactorSettings();
  }, []);

  const loadTwoFactorSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user's phone and 2FA settings
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }

      if (profile?.phone) {
        setPhoneNumber(profile.phone);
        setPhoneVerified(true);
      } else {
        // If no phone in profile, reset state
        setPhoneNumber('');
        setPhoneVerified(false);
      }

      // Load 2FA settings - use maybeSingle to handle no records gracefully
      const { data: twoFASettings, error: twoFAError } = await supabase
        .from('two_factor_auth')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (twoFAError) {
        console.error('Error loading 2FA settings:', twoFAError);
        return;
      }

      // Set state based on database data, with defaults if no record exists
      setSmsEnabled(twoFASettings?.sms_enabled || false);
      setGoogleAuthEnabled(twoFASettings?.google_auth_enabled || false);
      
      if (twoFASettings?.google_auth_secret) {
        setSecretKey(twoFASettings.google_auth_secret);
      }
    } catch (error) {
      console.error('Error loading 2FA settings:', error);
    }
  };

  const sendPhoneVerificationOTP = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    // Format phone number (add country code if needed)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '256' + formattedPhone.substring(1); // Uganda country code
    } else if (!formattedPhone.startsWith('256')) {
      formattedPhone = '256' + formattedPhone;
    }
    
    // Ensure the formatted phone is saved for verification
    setPhoneNumber(formattedPhone);

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('send-sms-otp', {
        body: {
          phoneNumber: formattedPhone,
          purpose: 'verification',
          userId: user.id
        }
      });

      if (error) throw error;

      setOtpSent(true);
      toast.success('Verification code sent to your phone');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOTP = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Format phone number for verification
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '256' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('256')) {
        formattedPhone = '256' + formattedPhone;
      }
      
      const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
        body: {
          userId: user.id,
          otp: verificationCode,
          phoneNumber: formattedPhone,
          purpose: 'verification'
        }
      });

      if (error) throw error;

      if (data.verified) {
        // Update user profile with verified phone
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ phone: formattedPhone })
          .eq('id', user.id);

        if (updateError) throw updateError;

        setPhoneVerified(true);
        setOtpSent(false);
        setVerificationCode('');
        toast.success('Phone number verified successfully');
      } else {
        toast.error('Invalid verification code');
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const sendTestSMS = async () => {
    if (!phoneVerified) {
      toast.error('Please verify your phone number first');
      return;
    }

    setTestingSms(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('send-sms-otp', {
        body: {
          phoneNumber: phoneNumber,
          purpose: 'two_factor_auth',
          userId: user.id
        }
      });

      if (error) throw error;
      toast.success('Test SMS sent successfully! Check your phone.');
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast.error('Failed to send test SMS');
    } finally {
      setTestingSms(false);
    }
  };

  const handleSMSToggle = async (enabled: boolean) => {
    if (enabled && !phoneVerified) {
      toast.error('Please verify your phone number first');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First get existing record to preserve other fields
      const { data: existing } = await supabase
        .from('two_factor_auth')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('two_factor_auth')
        .upsert({
          user_id: user.id,
          sms_enabled: enabled,
          google_auth_enabled: existing?.google_auth_enabled || false,
          google_auth_secret: existing?.google_auth_secret || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      setSmsEnabled(enabled);
      toast.success(enabled ? 'SMS 2FA enabled' : 'SMS 2FA disabled');
    } catch (error: any) {
      console.error('Error toggling SMS 2FA:', error);
      toast.error(error.message || 'Failed to update SMS 2FA settings');
      // Reset state on error
      setSmsEnabled(!enabled);
    } finally {
      setLoading(false);
    }
  };

  const setupGoogleAuth = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate a secret key and QR code
      const secret = generateSecretKey();
      const qrUrl = generateQRCodeUrl(user.email || '', secret);
      
      setSecretKey(secret);
      setQrCodeUrl(qrUrl);
      setShowGoogleSetup(true);
    } catch (error: any) {
      console.error('Error setting up Google Auth:', error);
      toast.error('Failed to setup Google Authenticator');
    } finally {
      setLoading(false);
    }
  };

  const verifyGoogleAuth = async () => {
    if (!googleAuthCode) {
      toast.error('Please enter the code from Google Authenticator');
      return;
    }

    if (googleAuthCode.length !== 6 || !/^\d{6}$/.test(googleAuthCode)) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setTestingGoogle(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify TOTP code using our edge function
      const { data, error } = await supabase.functions.invoke('verify-totp', {
        body: {
          userId: user.id,
          token: googleAuthCode,
          secret: secretKey
        }
      });

      if (error) {
        console.error('TOTP verification error:', error);
        throw new Error('Failed to verify code');
      }

      if (!data.verified) {
        toast.error('Invalid code. Please check the time on your device and try again.');
        return;
      }

      // Save the 2FA settings
      const { data: existing } = await supabase
        .from('two_factor_auth')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error: saveError } = await supabase
        .from('two_factor_auth')
        .upsert({
          user_id: user.id,
          google_auth_enabled: true,
          google_auth_secret: secretKey,
          sms_enabled: existing?.sms_enabled || false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (saveError) throw saveError;

      setGoogleAuthEnabled(true);
      setShowGoogleSetup(false);
      setGoogleAuthCode('');
      toast.success('Google Authenticator enabled successfully!');
    } catch (error: any) {
      console.error('Error verifying Google Auth:', error);
      toast.error(error.message || 'Failed to verify Google Authenticator code');
    } finally {
      setTestingGoogle(false);
    }
  };

  const handleGoogleAuthToggle = async (enabled: boolean) => {
    if (enabled && !googleAuthEnabled) {
      // Start setup process
      setupGoogleAuth();
      return;
    }

    if (!enabled && googleAuthEnabled) {
      // Disable Google Auth
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get existing record to preserve other fields
        const { data: existing } = await supabase
          .from('two_factor_auth')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const { error } = await supabase
          .from('two_factor_auth')
          .upsert({
            user_id: user.id,
            google_auth_enabled: false,
            sms_enabled: existing?.sms_enabled || false,
            google_auth_secret: null, // Clear the secret when disabling
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Database error:', error);
          throw error;
        }

        setGoogleAuthEnabled(false);
        setSecretKey('');
        toast.success('Google Authenticator disabled');
      } catch (error: any) {
        console.error('Error toggling Google Auth:', error);
        toast.error(error.message || 'Failed to update Google Authenticator settings');
        // Reset state on error
        setGoogleAuthEnabled(!enabled);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SMS 2FA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-medium">SMS Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Receive verification codes via SMS
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {smsEnabled && <Badge variant="default">Active</Badge>}
              {phoneVerified && !smsEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestSMS}
                  disabled={testingSms}
                  className="text-xs"
                >
                  {testingSms ? 'Sending...' : 'Test SMS'}
                </Button>
              )}
              <Switch
                checked={smsEnabled}
                onCheckedChange={handleSMSToggle}
                disabled={loading || !phoneVerified}
              />
            </div>
          </div>

          {/* Phone Number Setup */}
          {!phoneVerified && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Verify Phone Number</h4>
              
              {!otpSent ? (
                <div className="space-y-3">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number (e.g., 0701234567)"
                  />
                  <Button 
                    onClick={sendPhoneVerificationOTP}
                    disabled={!phoneNumber || loading}
                    size="sm"
                  >
                    {loading ? 'Sending...' : 'Send Verification Code'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={verifyPhoneOTP}
                      disabled={!verificationCode || loading}
                      size="sm"
                    >
                      {loading ? 'Verifying...' : 'Verify Code'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setOtpSent(false);
                        setVerificationCode('');
                      }}
                      size="sm"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Google Authenticator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-medium">Google Authenticator</h3>
                <p className="text-sm text-muted-foreground">
                  Use Google Authenticator app for verification
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {googleAuthEnabled && <Badge variant="default">Active</Badge>}
              <Switch
                checked={googleAuthEnabled}
                onCheckedChange={handleGoogleAuthToggle}
                disabled={loading}
              />
            </div>
          </div>

          {/* Google Authenticator Setup Modal */}
          {showGoogleSetup && (
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <h4 className="font-medium">Setup Google Authenticator</h4>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  1. Install Google Authenticator app on your phone
                </p>
                <p className="text-sm text-muted-foreground">
                  2. Scan this QR code with the app:
                </p>
                
                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <img src={qrCodeUrl} alt="QR Code" className="border rounded" />
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">
                  Or manually enter this secret key: <code className="bg-background px-1 rounded">{secretKey}</code>
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="google-code">Enter verification code from app:</Label>
                  <Input
                    id="google-code"
                    type="text"
                    value={googleAuthCode}
                    onChange={(e) => setGoogleAuthCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={verifyGoogleAuth}
                    disabled={!googleAuthCode || testingGoogle}
                    size="sm"
                  >
                    {testingGoogle ? 'Verifying...' : 'Verify & Enable'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowGoogleSetup(false);
                      setGoogleAuthCode('');
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Security Recommendation</h4>
            <p className="text-sm text-blue-700">
              Enable at least one two-factor authentication method to secure your account. 
              SMS authentication provides additional security for wallet transactions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TwoFactorSetup;
