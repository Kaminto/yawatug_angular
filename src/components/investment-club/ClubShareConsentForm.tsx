import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, XCircle, Clock, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ClubShareAllocation } from '@/interfaces/ClubShareInterfaces';

interface ClubShareConsentFormProps {
  clubMemberId: string;
}

const ClubShareConsentForm: React.FC<ClubShareConsentFormProps> = ({ clubMemberId }) => {
  const [allocation, setAllocation] = useState<ClubShareAllocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    loadAllocation();
  }, [clubMemberId]);

  const loadAllocation = async () => {
    try {
      const { data, error } = await supabase
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
        .eq('club_member_id', clubMemberId)
        .eq('allocation_status', 'pending')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setAllocation(data);
    } catch (error) {
      console.error('Error loading allocation:', error);
      toast.error('Failed to load allocation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptConsent = async () => {
    if (!allocation || !consentGiven) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('club_share_allocations')
        .update({
          allocation_status: 'accepted',
          consent_signed_at: new Date().toISOString()
        })
        .eq('id', allocation.id);

      if (error) throw error;

      // Create holding account entry
      const { error: holdingError } = await supabase
        .from('club_share_holding_account')
        .insert({
          club_member_id: clubMemberId,
          club_allocation_id: allocation.id,
          shares_quantity: allocation.allocated_shares,
          status: 'holding'
        });

      if (holdingError) throw holdingError;

      toast.success('Consent accepted successfully! Your shares are now in the holding account.');
      loadAllocation(); // Reload to show updated status
    } catch (error) {
      console.error('Error accepting consent:', error);
      toast.error('Failed to process consent');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectConsent = async () => {
    if (!allocation || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      // Update allocation status
      const { error: updateError } = await supabase
        .from('club_share_allocations')
        .update({
          allocation_status: 'rejected',
          rejection_reason: rejectionReason,
          rejection_count: allocation.rejection_count + 1,
          last_rejection_at: new Date().toISOString(),
          can_reapply_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
        .eq('id', allocation.id);

      if (updateError) throw updateError;

      // Credit transfer fee back to user wallet (if user has wallet)
      const { data: user } = await supabase.auth.getUser();
      if (user.user && allocation.transfer_fee_paid > 0) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', user.user.id)
          .eq('currency', 'UGX')
          .single();

        if (wallet) {
          // Update wallet balance
          await supabase
            .from('wallets')
            .update({
              balance: wallet.balance + allocation.transfer_fee_paid
            })
            .eq('id', wallet.id);

          // Create transaction record
          await supabase
            .from('transactions')
            .insert({
              user_id: user.user.id,
              wallet_id: wallet.id,
              amount: allocation.transfer_fee_paid,
              transaction_type: 'deposit',
              description: `Refund for rejected club share allocation - ${allocation.investment_club_members?.member_name}`,
              status: 'completed',
              currency: 'UGX'
            });
        }
      }

      // Return shares to reserve pool (update shares table)
      const { data: sharesData } = await supabase
        .from('shares')
        .select('available_shares')
        .single();

      if (sharesData) {
        await supabase
          .from('shares')
          .update({
            available_shares: sharesData.available_shares + allocation.allocated_shares
          })
          .eq('id', '00000000-0000-0000-0000-000000000000'); // Default share ID
      }

      toast.success('Allocation rejected. Transfer fee has been refunded to your wallet.');
      setShowRejectDialog(false);
      loadAllocation();
    } catch (error) {
      console.error('Error rejecting consent:', error);
      toast.error('Failed to process rejection');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading allocation details...</div>
        </CardContent>
      </Card>
    );
  }

  if (!allocation) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Allocations</h3>
            <p className="text-muted-foreground">
              You don't have any pending share allocation consents at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysLeft = getDaysUntilDeadline(allocation.consent_deadline);
  const isExpired = daysLeft <= 0;

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {isExpired && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Consent Deadline Expired</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              The consent deadline has passed. Please contact support for assistance.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Allocation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Share Allocation Consent
          </CardTitle>
          <CardDescription>
            Review your debt-to-share conversion allocation and provide consent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Member Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Member Name</Label>
              <div className="font-medium text-lg">
                {allocation.investment_club_members?.member_name}
              </div>
            </div>
            <div>
              <Label>Contact Information</Label>
              <div className="text-sm">
                <div>{allocation.investment_club_members?.email}</div>
                <div className="text-muted-foreground">
                  {allocation.investment_club_members?.phone}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-semibold mb-3">Allocation Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Allocated Shares</Label>
                <div className="text-2xl font-bold text-primary">
                  {allocation.allocated_shares.toLocaleString()}
                </div>
              </div>
              <div>
                <Label>Transfer Fee Paid</Label>
                <div className="text-lg font-semibold">
                  {formatCurrency(allocation.transfer_fee_paid)}
                </div>
              </div>
              <div>
                <Label>Debt Settled</Label>
                <div className="text-lg font-semibold">
                  {formatCurrency(allocation.debt_amount_settled)}
                </div>
              </div>
            </div>
          </div>

          {/* Deadline Information */}
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <Label>Consent Deadline</Label>
              <div className="font-medium">{formatDate(allocation.consent_deadline)}</div>
              <div className={`text-sm ${daysLeft < 7 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {isExpired ? 'Expired' : `${daysLeft} days remaining`}
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Terms and Conditions</h4>
            <div className="space-y-2 text-sm">
              <p>1. Your allocated shares will be held in a holding account and released in phases.</p>
              <p>2. Share releases are based on market activity and sales volume ratios.</p>
              <p>3. You may track your holding account status through your dashboard.</p>
              <p>4. Transfer fees are non-refundable upon acceptance.</p>
              <p>5. Rejecting this allocation will result in transfer fee refund and share return to pool.</p>
            </div>
          </div>

          {/* Consent Actions */}
          {!isExpired && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consent"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked === true)}
                />
                <Label htmlFor="consent" className="text-sm font-medium">
                  I have read and agree to the terms and conditions above
                </Label>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleAcceptConsent}
                  disabled={!consentGiven || processing}
                  className="flex-1"
                >
                  {processing ? 'Processing...' : 'Accept Allocation'}
                </Button>

                <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="flex-1">
                      Reject Allocation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Share Allocation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Please provide a reason for rejecting this allocation. Your transfer fee will be refunded.
                      </p>
                      <div>
                        <Label htmlFor="rejection-reason">Reason for Rejection</Label>
                        <Textarea
                          id="rejection-reason"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Explain why you're rejecting this allocation..."
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={handleRejectConsent}
                          disabled={processing || !rejectionReason.trim()}
                          className="flex-1"
                        >
                          {processing ? 'Processing...' : 'Confirm Rejection'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowRejectDialog(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClubShareConsentForm;