import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SmartInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  action?: {
    label: string;
    path: string;
  };
  priority: 'high' | 'medium' | 'low';
  icon?: string;
}

export interface DashboardIntelligence {
  insights: SmartInsight[];
  nextBestAction: SmartInsight | null;
  completionScore: number;
  investmentHealth: number;
  earningsPotential: number;
}

export const useSmartDashboard = (userId: string) => {
  const [intelligence, setIntelligence] = useState<DashboardIntelligence>({
    insights: [],
    nextBestAction: null,
    completionScore: 0,
    investmentHealth: 0,
    earningsPotential: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      generateDashboardIntelligence();
    }
  }, [userId]);

  const generateDashboardIntelligence = async () => {
    try {
      setLoading(true);
      const insights: SmartInsight[] = [];

      // Fetch user data
      const [profileResult, walletsResult, sharesResult, transactionsResult, referralsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('wallets').select('*').eq('user_id', userId),
        supabase.from('user_shares').select('*, shares(*)').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
        supabase.from('referral_statistics').select('*').eq('user_id', userId).single()
      ]);

      const profile = profileResult.data;
      const wallets = walletsResult.data || [];
      const shares = sharesResult.data || [];
      const transactions = transactionsResult.data || [];
      const referralStats = referralsResult.data;

      // Calculate completion score
      const completionScore = profile?.profile_completion_percentage || 0;
      
      // Profile completion insights
      if (completionScore < 100) {
        insights.push({
          id: 'profile-incomplete',
          type: 'warning',
          title: 'Complete Your Profile',
          description: `Your profile is ${completionScore}% complete. Complete it to unlock full features.`,
          action: { label: 'Complete Profile', path: '/profile' },
          priority: completionScore < 50 ? 'high' : 'medium',
          icon: 'User'
        });
      }

      // Wallet balance insights
      const totalBalance = wallets.reduce((sum, w) => {
        const balance = w.currency === 'USD' ? w.balance * 3700 : w.balance;
        return sum + balance;
      }, 0);

      if (totalBalance < 10000) {
        insights.push({
          id: 'low-balance',
          type: 'opportunity',
          title: 'Fund Your Wallet',
          description: 'Add funds to start investing in gold mining shares.',
          action: { label: 'Deposit Now', path: '/wallet?open=deposit' },
          priority: 'high',
          icon: 'Wallet'
        });
      }

      // Investment insights
      const totalShares = shares.reduce((sum, s) => sum + s.quantity, 0);
      const sharesValue = shares.reduce((sum, s) => sum + (s.quantity * (s.shares?.price_per_share || 0)), 0);
      
      if (totalShares === 0 && totalBalance > 50000) {
        insights.push({
          id: 'ready-to-invest',
          type: 'opportunity',
          title: 'Ready to Invest',
          description: `You have ${totalBalance.toLocaleString()} UGX available. Start investing in shares.`,
          action: { label: 'Buy Shares', path: '/shares' },
          priority: 'high',
          icon: 'TrendingUp'
        });
      }

      // Calculate investment health
      let investmentHealth = 50;
      if (totalShares > 0) {
        investmentHealth = 70;
        if (totalShares >= 10) investmentHealth = 85;
        if (totalShares >= 50) investmentHealth = 95;
      }

      // Referral opportunities
      const referralCount = referralStats?.total_referrals || 0;
      if (referralCount === 0) {
        insights.push({
          id: 'start-earning',
          type: 'opportunity',
          title: 'Start Earning 5% Commissions',
          description: 'Refer friends and earn 5% commission on their share purchases.',
          action: { label: 'Get Referral Link', path: '/referrals' },
          priority: 'medium',
          icon: 'Users'
        });
      }

      // Transaction activity insights
      const recentActivity = transactions.filter(t => {
        const daysSince = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
      });

      if (recentActivity.length === 0 && totalShares > 0) {
        insights.push({
          id: 'inactive-investor',
          type: 'recommendation',
          title: 'Stay Active',
          description: 'You haven\'t made any transactions in 7 days. Consider adding to your portfolio.',
          action: { label: 'View Opportunities', path: '/shares' },
          priority: 'low',
          icon: 'Activity'
        });
      }

      // Achievement insights
      if (totalShares >= 10 && !insights.some(i => i.id === 'milestone-10-shares')) {
        insights.push({
          id: 'milestone-10-shares',
          type: 'achievement',
          title: 'Milestone Achieved! 🎉',
          description: 'You now own 10+ shares! Keep building your portfolio.',
          priority: 'medium',
          icon: 'Award'
        });
      }

      // Calculate earning potential
      const earningsPotential = (referralCount * 50000 * 0.05) + (totalShares * 500);

      // Sort insights by priority
      const sortedInsights = insights.sort((a, b) => {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      });

      setIntelligence({
        insights: sortedInsights,
        nextBestAction: sortedInsights.find(i => i.type === 'opportunity' && i.priority === 'high') || sortedInsights[0] || null,
        completionScore,
        investmentHealth,
        earningsPotential
      });

    } catch (error) {
      console.error('Error generating dashboard intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  return { intelligence, loading, refresh: generateDashboardIntelligence };
};
