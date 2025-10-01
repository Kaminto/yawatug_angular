import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import UserConsentForm from './UserConsentForm';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

interface ConsentData {
  club_allocation_id: string;
  club_member_id: string;
  phone: string;
  member_name: string;
  email: string;
  allocated_shares: number;
  debt_amount_settled: number;
  transfer_fee_paid: number;
  total_cost: number;
  cost_per_share: number;
  debt_rejected: number;
  is_valid: boolean;
}

const FormalConsentForm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (token) {
      fetchConsentData();
    }
  }, [token]);

  const fetchConsentData = async () => {
    try {
      const { data: allocation, error } = await supabase
        .from('club_share_allocations')
        .select(`
          *,
          investment_club_members(*)
        `)
        .eq('id', token)
        .single();

      if (error) throw error;

      if (allocation && allocation.investment_club_members) {
        const member = allocation.investment_club_members;
        setConsentData({
          club_allocation_id: allocation.id,
          club_member_id: allocation.club_member_id,
          phone: member.phone || '',
          member_name: member.member_name,
          email: member.email || '',
          allocated_shares: allocation.allocated_shares,
          debt_amount_settled: allocation.debt_amount_settled || 0,
          transfer_fee_paid: allocation.transfer_fee_paid || 0,
          total_cost: allocation.total_cost || 0,
          cost_per_share: allocation.cost_per_share || 0,
          debt_rejected: allocation.debt_rejected || 0,
          is_valid: true
        });
      } else {
        setConsentData({ ...consentData, is_valid: false } as ConsentData);
      }
    } catch (error) {
      console.error('Error fetching consent data:', error);
      setConsentData({ ...consentData, is_valid: false } as ConsentData);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentSubmit = async (formData: {
    allocation_id: string;
    consent_status: 'accept' | 'reject';
    rejection_reason?: string;
    digital_signature?: string;
  }) => {
    setProcessing(true);
    try {
      if (formData.consent_status === 'accept') {
        await supabase
          .from('club_share_allocations')
          .update({
            allocation_status: 'accepted',
            consent_signed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.allocation_id);

        await supabase
          .from('club_share_holding_accounts')
          .insert({
            club_member_id: consentData!.club_member_id,
            club_allocation_id: formData.allocation_id,
            shares_quantity: consentData!.allocated_shares,
            shares_released: 0,
            shares_remaining: consentData!.allocated_shares,
            status: 'holding'
          });

        await sendConsentConfirmationEmail();
      } else {
        await supabase
          .from('club_share_allocations')
          .update({
            allocation_status: 'rejected',
            rejection_reason: formData.rejection_reason,
            rejection_count: 1,
            last_rejection_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.allocation_id);
      }

      toast({
        title: "Consent Processed",
        description: formData.consent_status === 'accept' 
          ? "Your consent has been recorded. Shares have been moved to holding account."
          : "Your rejection has been recorded. Thank you for your response.",
      });

      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Error processing consent:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to process your consent. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const sendConsentConfirmationEmail = async () => {
    try {
      await supabase.functions.invoke('unified-communication-sender', {
        body: {
          recipient: consentData!.email,
          subject: 'Investment Club Share Consent Confirmation',
          message: `Dear ${consentData!.member_name}, your consent for ${consentData!.allocated_shares} shares has been confirmed.`,
          channel: 'email',
          templateType: 'consent_confirmation',
          templateData: {
            member_name: consentData!.member_name,
            allocated_shares: consentData!.allocated_shares,
            debt_amount_settled: consentData!.debt_amount_settled
          }
        }
      });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>;
  }

  if (!consentData || !consentData.is_valid) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center py-8">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Invalid Consent Link</h2>
          <p className="text-muted-foreground mb-4">
            This consent link is invalid or has expired.
          </p>
          <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserConsentForm
        consentData={consentData}
        onSubmit={handleConsentSubmit}
        loading={processing}
      />
    </div>
  );
};

export default FormalConsentForm;