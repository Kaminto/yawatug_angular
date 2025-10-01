import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Copy, DollarSign, Users, Star, TrendingUp, Gift, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useReferralCommissions } from '@/hooks/useReferralCommissions';

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
  const [summary, setSummary] = useState<ReferralSummary>({
    totalReferrals: 0,
    successfulReferrals: 0,
    rank: 0,
    referralCode: ''
  });

  useEffect(() => {
    loadReferralSummary();
  }, [userId]);

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

      // Calculate rank (simplified - based on total earnings)
      const { data: allReferrers } = await supabase
        .from('referral_commissions')
        .select('referrer_id, commission_amount')
        .eq('status', 'paid');

      // Group by referrer and sum earnings
      const referrerEarnings = new Map();
      allReferrers?.forEach(r => {
        const current = referrerEarnings.get(r.referrer_id) || 0;
        referrerEarnings.set(r.referrer_id, current + r.commission_amount);
      });

      // Calculate current user's rank
      const myEarnings = referrerEarnings.get(userId) || 0;
      let rank = 1;
      referrerEarnings.forEach((earnings) => {
        if (earnings > myEarnings) rank++;
      });

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
      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Rank</CardTitle>
            <Star className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">#{summary.rank}</div>
            <p className="text-xs text-blue-600">Among all referrers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">People invited</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earned</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">UGX {enhancedEarnings.totalEarned.toLocaleString()}</div>
            <p className="text-xs text-green-600">From completed payments</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">UGX {enhancedEarnings.totalExpected.toLocaleString()}</div>
            <p className="text-xs text-orange-600">From pending bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Earnings Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Direct Purchases</span>
              <span className="font-semibold text-green-600">UGX {enhancedEarnings.directEarned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Installment Payments</span>
              <span className="font-semibold text-blue-600">UGX {enhancedEarnings.installmentEarned.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-medium">Total Earned</span>
              <span className="font-bold text-green-700">UGX {enhancedEarnings.totalEarned.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Potential</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Already Earned</span>
              <span className="font-semibold">UGX {enhancedEarnings.totalEarned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Expected from Bookings</span>
              <span className="font-semibold text-orange-600">UGX {enhancedEarnings.totalExpected.toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-medium">Total Potential</span>
              <span className="font-bold text-blue-700">UGX {(enhancedEarnings.totalEarned + enhancedEarnings.totalExpected).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Input 
              value={summary.referralCode} 
              readOnly 
              className="font-mono text-lg font-bold"
            />
            <Button onClick={copyReferralCode} variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Earn 5% commission on every share purchase and installment payment made by your referrals
          </p>
        </CardContent>
      </Card>

      {/* Commission Details */}
      {commissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Commission Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commissions.slice(0, 5).map((commission) => (
                <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{commission.referred_profile?.full_name || 'Unknown User'}</p>
                    <p className="text-sm text-muted-foreground">
                      {commission.commission_type === 'direct_purchase' ? 'Direct Purchase' : 
                       commission.commission_type === 'installment_payment' ? 'Installment Payment' : 
                       'Expected from Booking'} • {new Date(commission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${commission.status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                      +UGX {commission.commission_amount.toLocaleString()}
                    </p>
                    <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                      {commission.status === 'paid' ? 'Earned' : 'Expected'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {commissions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold mb-2">Start Earning Commissions</h3>
            <p className="text-muted-foreground mb-4">
              Share your referral code and earn 5% on every investment and installment payment made by your referrals
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimpleReferralSummary;