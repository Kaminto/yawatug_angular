import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { MobileBottomPadding } from '@/components/layout/MobileBottomPadding';
import { useUser } from '@/providers/UserProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  Gift, 
  Copy, 
  Share, 
  TrendingUp, 
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ReferralData {
  totalReferrals: number;
  activeReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
  referralCode: string;
  referralActivities: any[];
}

const UserReferrals = () => {
  const { user, userProfile, loading: userLoading } = useUser();
  const [referralData, setReferralData] = useState<ReferralData>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
    referralCode: '',
    referralActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState('');

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Referrals' }
  ];

  useEffect(() => {
    if (user?.id) {
      loadReferralData();
      generateShareLink();
    }
  }, [user?.id]);

  const loadReferralData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get user's referral code
      const referralCode = (userProfile as any)?.referral_code || '';

      // Load referral statistics
      const { data: referralStats } = await supabase
        .from('referral_statistics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load referral activities (basic query to avoid type complexity)
      const referralActivities: any[] = [];

      // Load commission data from agent income streams if user is an agent
      let totalCommissions = 0;
      let pendingCommissions = 0;

      if (userProfile?.user_role === 'agent') {
        const { data: commissions } = await supabase
          .from('agent_income_streams')
          .select('amount, payment_status')
          .eq('agent_id', user.id)
          .eq('income_type', 'referral_commission');

        if (commissions) {
          totalCommissions = commissions
            .filter(c => c.payment_status === 'paid')
            .reduce((sum, c) => sum + (c.amount || 0), 0);
          
          pendingCommissions = commissions
            .filter(c => c.payment_status === 'pending')
            .reduce((sum, c) => sum + (c.amount || 0), 0);
        }
      }

      setReferralData({
        totalReferrals: referralStats?.total_referrals || 0,
        activeReferrals: referralStats?.successful_referrals || 0,
        totalCommissions,
        pendingCommissions,
        referralCode,
        referralActivities: referralActivities || []
      });

    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const generateShareLink = () => {
    if ((userProfile as any)?.referral_code) {
      const baseUrl = window.location.origin;
      setShareLink(`${baseUrl}/signup?ref=${(userProfile as any).referral_code}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Yawatu - Invest in Mining',
          text: 'Join me on Yawatu and start investing in profitable mining operations!',
          url: shareLink,
        });
      } catch (error) {
        copyToClipboard(shareLink);
      }
    } else {
      copyToClipboard(shareLink);
    }
  };

  if (loading || userLoading) {
    return (
      <UserLayout title="Referral Program" breadcrumbs={breadcrumbs}>
        <MobileBottomPadding>
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded-lg"></div>
                ))}
              </div>
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
          </div>
        </MobileBottomPadding>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Referral Program" breadcrumbs={breadcrumbs}>
      <MobileBottomPadding>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">Referral Program</h1>
            <p className="text-muted-foreground">
              Earn commissions by referring friends and family to Yawatu
            </p>
          </div>

          {/* Referral Code Alert */}
          {!referralData.referralCode && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your referral code is being generated. Please refresh the page if it doesn't appear soon.
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2 text-yawatu-gold" />
                  Total Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yawatu-gold">
                  {referralData.totalReferrals}
                </div>
                <p className="text-xs text-muted-foreground">
                  People you've referred
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Active Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {referralData.activeReferrals}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully registered
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                  Total Commissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  UGX {referralData.totalCommissions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Earned commissions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                  Pending Commissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  UGX {referralData.pendingCommissions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting payment
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="share" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="share">Share & Earn</TabsTrigger>
              <TabsTrigger value="history">Referral History</TabsTrigger>
            </TabsList>

            <TabsContent value="share" className="space-y-6">
              {/* Share Your Referral Link */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Share className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Your Referral Link
                  </CardTitle>
                  <CardDescription>
                    Share this link with friends and family to earn commissions when they sign up and invest
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="referral-code">Your Referral Code</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="referral-code"
                        value={referralData.referralCode}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(referralData.referralCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referral-link">Your Referral Link</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="referral-link"
                        value={shareLink}
                        readOnly
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(shareLink)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Button onClick={shareReferralLink} className="w-full">
                    <Share className="h-4 w-4 mr-2" />
                    Share Referral Link
                  </Button>
                </CardContent>
              </Card>

              {/* How It Works */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Gift className="h-5 w-5 mr-2 text-yawatu-gold" />
                    How It Works
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-yawatu-gold text-white rounded-full flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold">Share Your Link</h4>
                        <p className="text-sm text-muted-foreground">
                          Send your referral link to friends, family, and contacts
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-yawatu-gold text-white rounded-full flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold">They Sign Up</h4>
                        <p className="text-sm text-muted-foreground">
                          Your referrals create an account using your link
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-yawatu-gold text-white rounded-full flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold">You Earn Commissions</h4>
                        <p className="text-sm text-muted-foreground">
                          Earn commissions when they make investments
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Referral Activity
                  </CardTitle>
                  <CardDescription>
                    Track your referral performance and earnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {referralData.referralActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Referrals Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Start sharing your referral link to earn commissions
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {referralData.referralActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-yawatu-gold/10 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-yawatu-gold" />
                            </div>
                            <div>
                              <div className="font-semibold">
                                {activity.referred_user?.full_name || 'New User'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {activity.referred_user?.email}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={activity.status === 'completed' ? 'default' : 'secondary'}
                            >
                              {activity.status}
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MobileBottomPadding>
    </UserLayout>
  );
};

export default UserReferrals;