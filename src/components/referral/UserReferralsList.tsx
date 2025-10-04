import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Users, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ReferralDetail {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_picture_url: string | null;
  registration_date: string;
  total_earned: number;
  total_expected: number;
  commission_count: number;
  status: string;
}

interface UserReferralsListProps {
  userId: string;
}

const UserReferralsList: React.FC<UserReferralsListProps> = ({ userId }) => {
  const [referrals, setReferrals] = useState<ReferralDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalReferrals: 0,
    totalEarned: 0,
    totalExpected: 0
  });

  useEffect(() => {
    loadReferrals();
  }, [userId]);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      
      // Get all users referred by this user
      const { data: referredUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, profile_picture_url, created_at, status')
        .eq('referred_by', userId);

      if (usersError) throw usersError;

      if (!referredUsers || referredUsers.length === 0) {
        setReferrals([]);
        setLoading(false);
        return;
      }

      // Get commission data for each referred user
      const referralDetails: ReferralDetail[] = await Promise.all(
        referredUsers.map(async (user) => {
          // Get earned commissions (paid status)
          const { data: earnedCommissions } = await supabase
            .from('referral_commissions')
            .select('commission_amount')
            .eq('referrer_id', userId)
            .eq('referred_id', user.id)
            .eq('status', 'paid');

          // Get expected commissions (pending status)
          const { data: expectedCommissions } = await supabase
            .from('referral_commissions')
            .select('commission_amount')
            .eq('referrer_id', userId)
            .eq('referred_id', user.id)
            .eq('status', 'pending');

          const totalEarned = earnedCommissions?.reduce(
            (sum, c) => sum + (c.commission_amount || 0), 
            0
          ) || 0;

          const totalExpected = expectedCommissions?.reduce(
            (sum, c) => sum + (c.commission_amount || 0), 
            0
          ) || 0;

          const commissionCount = (earnedCommissions?.length || 0) + (expectedCommissions?.length || 0);

          return {
            id: user.id,
            full_name: user.full_name || 'Unknown',
            email: user.email || 'N/A',
            phone: user.phone || 'N/A',
            profile_picture_url: user.profile_picture_url,
            registration_date: user.created_at,
            total_earned: totalEarned,
            total_expected: totalExpected,
            commission_count: commissionCount,
            status: user.status || 'active'
          };
        })
      );

      // Calculate summary
      const totals = referralDetails.reduce(
        (acc, ref) => ({
          totalReferrals: acc.totalReferrals + 1,
          totalEarned: acc.totalEarned + ref.total_earned,
          totalExpected: acc.totalExpected + ref.total_expected
        }),
        { totalReferrals: 0, totalEarned: 0, totalExpected: 0 }
      );

      setSummary(totals);
      setReferrals(referralDetails);
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast.error('Failed to load referrals list');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">UGX {summary.totalEarned.toLocaleString()}</div>
            <p className="text-xs text-green-600">From {referrals.filter(r => r.total_earned > 0).length} referrals</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">UGX {summary.totalExpected.toLocaleString()}</div>
            <p className="text-xs text-orange-600">From {referrals.filter(r => r.total_expected > 0).length} referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* Earned Referrals Section */}
      {referrals.filter(r => r.total_earned > 0).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Earned Referral Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                    <TableHead className="hidden sm:table-cell text-center">Commissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.filter(r => r.total_earned > 0).map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={referral.profile_picture_url || undefined} />
                            <AvatarFallback>{referral.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{referral.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {referral.email}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {new Date(referral.registration_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-green-600">
                          UGX {referral.total_earned.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <Badge className="bg-green-600">
                          {referral.commission_count} paid
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expected Referrals Section */}
      {referrals.filter(r => r.total_expected > 0).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Expected Referral Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Expected Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.filter(r => r.total_expected > 0).map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={referral.profile_picture_url || undefined} />
                            <AvatarFallback>{referral.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{referral.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {referral.email}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {new Date(referral.registration_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-orange-600">
                          UGX {referral.total_expected.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          Pending
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Referrals State */}
      {referrals.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold mb-2">No Referrals Yet</h3>
            <p className="text-muted-foreground">
              Share your referral code to start earning commissions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserReferralsList;
