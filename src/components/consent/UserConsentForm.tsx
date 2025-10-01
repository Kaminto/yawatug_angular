import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ConsentDocumentPreview from './ConsentDocumentPreview';

interface UserConsentFormProps {
  consentData: {
    club_allocation_id: string;
    member_name: string;
    email: string;
    phone?: string;
    allocated_shares: number;
    debt_amount_settled: number;
    transfer_fee_paid: number;
    cost_per_share: number;
    total_cost: number;
  };
  onSubmit: (data: {
    allocation_id: string;
    consent_status: 'accept' | 'reject';
    rejection_reason?: string;
    digital_signature?: string;
  }) => Promise<void>;
  loading?: boolean;
}

const UserConsentForm: React.FC<UserConsentFormProps> = ({
  consentData,
  onSubmit,
  loading = false
}) => {
  const [consentDecision, setConsentDecision] = useState<'accept' | 'reject' | ''>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');
  const [showDocument, setShowDocument] = useState(false);

  const handleSubmit = async () => {
    if (!consentDecision) {
      toast({
        title: "Decision Required",
        description: "Please select whether you accept or reject this allocation.",
        variant: "destructive"
      });
      return;
    }

    if (consentDecision === 'reject' && !rejectionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting this allocation.",
        variant: "destructive"
      });
      return;
    }

    if (consentDecision === 'accept' && !digitalSignature.trim()) {
      toast({
        title: "Digital Signature Required",
        description: "Please provide your digital signature to accept this allocation.",
        variant: "destructive"
      });
      return;
    }

    try {
      await onSubmit({
        allocation_id: consentData.club_allocation_id,
        consent_status: consentDecision,
        rejection_reason: consentDecision === 'reject' ? rejectionReason : undefined,
        digital_signature: consentDecision === 'accept' ? digitalSignature : undefined
      });
    } catch (error) {
      console.error('Error submitting consent:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit your consent decision. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Investment Club Share Allocation Consent
          </CardTitle>
          <p className="text-muted-foreground">
            Please review the details below and provide your consent decision
          </p>
        </CardHeader>
      </Card>

      {/* Allocation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Allocation Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Member Name</Label>
              <p className="text-lg font-semibold">{consentData.member_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <p className="text-lg">{consentData.email}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Allocated Shares</Label>
              <p className="text-lg font-semibold text-primary">
                {consentData.allocated_shares.toLocaleString()} shares
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Cost Per Share</Label>
              <p className="text-lg">UGX {consentData.cost_per_share.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Debt Amount Settled</Label>
              <p className="text-lg">UGX {consentData.debt_amount_settled.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Transfer Fee Paid</Label>
              <p className="text-lg">UGX {consentData.transfer_fee_paid.toLocaleString()}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowDocument(!showDocument)}
              className="w-full"
            >
              {showDocument ? 'Hide' : 'View'} Debt Settlement Agreement Document
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document Preview */}
      {showDocument && (
        <Card>
          <CardContent className="p-0">
            <ConsentDocumentPreview memberData={consentData} />
          </CardContent>
        </Card>
      )}

      {/* Consent Decision */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Your Consent Decision
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={consentDecision}
            onValueChange={(value) => setConsentDecision(value as 'accept' | 'reject')}
            className="space-y-4"
          >
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-green-50">
              <RadioGroupItem value="accept" id="accept" />
              <Label htmlFor="accept" className="flex items-center gap-2 cursor-pointer flex-1">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Accept Allocation</p>
                  <p className="text-sm text-muted-foreground">
                    I accept the share allocation as outlined in the agreement
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-red-50">
              <RadioGroupItem value="reject" id="reject" />
              <Label htmlFor="reject" className="flex items-center gap-2 cursor-pointer flex-1">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">Reject Allocation</p>
                  <p className="text-sm text-muted-foreground">
                    I do not accept this share allocation
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Rejection Reason */}
          {consentDecision === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason" className="text-sm font-medium">
                Reason for Rejection *
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a detailed reason for rejecting this allocation..."
                className="min-h-[100px]"
              />
            </div>
          )}

          {/* Digital Signature */}
          {consentDecision === 'accept' && (
            <div className="space-y-2">
              <Label htmlFor="digital-signature" className="text-sm font-medium">
                Digital Signature *
              </Label>
              <Input
                id="digital-signature"
                value={digitalSignature}
                onChange={(e) => setDigitalSignature(e.target.value)}
                placeholder="Type your full name as digital signature"
              />
              <p className="text-xs text-muted-foreground">
                By typing your name, you agree to the terms and conditions of this allocation
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading || !consentDecision}
              className="w-full"
              size="lg"
            >
              {loading 
                ? 'Processing...' 
                : consentDecision === 'accept' 
                  ? 'Accept & Submit Consent' 
                  : consentDecision === 'reject'
                    ? 'Submit Rejection'
                    : 'Make Your Decision Above'
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserConsentForm;