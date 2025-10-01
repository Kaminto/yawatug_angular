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
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, CheckCircle, AlertTriangle, User, Wallet, Shield, MessageSquare, XCircle } from 'lucide-react';
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

const EnhancedConsentForm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [consentDecision, setConsentDecision] = useState<'accept' | 'reject' | ''>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

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

  const sendOTP = async () => {
    if (!phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        body: {
          phone: phoneNumber,
          purpose: 'consent_verification'
        }
      });

      if (error) throw error;

      toast.success('OTP code sent to your phone');
      setOtpSent(true);
      setShowOTPDialog(true);
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send OTP code');
    }
  };

  const verifyOTPAndProcess = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code');
      return;
    }

    setProcessing(true);
    try {
      // Verify OTP first
      const { data: otpVerification, error: otpError } = await supabase.functions.invoke('verify-sms-otp', {
        body: {
          phone: phoneNumber,
          otp_code: otpCode
        }
      });

      if (otpError || !otpVerification?.verified) {
        throw new Error('Invalid OTP code');
      }

      // Process consent with database function - update allocation status
      const { error: consentError } = await supabase
        .from('club_share_allocations')
        .update({
          allocation_status: 'accepted',
          consent_signed_at: new Date().toISOString()
        })
        .eq('id', consentData!.club_allocation_id);

      if (consentError) throw consentError;

      // Create user auth account if needed
      const { error: authError } = await supabase.auth.signUp({
        email: consentData!.email,
        password: password,
        options: {
          data: {
            full_name: consentData!.member_name,
            phone: phoneNumber
          },
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (authError && authError.message !== 'User already registered') {
        throw authError;
      }

      toast.success('Consent processed successfully!');
      navigate('/auth');

    } catch (error) {
      console.error('Error processing consent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process consent');
    } finally {
      setProcessing(false);
      setShowOTPDialog(false);
    }
  };

  const handleConsentSubmission = async () => {
    if (!consentData || !consentDecision) {
      toast.error('Please make a consent decision');
      return;
    }

    if (consentDecision === 'reject') {
      if (!rejectionReason.trim()) {
        toast.error('Please provide a reason for rejection');
        return;
      }
      await processRejection();
      return;
    }

    // For acceptance
    if (!consentGiven || !digitalSignature.trim() || !password || password !== confirmPassword) {
      toast.error('Please complete all required fields and confirm your password matches');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    await sendOTP();
  };

  const processRejection = async () => {
    setProcessing(true);
    try {
      // Get current rejection count
      const { data: currentAllocation, error: fetchError } = await supabase
        .from('club_share_allocations')
        .select('rejection_count')
        .eq('id', consentData!.club_allocation_id)
        .single();

      if (fetchError) throw fetchError;

      // Update allocation status to rejected
      const { error } = await supabase
        .from('club_share_allocations')
        .update({
          allocation_status: 'rejected',
          rejection_reason: rejectionReason,
          last_rejection_at: new Date().toISOString(),
          rejection_count: (currentAllocation.rejection_count || 0) + 1
        })
        .eq('id', consentData!.club_allocation_id);

      if (error) throw error;

      toast.success('Consent rejection recorded. The admin will review your case.');
      navigate('/');

    } catch (error) {
      console.error('Error processing rejection:', error);
      toast.error('Failed to process rejection');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spinner rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!consentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This invitation link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Investment Club Share Allocation Consent</CardTitle>
            <CardDescription>
              Please review and provide your consent for the share allocation
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Allocation Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Allocation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {consentData.allocated_shares.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Allocated Shares</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(consentData.debt_amount)}
                </div>
                <div className="text-sm text-muted-foreground">Debt Amount Settled</div>
              </div>
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {consentData.member_name}
                </div>
                <div className="text-sm text-muted-foreground">Member Name</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              What Happens Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Consent Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    Sign digitally and verify your phone number with OTP
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Account Creation</h4>
                  <p className="text-sm text-muted-foreground">
                    Your user account will be created with the provided credentials
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Share Allocation</h4>
                  <p className="text-sm text-muted-foreground">
                    Your shares will be moved to "pending" status awaiting batch release
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <h4 className="font-medium">Investment Club Share Allocation Agreement</h4>
              <ul className="space-y-1 text-muted-foreground list-disc ml-4">
                <li>I acknowledge receipt of {consentData.allocated_shares.toLocaleString()} company shares</li>
                <li>I understand these shares are allocated based on my debt conversion of {formatCurrency(consentData.debt_amount)}</li>
                <li>I agree that allocated shares will initially be held in a controlled account</li>
                <li>I understand shares will be released to my personal account in batches as determined by management</li>
                <li>I agree to the terms governing share trading, dividends, and corporate actions</li>
                <li>I understand this allocation is final and binding upon my consent</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Consent Decision */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Make Your Decision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={consentDecision} onValueChange={(value) => setConsentDecision(value as 'accept' | 'reject')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="accept" id="accept" />
                <Label htmlFor="accept" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  I accept this share allocation
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reject" id="reject" />
                <Label htmlFor="reject" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  I reject this share allocation
                </Label>
              </div>
            </RadioGroup>

            {consentDecision === 'reject' && (
              <div className="space-y-4 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                <Label htmlFor="rejection_reason">Reason for Rejection *</Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why you are rejecting this allocation..."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Your rejection will be reviewed by admin who may adjust the allocation or keep it as rejected based on your reason.
                </p>
              </div>
            )}

            {consentDecision === 'accept' && (
              <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+256700000000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Required for OTP verification
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="signature">Digital Signature *</Label>
                    <Input
                      id="signature"
                      value={digitalSignature}
                      onChange={(e) => setDigitalSignature(e.target.value)}
                      placeholder="Type your full name as signature"
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Create Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm-password">Confirm Password *</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="consent"
                    checked={consentGiven}
                    onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                  />
                  <Label htmlFor="consent" className="text-sm">
                    I have read, understood, and agree to the terms and conditions above. 
                    I provide my consent to this share allocation.
                  </Label>
                </div>
              </div>
            )}

            <Button 
              onClick={handleConsentSubmission}
              disabled={!consentDecision || processing || 
                (consentDecision === 'accept' && (!consentGiven || !digitalSignature.trim() || !password || password !== confirmPassword)) ||
                (consentDecision === 'reject' && !rejectionReason.trim())}
              className="w-full"
              size="lg"
              variant={consentDecision === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : (
                consentDecision === 'accept' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept & Verify Phone
                  </>
                ) : consentDecision === 'reject' ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Submit Rejection
                  </>
                ) : 'Select Decision'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* OTP Verification Dialog */}
        <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Phone Verification</DialogTitle>
              <DialogDescription>
                Enter the 6-digit OTP code sent to {phoneNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowOTPDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={verifyOTPAndProcess}
                  disabled={processing || otpCode.length !== 6}
                  className="flex-1"
                >
                  {processing ? 'Processing...' : 'Verify & Complete'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EnhancedConsentForm;