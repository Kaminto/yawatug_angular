import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, Clock, Gift, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReferralTierProgressProps {
  userId: string;
  userKycCompletion: number;
}

interface TierSettings {
  level: number;
  level_name: string;
  reward_type: string;
  shares_per_credit_trigger?: number;
  kyc_completion_required: number;
  eligibility_days: number;
  is_active: boolean;
}

interface TierProgress {
  currentTier: number;
  nextTier: number;
  totalSharesReferred: number;
  creditsEarned: number;
  progressPercentage: number;
  daysRemaining: number;
  meetsKycRequirement: boolean;
}

const ReferralTierProgress: React.FC<ReferralTierProgressProps> = ({ userId, userKycCompletion }) => {
  const [tier2Settings, setTier2Settings] = useState<TierSettings | null>(null);
  const [progress, setProgress] = useState<TierProgress>({
    currentTier: 1,
    nextTier: 2,
    totalSharesReferred: 0,
    creditsEarned: 0,
    progressPercentage: 0,
    daysRemaining: 0,
    meetsKycRequirement: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTierProgress();
  }, [userId, userKycCompletion]);

  const loadTierProgress = async () => {
    try {
      setLoading(true);

      // Get tier 2 settings
      const { data: tierData } = await supabase
        .from('referral_tier_settings')
        .select('*')
        .eq('level', 2)
        .eq('is_active', true)
        .single();

      if (tierData) {
        setTier2Settings(tierData);

        // Calculate eligibility cutoff
        const eligibilityCutoff = new Date();
        eligibilityCutoff.setDate(eligibilityCutoff.getDate() - tierData.eligibility_days);

        // Get referred user IDs
        const { data: referredProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('referred_by', userId);

        const referredUserIds = referredProfiles?.map(p => p.id) || [];

        if (referredUserIds.length === 0) {
          setProgress({
            currentTier: 1,
            nextTier: 2,
            totalSharesReferred: 0,
            creditsEarned: 0,
            progressPercentage: 0,
            daysRemaining: tierData.eligibility_days,
            meetsKycRequirement: userKycCompletion >= tierData.kyc_completion_required
          });
          return;
        }

        // Get total shares purchased by referred users using share_transactions
        const { data: shareTransactions } = await supabase
          .from('share_transactions')
          .select('quantity, created_at')
          .in('user_id', referredUserIds)
          .eq('transaction_type', 'purchase')
          .eq('status', 'completed')
          .gte('created_at', eligibilityCutoff.toISOString());

        const totalShares = shareTransactions?.reduce((sum, t) => sum + (t.quantity || 0), 0) || 0;

        // Get current credits
        const { data: creditsData } = await supabase
          .from('referral_credits')
          .select('total_credits')
          .eq('user_id', userId)
          .single();

        const creditsEarned = creditsData?.total_credits || 0;

        // Calculate progress
        const sharesNeeded = tierData.shares_per_credit_trigger || 100;
        const progressPct = (totalShares % sharesNeeded) / sharesNeeded * 100;

        // Calculate days remaining
        const firstReferralDate = new Date();
        firstReferralDate.setDate(firstReferralDate.getDate() - tierData.eligibility_days);
        const daysRemaining = tierData.eligibility_days - Math.floor((Date.now() - firstReferralDate.getTime()) / (1000 * 60 * 60 * 24));

        setProgress({
          currentTier: 1,
          nextTier: 2,
          totalSharesReferred: totalShares,
          creditsEarned,
          progressPercentage: Math.min(progressPct, 100),
          daysRemaining: Math.max(0, daysRemaining),
          meetsKycRequirement: userKycCompletion >= tierData.kyc_completion_required
        });
      }
    } catch (error) {
      console.error('Error loading tier progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tier2Settings || !tier2Settings.is_active) {
    return null;
  }

  const sharesNeededForNextCredit = tier2Settings.shares_per_credit_trigger || 100;
  const currentProgress = progress.totalSharesReferred % sharesNeededForNextCredit;
  const sharesRemaining = sharesNeededForNextCredit - currentProgress;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Tier 2: Credit Rewards Progress
          <Badge variant="outline" className="ml-auto">
            {tier2Settings.level_name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KYC Warning */}
        {!progress.meetsKycRequirement && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Complete your profile to {tier2Settings.kyc_completion_required}% to qualify for credit rewards. 
              Currently at {userKycCompletion.toFixed(0)}%.
            </AlertDescription>
          </Alert>
        )}

        {/* Credits Earned */}
        <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-600" />
            <span className="font-medium">Credits Earned</span>
          </div>
          <span className="text-2xl font-bold text-green-600">{progress.creditsEarned}</span>
        </div>

        {/* Progress to Next Credit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Progress to Next Credit
            </span>
            <span className="text-muted-foreground">
              {currentProgress} / {sharesNeededForNextCredit} shares
            </span>
          </div>
          <Progress value={progress.progressPercentage} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {sharesRemaining} more shares from referrals needed for your next credit
          </p>
        </div>

        {/* Total Shares Referred */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-background/50 rounded-lg">
            <p className="text-muted-foreground mb-1">Total Shares Referred</p>
            <p className="text-xl font-bold">{progress.totalSharesReferred}</p>
          </div>
          <div className="p-3 bg-background/50 rounded-lg">
            <p className="text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Eligibility Window
            </p>
            <p className="text-xl font-bold">{tier2Settings.eligibility_days} days</p>
          </div>
        </div>

        {/* Info */}
        <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
          <p>• Earn 1 credit for every {sharesNeededForNextCredit} shares your referrals purchase</p>
          <p>• Credits can be converted to shares or staked in Grand Draws</p>
          <p>• Only purchases within the last {tier2Settings.eligibility_days} days count</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralTierProgress;
