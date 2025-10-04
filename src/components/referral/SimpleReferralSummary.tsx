import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Gift, Clock, CheckCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useReferralCommissions } from '@/hooks/useReferralCommissions';
import { useReferralCredits } from '@/hooks/useReferralCredits';
import ReferralCreditsCard from './ReferralCreditsCard';
import GrandDrawCard from './GrandDrawCard';
import ConvertCreditsDialog from './ConvertCreditsDialog';
import EnterDrawDialog from './EnterDrawDialog';
import { useGrandDraw } from '@/hooks/useGrandDraw';
import ReferralTierProgress from './ReferralTierProgress';
import ReferralEligibilityCountdown from './ReferralEligibilityCountdown';

interface ReferralSummary {
  totalReferrals: number;
  successfulReferrals: number;
  rank: number;
  referralCode: string;
}

interface SimpleReferralSummaryProps {
  userId: string;
}

const SimpleReferralSummary: React.FC<SimpleReferralSummaryProps> = ({ userId }) => {
  const { enhancedEarnings, loading, commissions } = useReferralCommissions(userId);
  const { credits } = useReferralCredits(userId);
  const { currentDraw, enterDraw } = useGrandDraw(userId);
  const [summary, setSummary] = useState<ReferralSummary>({
    totalReferrals: 0,
    successfulReferrals: 0,
    rank: 0,
    referralCode: ''
  });
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [userKycCompletion, setUserKycCompletion] = useState(0);

  useEffect(() => {
    loadReferralSummary();
    loadUserKycCompletion();
  }, [userId]);

  const loadUserKycCompletion = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('profile_completion_percentage')
        .eq('id', userId)
        .single();
      
      if (data) {
        setUserKycCompletion(data.profile_completion_percentage || 0);
      }
    } catch (error) {
      console.error('Error loading KYC completion:', error);
    }
  };

  const loadReferralSummary = async () => {
    try {
      // Get user profile with referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code, full_name')
        .eq('id', userId)
        .single();

      // Get total referrals count
      const { data: referrals } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('referred_by', userId);

      // Calculate rank using optimized database view
      const { data: rankData } = await supabase
        .from('referrer_rankings')
        .select('rank')
        .eq('referrer_id', userId)
        .single();
      
      const rank = rankData?.rank || 0;

      setSummary({
        totalReferrals: referrals?.length || 0,
        successfulReferrals: commissions.filter(c => c.status === 'paid').length,
        rank: rank,
        referralCode: profile?.referral_code || ''
      });

    } catch (error) {
      console.error('Error loading referral summary:', error);
      toast.error('Failed to load referral data');
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(summary.referralCode);
    toast.success('Referral code copied!');
  };

  const shareReferralLink = async () => {
    const baseUrl = window.location.origin;
    const referralUrl = `${baseUrl}/express-registration?ref=${summary.referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Yawatu Minerals & Mining',
          text: `Join me on Yawatu and start investing in mining shares! Use my referral code: ${summary.referralCode}`,
          url: referralUrl,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        // User cancelled or share failed
        navigator.clipboard.writeText(referralUrl);
        toast.success('Referral link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(referralUrl);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const handleDrawEntry = async (stakeAmount: number) => {
    try {
      await enterDraw(stakeAmount);
      toast.success(`Successfully entered draw with ${stakeAmount} credits!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to enter draw');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Share Referral Link */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input 
              value={summary.referralCode} 
              readOnly 
              className="font-mono text-base font-bold"
            />
            <Button onClick={copyReferralCode} size="icon" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={shareReferralLink} size="icon" className="bg-primary">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Earn 5% commission on all referral activities
          </p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="referrals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="referrals">My Referrals</TabsTrigger>
          <TabsTrigger value="credits">Credits & Draw</TabsTrigger>
        </TabsList>

        {/* My Referrals Tab with Sub-tabs */}
        <TabsContent value="referrals" className="space-y-4 mt-6">
          <Tabs defaultValue="earned" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="earned">Earned Commission</TabsTrigger>
              <TabsTrigger value="expected">Expected Commission</TabsTrigger>
            </TabsList>

            {/* Earned Commission Sub-tab */}
            <TabsContent value="earned" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Earned & In Wallet
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      UGX {enhancedEarnings.totalEarned.toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {commissions.filter(c => c.status === 'paid').length > 0 ? (
                    <div className="space-y-2">
                      {commissions.filter(c => c.status === 'paid').map((commission) => (
                        <div key={commission.id} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{commission.referred_profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(commission.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-green-600">
                              +UGX {commission.commission_amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No earned commissions yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expected Commission Sub-tab */}
            <TabsContent value="expected" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      Expected (Pending)
                    </span>
                    <span className="text-2xl font-bold text-orange-600">
                      UGX {enhancedEarnings.totalExpected.toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {commissions.filter(c => c.status === 'pending').length > 0 ? (
                    <div className="space-y-2">
                      {commissions.filter(c => c.status === 'pending').map((commission) => (
                        <div key={commission.id} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{commission.referred_profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(commission.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-orange-600">
                              +UGX {commission.commission_amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No pending commissions</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Credits & Draw Tab - Simplified */}
        <TabsContent value="credits" className="space-y-4 mt-6">
          {/* Eligibility Countdown */}
          <ReferralEligibilityCountdown userId={userId} />
          
          <div className="grid grid-cols-1 gap-4">
            <ReferralCreditsCard 
              userId={userId}
              onConvert={() => setShowConvertDialog(true)}
              onEnterDraw={() => setShowDrawDialog(true)}
            />
            <GrandDrawCard 
              userId={userId}
              availableCredits={credits?.available_credits || 0}
            />
            <ReferralTierProgress userId={userId} userKycCompletion={userKycCompletion} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ConvertCreditsDialog
        open={showConvertDialog}
        onOpenChange={setShowConvertDialog}
        availableCredits={credits?.available_credits || 0}
        onSuccess={() => window.location.reload()}
      />

      {currentDraw && (
        <EnterDrawDialog
          open={showDrawDialog}
          onOpenChange={setShowDrawDialog}
          availableCredits={credits?.available_credits || 0}
          currentDrawName={currentDraw.draw_name}
          onEnter={handleDrawEntry}
        />
      )}
    </div>
  );
};

export default SimpleReferralSummary;