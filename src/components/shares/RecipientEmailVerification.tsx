import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

interface RecipientEmailVerificationProps {
  email: string;
  onEmailChange: (email: string) => void;
  onRecipientVerified: (recipient: { id: string; full_name: string; email: string } | null) => void;
}

const RecipientEmailVerification: React.FC<RecipientEmailVerificationProps> = ({
  email,
  onEmailChange,
  onRecipientVerified
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: 'success' | 'error' | 'pending' | null;
    message: string;
    recipient?: { id: string; full_name: string; email: string };
  }>({ status: null, message: '' });

  useEffect(() => {
    if (email && email.includes('@')) {
      verifyRecipientEmail();
    } else {
      setVerificationResult({ status: null, message: '' });
      onRecipientVerified(null);
    }
  }, [email]);

  const verifyRecipientEmail = async () => {
    if (!email || !email.includes('@')) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (error || !data) {
        setVerificationResult({
          status: 'error',
          message: 'User not found with this email address'
        });
        onRecipientVerified(null);
      } else {
        setVerificationResult({
          status: 'success',
          message: `Recipient found: ${data.full_name}`,
          recipient: data
        });
        onRecipientVerified(data);
      }
    } catch (error) {
      console.error('Error verifying recipient:', error);
      setVerificationResult({
        status: 'error',
        message: 'Error verifying recipient email'
      });
      onRecipientVerified(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = () => {
    if (isVerifying) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (verificationResult.status === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (verificationResult.status === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Mail className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusColor = () => {
    if (verificationResult.status === 'success') return 'text-green-600 bg-green-50 border-green-200';
    if (verificationResult.status === 'error') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-2">
      <Label>Recipient Email</Label>
      <div className="relative">
        <Input
          type="email"
          placeholder="Enter recipient's email address"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className={verificationResult.status === 'success' ? 'border-green-300' : 
                     verificationResult.status === 'error' ? 'border-red-300' : ''}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {getStatusIcon()}
        </div>
      </div>
      
      {verificationResult.message && (
        <Alert className={getStatusColor()}>
          <AlertDescription className="text-sm">
            {verificationResult.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default RecipientEmailVerification;