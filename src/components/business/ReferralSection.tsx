import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  CheckCircle,
  UserPlus,
  Target
} from 'lucide-react';
import { useReferralSummary } from '@/hooks/useReferralSummary';

interface ReferralSectionProps {
  userId: string;
  period: string;
  showValues: boolean;
}

const ReferralSection: React.FC<ReferralSectionProps> = ({
  userId,
  period,
  showValues
}) => {
  const { referralSummary, loading } = useReferralSummary(userId, period);

  const formatCurrency = (amount: number) => {
    if (!showValues) return '••••••';
    return `UGX ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Referral Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Referral Commissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expected Commission */}
            <Card className="border-purple-200 bg-purple-50/30 dark:bg-purple-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Expected Commission</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Pending
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-purple-800 mb-1">
                  {formatCurrency(referralSummary?.expectedCommission || 0)}
                </p>
                <p className="text-xs text-purple-600">
                  From unpaid bookings
                </p>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    {referralSummary?.unpaidBookings || 0} pending referrals
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Realised Commission */}
            <Card className="border-green-200 bg-green-50/30 dark:bg-green-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Realised Commission</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Paid
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-green-800 mb-1">
                  {formatCurrency(referralSummary?.realisedCommission || 0)}
                </p>
                <p className="text-xs text-green-600">
                  Paid commissions
                </p>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    {referralSummary?.paidReferrals || 0} completed referrals
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Metrics */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-lg font-bold text-primary">
                {showValues ? referralSummary?.totalReferrals || 0 : '••••'}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Active Referrals</p>
              <p className="text-lg font-bold">
                {showValues ? referralSummary?.activeReferrals || 0 : '••••'}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Avg Commission</p>
              <p className="text-lg font-bold">
                {formatCurrency(referralSummary?.avgCommission || 0)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-lg font-bold text-primary">
                {showValues ? `${(referralSummary?.conversionRate || 0).toFixed(1)}%` : '••••'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      {referralSummary?.recentReferrals && referralSummary.recentReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Referral Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referralSummary.recentReferrals.map((referral, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      referral.status === 'paid' 
                        ? 'bg-green-100 dark:bg-green-900/20'
                        : 'bg-purple-100 dark:bg-purple-900/20'
                    }`}>
                      {referral.status === 'paid' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{referral.referredUser}</p>
                      <p className="text-sm text-muted-foreground">
                        Referred on {new Date(referral.referralDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      referral.status === 'paid' ? 'text-green-600' : 'text-purple-600'
                    }`}>
                      {formatCurrency(referral.commissionAmount)}
                    </p>
                    <Badge variant={referral.status === 'paid' ? 'default' : 'secondary'}>
                      {referral.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Referral Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                <UserPlus className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-lg font-bold text-blue-800">
                  {showValues ? referralSummary?.thisMonthReferrals || 0 : '••••'}
                </p>
                <p className="text-sm text-muted-foreground">This Month</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-lg font-bold text-purple-800">
                  {formatCurrency(referralSummary?.thisMonthEarnings || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Month Earnings</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-lg font-bold text-green-800">
                  {showValues ? `${(referralSummary?.successRate || 0).toFixed(0)}%` : '••••'}
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Referrals State */}
      {(!referralSummary || referralSummary.totalReferrals === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Start Referring Friends</h3>
            <p className="text-muted-foreground mb-4">
              Earn commissions by inviting friends to invest with Yawatu
            </p>
            <div className="text-sm text-muted-foreground">
              <p>• Earn up to 5% commission on referral investments</p>
              <p>• Get paid when they complete their first transaction</p>
              <p>• Track all your referrals and earnings here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReferralSection;