
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Smartphone, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecurityConfirmationProps {
  transactionDetails: {
    type: string;
    amount: number;
    currency: string;
    destination?: string;
    recipient?: string;
  };
  onConfirm: (securityData: any) => void;
  onCancel: () => void;
  requiresOTP?: boolean;
  requiresPIN?: boolean;
}

const EnhancedSecurityConfirmation: React.FC<SecurityConfirmationProps> = ({
  transactionDetails,
  onConfirm,
  onCancel,
  requiresOTP = true,
  requiresPIN = false
}) => {
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    
    if (requiresOTP && !otp) {
      setError('OTP is required');
      return;
    }
    
    if (requiresPIN && !pin) {
      setError('PIN is required');
      return;
    }

    setLoading(true);
    
    try {
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onConfirm({
        otp: requiresOTP ? otp : null,
        pin: requiresPIN ? pin : null,
        verified: true
      });
    } catch (error) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to continue');
        return;
      }

      // Get user phone number
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();

      if (!profile?.phone) {
        toast.error('No phone number found. Please update your profile.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('sms', {
        body: {
          phoneNumber: profile.phone,
          purpose: 'wallet_security_verification',
          userId: user.id,
          transactionType: transactionDetails.type,
          amount: transactionDetails.amount
        }
      });

      if (error) {
        console.error('SMS OTP error:', error);
        toast.error('Failed to send verification code');
        return;
      }

      if (data?.success) {
        toast.success(`Verification code sent to ***${profile.phone.slice(-4)}`);
      } else {
        toast.error(data?.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send verification code');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transaction Summary */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h3 className="font-medium">Transaction Details</h3>
          <div className="space-y-1 text-sm">
            <p><strong>Type:</strong> {transactionDetails.type}</p>
            <p><strong>Amount:</strong> {transactionDetails.amount.toLocaleString()} {transactionDetails.currency}</p>
            {transactionDetails.destination && (
              <p><strong>To:</strong> {transactionDetails.destination}</p>
            )}
            {transactionDetails.recipient && (
              <p><strong>Recipient:</strong> {transactionDetails.recipient}</p>
            )}
          </div>
        </div>

        {/* Security Warning */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please verify your identity to complete this transaction. Do not share your OTP or PIN with anyone.
          </AlertDescription>
        </Alert>

        {/* OTP Input */}
        {requiresOTP && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              One-Time Password (OTP)
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="flex-1"
              />
              <Button variant="outline" onClick={sendOTP} size="sm">
                Send OTP
              </Button>
            </div>
          </div>
        )}

        {/* PIN Input */}
        {requiresPIN && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Transaction PIN
            </Label>
            <Input
              type="password"
              placeholder="Enter your 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={4}
            />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
            {loading ? 'Verifying...' : 'Confirm Transaction'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedSecurityConfirmation;
