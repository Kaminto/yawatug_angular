import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, CheckCircle, AlertTriangle, User, XCircle, MessageSquare } from 'lucide-react';
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
  allocation_status: string;
  is_valid: boolean;
}

const ConsentAcceptanceForm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [consentDecision, setConsentDecision] = useState<'accept' | 'reject' | ''>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      // Check if this is a valid consent invitation token - use allocation ID directly
      const { data, error } = await supabase
        .from('club_share_allocations')
        .select(`
          id,
          club_member_id,
          allocated_shares,
          debt_amount_settled,
          allocation_status,
          consent_deadline,
          investment_club_members (
            member_name,
            email,
            phone
          )
        `)
        .eq('id', token)
        .single();

      if (error) throw error;

      if (data) {
        // Check if deadline has passed
        const now = new Date();
        const deadline = new Date(data.consent_deadline);
        
        if (now > deadline && data.allocation_status === 'invited') {
          toast.error('This invitation has expired');
          navigate('/');
          return;
        }

        // Check if already processed
        if (data.allocation_status === 'accepted') {
          toast.info('This consent has already been accepted');
          navigate('/auth');
          return;
        }

        if (data.allocation_status === 'rejected') {
          toast.info('This consent has been rejected');
          navigate('/');
          return;
        }

        setConsentData({
          invitation_id: data.id,
          club_allocation_id: data.id,
          club_member_id: data.club_member_id,
          email: data.investment_club_members.email,
          phone: data.investment_club_members.phone || '',
          member_name: data.investment_club_members.member_name,
          allocated_shares: data.allocated_shares,
          debt_amount: data.debt_amount_settled,
          allocation_status: data.allocation_status,
          is_valid: true
        });
        setPhoneNumber(data.investment_club_members.phone || '');
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
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber: phoneNumber,
          message: `Your Yawatu consent verification OTP: ${Math.floor(100000 + Math.random() * 900000)}`
        }
      });

      if (error) throw error;

      toast.success('OTP code sent to your phone');
      setShowOTPDialog(true);
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error('Failed to send OTP code');
    }
  };

  const processConsentDecision = async () => {
    if (!consentData || !consentDecision) {
      toast.error('Please make a consent decision');
      return;
    }

    if (consentDecision === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (consentDecision === 'accept' && (!digitalSignature.trim() || !password || password !== confirmPassword)) {
      toast.error('Please complete all required fields for acceptance');
      return;
    }

    setProcessing(true);
    try {
      if (consentDecision === 'accept') {
        // For acceptance, we need OTP verification
        await sendOTP();
      } else {
        // For rejection, update directly
        const { data: currentAllocation, error: fetchError } = await supabase
          .from('club_share_allocations')
          .select('rejection_count')
          .eq('id', consentData.club_allocation_id)
          .single();

        if (fetchError) throw fetchError;

        const { error } = await supabase
          .from('club_share_allocations')
          .update({
            allocation_status: 'rejected',
            rejection_reason: rejectionReason,
            last_rejection_at: new Date().toISOString(),
            rejection_count: (currentAllocation.rejection_count || 0) + 1
          })
          .eq('id', consentData.club_allocation_id);

        if (error) throw error;

        toast.success('Consent rejection recorded');
        navigate('/');
      }
    } catch (error) {
      console.error('Error processing consent:', error);
      toast.error('Failed to process consent decision');
    } finally {
      setProcessing(false);
    }
  };

  const verifyOTPAndAccept = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code');
      return;
    }

    setProcessing(true);
    try {
      // Update allocation status to accepted
      const { error: consentError } = await supabase
        .from('club_share_allocations')
        .update({
          allocation_status: 'accepted',
          consent_signed_at: new Date().toISOString()
        })
        .eq('id', consentData!.club_allocation_id);

      if (consentError) throw consentError;

      // Create auth account
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

      toast.success('Consent accepted successfully!');
      navigate('/auth');

    } catch (error) {
      console.error('Error processing acceptance:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process acceptance');
    } finally {
      setProcessing(false);
      setShowOTPDialog(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              Please review and make your decision on the share allocation
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

                <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                  <h4 className="font-medium">By accepting, you agree to:</h4>
                  <ul className="space-y-1 text-muted-foreground list-disc ml-4">
                    <li>Receive {consentData.allocated_shares.toLocaleString()} company shares</li>
                    <li>Share conversion based on debt settlement of {formatCurrency(consentData.debt_amount)}</li>
                    <li>Shares will be held in controlled account initially</li>
                    <li>Shares released in batches as determined by management</li>
                    <li>All terms governing share trading and corporate actions</li>
                  </ul>
                </div>
              </div>
            )}

            <Button 
              onClick={processConsentDecision}
              disabled={!consentDecision || processing}
              className="w-full"
              size="lg"
              variant={consentDecision === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : (
                consentDecision === 'accept' ? 'Accept & Verify Phone' : 'Submit Rejection'
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
                  onClick={verifyOTPAndAccept}
                  disabled={processing || otpCode.length !== 6}
                  className="flex-1"
                >
                  {processing ? 'Processing...' : 'Verify & Accept'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ConsentAcceptanceForm;