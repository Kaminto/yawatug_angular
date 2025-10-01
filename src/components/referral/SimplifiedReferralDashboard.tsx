import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Copy, 
  Share2, 
  QrCode, 
  Users, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  MessageCircle,
  Send,
  TrendingUp
} from 'lucide-react';
import EnhancedReferralEarnings from './EnhancedReferralEarnings';

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  earnedCommissions: number;
  expectedCommissions: number;
  recentActivity: any[];
}

interface SimplifiedReferralDashboardProps {
  userId: string;
}

const SimplifiedReferralDashboard: React.FC<SimplifiedReferralDashboardProps> = ({ userId }) => {
  const [data, setData] = useState<ReferralData>({
    referralCode: '',
    totalReferrals: 0,
    earnedCommissions: 0,
    expectedCommissions: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralData();
  }, [userId]);

  const loadReferralData = async () => {
    try {
      // Get user profile with referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', userId)
        .single();

      // Get total referrals
      const { data: referrals } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .eq('referred_by', userId)
        .order('created_at', { ascending: false });

      // Get commission data with correct column names
      const { data: commissions } = await supabase
        .from('referral_commissions')
        .select(`
          id, 
          commission_amount, 
          status, 
          commission_type,
          created_at,
          referred_id,
          referrer_id
        `)
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      // Get referred user names separately
      const referredUserIds = commissions?.map(c => c.referred_id).filter(Boolean) || [];
      const { data: referredProfiles } = referredUserIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', referredUserIds) : { data: [] };

      // Create a map for quick lookups
      const profileMap = new Map<string, string>();
      referredProfiles?.forEach(p => {
        if (p.id && p.full_name) {
          profileMap.set(p.id, p.full_name);
        }
      });

      // Calculate earned vs expected
      const earnedCommissions = commissions
        ?.filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.commission_amount, 0) || 0;

      const expectedCommissions = commissions
        ?.filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.commission_amount, 0) || 0;

      // Format recent activity combining referrals and commissions
      const recentActivity = [
        ...(referrals?.map(r => ({
          id: r.id,
          type: 'signup',
          name: r.full_name,
          date: r.created_at,
          amount: 0
        })) || []),
        ...(commissions?.slice(0, 10).map(c => ({
          id: c.id,
          type: c.status === 'paid' ? 'earned' : 'expected',
          name: profileMap.get(c.referred_id) || 'User',
          date: c.created_at,
          amount: c.commission_amount
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

      setData({
        referralCode: profile?.referral_code || '',
        totalReferrals: referrals?.length || 0,
        earnedCommissions,
        expectedCommissions,
        recentActivity
      });

    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const generateReferralLink = (platform?: string) => {
    const baseUrl = window.location.origin;
    const referralUrl = `${baseUrl}/register?ref=${data.referralCode}`;
    
    if (platform) {
      switch (platform) {
        case 'whatsapp':
          return `https://wa.me/?text=${encodeURIComponent(`🏆 Join me on YAWATU and start investing in gold mining shares! Use my referral code: ${data.referralCode}\n\n${referralUrl}\n\nEarn 5% commission on every share you buy! 💰`)}`;
        case 'twitter':
          return `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🏆 Join me on @YawatuMining and start investing in gold! Use my referral code: ${data.referralCode}`)}&url=${encodeURIComponent(referralUrl)}`;
        case 'facebook':
          return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`;
        case 'telegram':
          return `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(`Join me on YAWATU! Use code: ${data.referralCode}`)}`;
      }
    }
    return referralUrl;
  };

  const copyReferralLink = () => {
    const link = generateReferralLink();
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const shareToSocialMedia = (platform: string) => {
    const url = generateReferralLink(platform);
    window.open(url, '_blank', 'width=600,height=400');
  };

  const generateQRCode = () => {
    const link = generateReferralLink();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}&format=png&margin=10`;
    window.open(qrUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview & Share</TabsTrigger>
          <TabsTrigger value="earnings">
            <TrendingUp className="h-4 w-4 mr-2" />
            Earnings Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">People Invited</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">Total referrals</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earned</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">UGX {data.earnedCommissions.toLocaleString()}</div>
            <p className="text-xs text-green-600">Paid commissions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">UGX {data.expectedCommissions.toLocaleString()}</div>
            <p className="text-xs text-orange-600">From pending bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Share Your Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share & Earn 5% Commission
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Invite friends to invest in gold mining shares and earn 5% on every purchase they make
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Referral Code */}
          <div className="flex items-center space-x-2">
            <Input 
              value={data.referralCode} 
              readOnly 
              className="font-mono text-lg font-bold bg-primary/5"
            />
            <Button 
              onClick={() => {
                navigator.clipboard.writeText(data.referralCode);
                toast.success('Referral code copied!');
              }} 
              variant="outline"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Referral Link */}
          <div className="flex items-center space-x-2">
            <Input 
              value={generateReferralLink()} 
              readOnly 
              className="text-sm"
              placeholder="Your referral link"
            />
            <Button onClick={copyReferralLink} variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Social Media Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button 
              onClick={() => shareToSocialMedia('whatsapp')} 
              variant="outline" 
              className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            
            <Button 
              onClick={() => shareToSocialMedia('telegram')} 
              variant="outline"
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              <Send className="h-4 w-4" />
              Telegram
            </Button>
            
            <Button 
              onClick={() => shareToSocialMedia('twitter')} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Twitter
            </Button>
            
            <Button 
              onClick={generateQRCode} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <QrCode className="h-4 w-4" />
              QR Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold mx-auto">
                1
              </div>
              <h4 className="font-medium">Share Your Link</h4>
              <p className="text-sm text-muted-foreground">
                Send your referral link via WhatsApp, Telegram, or social media
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold mx-auto">
                2
              </div>
              <h4 className="font-medium">They Register & Invest</h4>
              <p className="text-sm text-muted-foreground">
                Friends use your code to register and buy gold mining shares
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mx-auto">
                3
              </div>
              <h4 className="font-medium">Earn 5% Commission</h4>
              <p className="text-sm text-muted-foreground">
                Get paid instantly when they complete their share purchases
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {data.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{activity.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.type === 'signup' ? 'Joined using your referral code' :
                       activity.type === 'earned' ? 'Commission paid' :
                       'Commission expected'} • {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {activity.amount > 0 && (
                      <p className={`font-bold ${activity.type === 'earned' ? 'text-green-600' : 'text-orange-600'}`}>
                        +UGX {activity.amount.toLocaleString()}
                      </p>
                    )}
                    <Badge 
                      variant={activity.type === 'earned' ? 'default' : activity.type === 'expected' ? 'secondary' : 'outline'}
                    >
                      {activity.type === 'signup' ? 'New User' : 
                       activity.type === 'earned' ? 'Earned' : 'Expected'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.recentActivity.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-semibold mb-2">Start Inviting Friends</h3>
            <p className="text-muted-foreground mb-4">
              Share your referral link and start earning 5% commission on every gold share investment
            </p>
            <Button onClick={copyReferralLink} className="bg-primary hover:bg-primary/90">
              <Share2 className="h-4 w-4 mr-2" />
              Copy Your Link
            </Button>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="earnings" className="mt-6">
          <EnhancedReferralEarnings userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimplifiedReferralDashboard;