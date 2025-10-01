import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, AlertTriangle, User, Wallet, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ConsentData {
  invitation_id: string;
  club_allocation_id: string;
  club_member_id: string;
  email: string;
  phone: string;
  member_name: string;
  allocated_shares: number;
  debt_amount: number;
  is_valid: boolean;
}

const ConsentForm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      const { data, error } = await supabase
        .rpc('validate_consent_invitation', { p_token: token });

      if (error) throw error;

      if (data && data.length > 0) {
        const invitationData = data[0];
        if (invitationData.is_valid) {
          // Fetch allocation details
          const { data: allocationData, error: allocationError } = await supabase
            .from('club_share_allocations')
            .select(`
              *,
              investment_club_members (
                id,
                member_name,
                email,
                phone
              )
            `)
            .eq('id', invitationData.club_allocation_id)
            .single();

          if (allocationError) throw allocationError;

          setConsentData({
            ...invitationData,
            member_name: allocationData.investment_club_members.member_name,
            allocated_shares: allocationData.allocated_shares,
            debt_amount: allocationData.debt_amount_settled
          });
          setPhoneNumber(invitationData.phone || '');
        } else {
          toast.error('This invitation has expired or is invalid');
          navigate('/');
        }
      } else {
        toast.error('Invalid invitation token');
        navigate('/');
      }
    } catch (error) {
      console.error('Error validating invitation:', error);
      toast.error('Failed to validate invitation');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentSubmission = async () => {
    if (!consentData || !consentGiven || !digitalSignature.trim() || !password || password !== confirmPassword) {
      toast.error('Please complete all required fields and confirm your password matches');
      return;
    }

    setProcessing(true);
    try {
      const consentText = `I, ${digitalSignature}, hereby consent to the allocation of ${consentData.allocated_shares} shares as settlement for debt amount of UGX ${consentData.debt_amount.toLocaleString()}. I understand that these shares will be held in a holding account and released in phases by the administrator. I agree to the terms and conditions of this share allocation.`;

      // Process consent acceptance
      const { data: profileId, error: consentError } = await supabase
        .rpc('process_consent_acceptance', {
          p_invitation_token: token,
          p_digital_signature: digitalSignature,
          p_consent_text: consentText,
          p_ip_address: window.location.hostname,
          p_user_agent: navigator.userAgent
        });

      if (consentError) throw consentError;

      // Create auth account for the user
      const { error: signUpError } = await supabase.auth.signUp({
        email: consentData.email,
        password: password,
        options: {
          data: {
            full_name: consentData.member_name,
            phone: phoneNumber
          }
        }
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        throw signUpError;
      }

      toast.success('Consent processed successfully! Your shares are now in the holding account. Please check your email for login instructions.');
      
      // Redirect to login page after a delay
      setTimeout(() => {
        navigate('/auth');
      }, 3000);

    } catch (error: any) {
      console.error('Error processing consent:', error);
      toast.error(`Failed to process consent: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="animate-pulse text-center">
          <div className="h-8 w-64 bg-muted rounded mx-auto mb-4"></div>
          <div className="h-4 w-48 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!consentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This consent invitation is invalid or has expired.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Share Allocation Consent</CardTitle>
            <CardDescription>
              Yawatu Minerals & Mining PLC - Electronic Consent Form
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Allocation Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Allocation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Member Name</Label>
                <p className="text-lg font-semibold">{consentData.member_name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                <p className="text-lg">{consentData.email}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Allocated Shares</Label>
                <p className="text-lg font-semibold text-green-600">
                  {consentData.allocated_shares.toLocaleString()} shares
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Debt Settlement Amount</Label>
                <p className="text-lg font-semibold text-blue-600">
                  UGX {consentData.debt_amount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Overview */}
        <Card>
          <CardHeader>
            <CardTitle>What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold">Profile Creation</h3>
                <p className="text-sm text-muted-foreground">
                  Your investor profile and account will be automatically created
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold">Wallet Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Digital wallets will be created for your transactions
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="mx-auto h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold">Phased Release</h3>
                <p className="text-sm text-muted-foreground">
                  Shares will be released to your portfolio in phases
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consent Form */}
        <Card>
          <CardHeader>
            <CardTitle>Electronic Consent</CardTitle>
            <CardDescription>
              Please provide your consent and create your account credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number (Optional Update)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+256..."
                />
              </div>

              <div>
                <Label htmlFor="password">Create Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  required
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
                )}
              </div>

              <div>
                <Label htmlFor="signature">Digital Signature (Full Name) *</Label>
                <Input
                  id="signature"
                  value={digitalSignature}
                  onChange={(e) => setDigitalSignature(e.target.value)}
                  placeholder="Type your full name as your digital signature"
                  required
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> By providing your digital signature, you are legally consenting to this share allocation. 
                  This action cannot be undone. Your shares will be held securely and released in phases by our administrators.
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consent"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                />
                <Label htmlFor="consent" className="text-sm">
                  I confirm that I have read and understood the terms of this share allocation, 
                  and I hereby provide my electronic consent to proceed with the allocation of{' '}
                  <strong>{consentData.allocated_shares.toLocaleString()} shares</strong> as settlement 
                  for debt amount of <strong>UGX {consentData.debt_amount.toLocaleString()}</strong>.
                </Label>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleConsentSubmission}
                disabled={!consentGiven || !digitalSignature.trim() || !password || password !== confirmPassword || processing}
                className="flex-1"
                size="lg"
              >
                {processing ? 'Processing...' : 'Accept & Create Account'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsentForm;