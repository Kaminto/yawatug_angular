import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReferralActivity {
  referredUser: string;
  referralDate: string;
  commissionAmount: number;
  status: 'pending' | 'paid';
}

export interface ReferralSummaryData {
  // Expected vs Realised
  expectedCommission: number;
  realisedCommission: number;
  
  // Counts and metrics
  totalReferrals: number;
  activeReferrals: number;
  unpaidBookings: number;
  paidReferrals: number;
  avgCommission: number;
  conversionRate: number;
  
  // Performance metrics
  thisMonthReferrals: number;
  thisMonthEarnings: number;
  successRate: number;
  
  // Details
  recentReferrals: ReferralActivity[];
}

export const useReferralSummary = (userId: string, period: string) => {
  const [referralSummary, setReferralSummary] = useState<ReferralSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadReferralSummary();
    }
  }, [userId, period]);

  const getPeriodFilter = () => {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      case 'all':
      default:
        return '1970-01-01T00:00:00Z';
    }
  };

  const loadReferralSummary = async () => {
    try {
      setLoading(true);
      const periodFilter = getPeriodFilter();
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch real referral data from the database
      const [
        referralEarningsResult,
        referralActivitiesResult,
        referralStatsResult,
        recentActivitiesResult
      ] = await Promise.all([
        // Get referral commissions for the user in the selected period
        supabase
          .from('referral_commissions')
          .select('*')
          .eq('referrer_id', userId)
          .gte('created_at', periodFilter),

        // Get referral activities for commission calculation
        supabase
          .from('referral_activities')
          .select('*')
          .eq('referrer_id', userId)
          .gte('created_at', periodFilter),

        // Get user's referral statistics
        supabase
          .from('referral_statistics')
          .select('*')
          .eq('user_id', userId)
          .single(),

        // Get recent referral activities with referred user details
        supabase
          .from('referral_activities')
          .select(`
            *,
            referred_profile:profiles!referral_activities_referred_id_fkey(full_name)
          `)
          .eq('referrer_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const referralEarnings = referralEarningsResult.data || [];
      const referralActivities = referralActivitiesResult.data || [];
      const referralStats = referralStatsResult.data;
      const recentActivities = recentActivitiesResult.data || [];

      // Calculate expected (pending) and realised (paid) earnings
      const expectedCommission = referralEarnings
        .filter(earning => earning.status === 'pending')
        .reduce((sum, earning) => sum + (earning.commission_amount || 0), 0);

      const realisedCommission = referralEarnings
        .filter(earning => earning.status === 'paid')
        .reduce((sum, earning) => sum + (earning.commission_amount || 0), 0);

      // Calculate this month's metrics
      const thisMonthActivities = referralActivities
        .filter(activity => new Date(activity.created_at) >= new Date(thisMonthStart));
      
      const thisMonthReferrals = thisMonthActivities.length;
      const thisMonthEarnings = thisMonthActivities
        .reduce((sum, activity) => sum + (activity.commission_earned || 0), 0);

      // Count different types of referrals
      const paidReferrals = referralEarnings.filter(e => e.status === 'paid').length;
      const unpaidBookings = referralEarnings.filter(e => e.status === 'pending').length;
      
      // Calculate metrics from referral stats or fallback to calculated values
      const totalReferrals = referralStats?.total_referrals || referralActivities.length;
      const successfulReferrals = referralStats?.successful_referrals || paidReferrals;
      const successRate = totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0;
      const conversionRate = referralActivities.length > 0 ? (paidReferrals / referralActivities.length) * 100 : 0;
      
      const avgCommission = (expectedCommission + realisedCommission) / Math.max(totalReferrals, 1);

      // Format recent referrals for the UI
      const recentReferrals: ReferralActivity[] = recentActivities.map(activity => ({
        referredUser: activity.referred_profile?.full_name || 'Unknown User',
        referralDate: activity.created_at,
        commissionAmount: activity.commission_earned || 0,
        status: activity.status === 'completed' ? 'paid' as const : 'pending' as const
      }));

      const summaryData: ReferralSummaryData = {
        expectedCommission,
        realisedCommission,
        totalReferrals,
        activeReferrals: referralStats?.successful_referrals || successfulReferrals,
        unpaidBookings,
        paidReferrals,
        avgCommission,
        conversionRate,
        thisMonthReferrals,
        thisMonthEarnings,
        successRate,
        recentReferrals
      };

      setReferralSummary(summaryData);

    } catch (error) {
      console.error('Error loading referral summary:', error);
      
      // If referral tables don't exist yet, provide empty state
      const emptySummary: ReferralSummaryData = {
        expectedCommission: 0,
        realisedCommission: 0,
        totalReferrals: 0,
        activeReferrals: 0,
        unpaidBookings: 0,
        paidReferrals: 0,
        avgCommission: 0,
        conversionRate: 0,
        thisMonthReferrals: 0,
        thisMonthEarnings: 0,
        successRate: 0,
        recentReferrals: []
      };
      
      setReferralSummary(emptySummary);
    } finally {
      setLoading(false);
    }
  };

  return {
    referralSummary,
    loading,
    refreshReferralSummary: loadReferralSummary
  };
};