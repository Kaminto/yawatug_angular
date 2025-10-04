import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/dateFormatter';

interface ReferralEligibilityCountdownProps {
  userId: string;
}

interface EligibilityStatus {
  isEligible: boolean;
  daysRemaining: number | null;
  enrollmentDate: string | null;
  expiryDate: string | null;
  tierSettings: {
    level_name: string;
    eligibility_days: number | null;
  }[];
}

const ReferralEligibilityCountdown: React.FC<ReferralEligibilityCountdownProps> = ({ userId }) => {
  const [eligibility, setEligibility] = useState<EligibilityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEligibilityStatus();
    
    // Refresh countdown every minute
    const interval = setInterval(loadEligibilityStatus, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadEligibilityStatus = async () => {
    try {
      // Get user's enrollment date (created_at from profiles)
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userId)
        .single();

      if (!profile) return;

      // Get active tier settings with eligibility periods
      const { data: tiers } = await supabase
        .from('referral_tier_settings')
        .select('level_name, eligibility_days')
        .eq('is_active', true)
        .not('eligibility_days', 'is', null)
        .order('level', { ascending: true });

      if (!tiers || tiers.length === 0) {
        // No time limits set
        setEligibility({
          isEligible: true,
          daysRemaining: null,
          enrollmentDate: profile.created_at,
          expiryDate: null,
          tierSettings: []
        });
        return;
      }

      // Find the maximum eligibility period from all tiers
      const maxEligibilityDays = Math.max(...tiers.map(t => t.eligibility_days || 0));
      const enrollmentDate = new Date(profile.created_at);
      const expiryDate = new Date(enrollmentDate);
      expiryDate.setDate(expiryDate.getDate() + maxEligibilityDays);

      const now = new Date();
      const timeRemaining = expiryDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));

      setEligibility({
        isEligible: daysRemaining > 0,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        enrollmentDate: profile.created_at,
        expiryDate: expiryDate.toISOString(),
        tierSettings: tiers
      });
    } catch (error) {
      console.error('Error loading eligibility status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!eligibility || eligibility.daysRemaining === null) {
    // No time limits - unlimited eligibility
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>Unlimited Eligibility:</strong> You can earn referral commissions and credits indefinitely!
        </AlertDescription>
      </Alert>
    );
  }

  if (!eligibility.isEligible) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Commission Period Ended:</strong> Your referral commission eligibility period has expired on {formatDate(eligibility.expiryDate)}.
          You will no longer earn commissions from new referrals, but existing expected commissions will still be paid.
        </AlertDescription>
      </Alert>
    );
  }

  const urgencyColor = eligibility.daysRemaining <= 7 ? 'text-red-600' : 
                       eligibility.daysRemaining <= 30 ? 'text-orange-600' : 
                       'text-blue-600';

  const urgencyBg = eligibility.daysRemaining <= 7 ? 'bg-red-50 border-red-200 dark:bg-red-950' : 
                    eligibility.daysRemaining <= 30 ? 'bg-orange-50 border-orange-200 dark:bg-orange-950' : 
                    'bg-blue-50 border-blue-200 dark:bg-blue-950';

  return (
    <Alert className={urgencyBg}>
      <Clock className={`h-4 w-4 ${urgencyColor}`} />
      <AlertDescription className={urgencyColor}>
        <div className="space-y-1">
          <div className="font-semibold text-lg">
            ⏰ {eligibility.daysRemaining} Days Remaining
          </div>
          <div className="text-sm opacity-90">
            Your commission eligibility expires on <strong>{formatDate(eligibility.expiryDate)}</strong>
          </div>
          <div className="text-xs opacity-75 mt-2">
            Enrolled: {formatDate(eligibility.enrollmentDate)}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ReferralEligibilityCountdown;
