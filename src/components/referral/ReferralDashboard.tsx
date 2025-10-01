
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Users, DollarSign, Gift, Award, TrendingUp, Star } from 'lucide-react';

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  successfulReferrals: number;
  tier: string;
  tierProgress: number;
  nextTierThreshold: number;
  achievements: any[];
  currentRank: number;
}

const ReferralDashboard = () => {
  const [stats, setStats] = useState<ReferralStats>({
    referralCode: '',
    totalReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    successfulReferrals: 0,
    tier: 'bronze',
    tierProgress: 0,
    nextTierThreshold: 5,
    achievements: [],
    currentRank: 0
  });
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's profile to fetch their actual referral code
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();

      const referralCode = userProfile?.referral_code || `YWT${user.id.slice(-5).toUpperCase()}`;

      // Load user's referral statistics
      const { data: userStats } = await supabase
        .from('referral_statistics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load referral activities
      const { data: activitiesData } = await supabase
        .from('referral_activities')
        .select(`
          *,
          referred:referred_id (
            full_name,
            email
          )
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Load milestones
      const { data: milestonesData } = await supabase
        .from('referral_milestones')
        .select('*')
        .eq('is_active', true)
        .order('threshold_value', { ascending: true });

      setActivities(activitiesData || []);
      setMilestones(milestonesData || []);

      // Calculate tier progress - Remove tier system since it was deprecated
      const currentSuccessful = userStats?.successful_referrals || 0;
      
      // Since tier system is removed, set default values
      const currentTier = 'standard';
      const nextTier = 'standard';
      const nextThreshold = 0;
      const tierProgress = 100;

      setStats({
        referralCode,
        totalReferrals: userStats?.total_referrals || 0,
        totalEarnings: userStats?.total_earnings || 0,
        pendingEarnings: userStats?.pending_earnings || 0,
        successfulReferrals: currentSuccessful,
        tier: currentTier,
        tierProgress,
        nextTierThreshold: nextThreshold,
        achievements: Array.isArray(userStats?.achievements) ? userStats.achievements : [],
        currentRank: userStats?.current_rank || 0
      });
      
    } catch (error) {
      console.error('Error loading referral data:', error);
      // Set default values with the referral code
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const referralCode = `REF${user.id.slice(-6).toUpperCase()}`;
        setStats(prev => ({ ...prev, referralCode }));
      }
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(stats.referralCode);
    toast.success('Referral code copied to clipboard!');
  };

  if (loading) {
    return <div className="animate-pulse">Loading referral data...</div>;
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'text-purple-600';
      case 'gold': return 'text-yellow-600';
      case 'silver': return 'text-gray-600';
      default: return 'text-orange-600';
    }
  };

  const getTierEmoji = (tier: string) => {
    switch (tier) {
      case 'platinum': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      default: return '🥉';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tier Progress Card */}
      <Card className="bg-gradient-to-r from-yawatu-primary/5 to-yawatu-gold/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Your Referral Tier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getTierEmoji(stats.tier)}</span>
              <span className={`text-xl font-bold capitalize ${getTierColor(stats.tier)}`}>
                {stats.tier}
              </span>
            </div>
            {stats.currentRank > 0 && (
              <Badge variant="outline">
                Rank #{stats.currentRank}
              </Badge>
            )}
          </div>
          
          {stats.tier !== 'platinum' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to next tier</span>
                <span>{stats.successfulReferrals}/{stats.nextTierThreshold}</span>
              </div>
              <Progress value={stats.tierProgress} className="h-2" />
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            {stats.tier === 'platinum' 
              ? 'You\'ve reached the highest tier! Keep referring to maintain your status.'
              : `Refer ${stats.nextTierThreshold - stats.successfulReferrals} more successful users to reach the next tier.`
            }
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">People invited</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successfulReferrals}</div>
            <p className="text-xs text-muted-foreground">Invested users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {stats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {stats.pendingEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting payout</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input 
              value={stats.referralCode} 
              readOnly 
              className="font-mono text-lg"
            />
            <Button onClick={copyReferralCode} variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Share this code with friends and earn commission when they purchase shares!
          </p>
        </CardContent>
      </Card>

      {/* Achievements Section */}
      {stats.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.achievements.slice(-4).map((achievement, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <p className="font-medium">{achievement.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(achievement.achieved_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {milestones.slice(0, 3).map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{milestone.badge_icon}</span>
                    <div>
                      <p className="font-medium">{milestone.name}</p>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {milestone.threshold_value} {milestone.milestone_type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No referral activity yet</p>
              <p className="text-sm text-muted-foreground">Start sharing your referral code to earn commissions!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {activity.activity_type === 'signup' ? 'New referral signup' :
                       activity.activity_type === 'first_investment' ? 'First investment completed' :
                       activity.activity_type === 'tier_upgrade' ? 'Tier upgrade achieved' :
                       activity.activity_type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.referred?.full_name || 'Unknown'} • {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      activity.status === 'processed' ? 'default' :
                      activity.status === 'paid' ? 'secondary' : 'outline'
                    }>
                      {activity.status}
                    </Badge>
                    {activity.commission_earned > 0 && (
                      <p className="text-sm font-medium text-green-600">
                        +UGX {activity.commission_earned.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralDashboard;
