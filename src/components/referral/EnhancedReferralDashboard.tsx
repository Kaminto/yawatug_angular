import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  DollarSign, 
  Gift, 
  Copy, 
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  Star
} from 'lucide-react';
import { useReferralCommissions } from '@/hooks/useReferralCommissions';
import { toast } from 'sonner';

interface EnhancedReferralDashboardProps {
  userId: string;
  referralCode: string;
  referralStats?: {
    totalReferrals: number;
    successfulReferrals: number;
    tier: string;
    tierProgress: number;
    nextTierThreshold: number;
    currentRank: number;
  };
}

const EnhancedReferralDashboard: React.FC<EnhancedReferralDashboardProps> = ({
  userId,
  referralCode,
  referralStats
}) => {
  const { commissions, loading, totalEarnings, pendingEarnings } = useReferralCommissions(userId);

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied to clipboard!');
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'text-purple-600 bg-purple-50';
      case 'gold': return 'text-yellow-600 bg-yellow-50';
      case 'silver': return 'text-gray-600 bg-gray-50';
      default: return 'text-orange-600 bg-orange-50';
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tier & Rank Display */}
      {referralStats && (
        <Card className={`border-l-4 ${
          referralStats.tier === 'platinum' ? 'border-l-purple-500' :
          referralStats.tier === 'gold' ? 'border-l-yellow-500' :
          referralStats.tier === 'silver' ? 'border-l-gray-500' : 'border-l-orange-500'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${getTierColor(referralStats.tier)}`}>
                  {getTierEmoji(referralStats.tier)}
                </div>
                <div>
                  <h3 className="text-xl font-bold capitalize">{referralStats.tier} Member</h3>
                  {referralStats.currentRank > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <Star className="w-4 h-4 inline mr-1" />
                      Rank #{referralStats.currentRank}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {referralStats.successfulReferrals} Successful Referrals
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Earnings Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">UGX {totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-green-600">Paid to you</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">UGX {pendingEarnings.toLocaleString()}</div>
            <p className="text-xs text-yellow-600">Awaiting payout</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">UGX {(totalEarnings + pendingEarnings).toLocaleString()}</div>
            <p className="text-xs text-blue-600">All-time value</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle>Share Your Code & Earn 5%</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input 
              value={referralCode} 
              readOnly 
              className="font-mono text-lg font-bold bg-primary/5 border-primary/20"
            />
            <Button onClick={copyReferralCode} variant="outline" className="shrink-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Earn 5% commission on every share purchase made by people you refer!
          </p>
        </CardContent>
      </Card>

      {/* Commission Details */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Commission Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No commissions earned yet</p>
              <p className="text-sm text-muted-foreground">Start sharing your referral code to see earnings here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commissions.slice(0, 8).map((commission) => (
                <div key={commission.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      commission.status === 'paid' 
                        ? 'bg-green-100 dark:bg-green-900/20'
                        : 'bg-yellow-100 dark:bg-yellow-900/20'
                    }`}>
                      {commission.status === 'paid' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {commission.referred_profile?.full_name || 'Referred User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {commission.earning_type} • {new Date(commission.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(commission.commission_rate * 100).toFixed(1)}% of UGX {commission.source_amount?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${
                      commission.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      +UGX {commission.commission_amount?.toLocaleString()}
                    </p>
                    <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                      {commission.status}
                    </Badge>
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

export default EnhancedReferralDashboard;