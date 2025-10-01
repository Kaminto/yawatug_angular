
import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import DashboardNavigationGrid from '@/components/dashboard/DashboardNavigationGrid';
import DashboardSummaryGrid from '@/components/dashboard/DashboardSummaryGrid';
import DashboardActivityFeed from '@/components/dashboard/DashboardActivityFeed';
import MarketingCTAs from '@/components/dashboard/MarketingCTAs';
import DashboardSocialFooter from '@/components/dashboard/DashboardSocialFooter';
import { CompactMobileHeader } from '@/components/layout/CompactMobileHeader';
import { CompactDashboardSummary } from '@/components/dashboard/CompactDashboardSummary';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/providers/UserProvider';
import { useUserSharesBalance } from '@/hooks/useUserSharesBalance';
import { useBusinessSummary } from '@/hooks/useBusinessSummary';
import { supabase } from '@/integrations/supabase/client';
import { MobileBottomPadding } from '@/components/layout/MobileBottomPadding';
import { AlertCircle } from 'lucide-react';
import { useSmartDashboard } from '@/hooks/useSmartDashboard';
import SmartInsightsWidget from '@/components/dashboard/SmartInsightsWidget';
import InvestmentHealthScore from '@/components/dashboard/InvestmentHealthScore';
import UnifiedBusinessHub from '@/components/business/UnifiedBusinessHub';

const Dashboard = () => {
  const { user, userProfile, wallets, loading: userLoading } = useUser();
  const [recentActivities, setRecentActivities] = useState([]);
  const [companyData, setCompanyData] = useState({
    totalSharesSold: 0,
    currentSharePrice: 0,
    lastDividend: { amount: 0, date: new Date().toISOString() },
    latestNotice: { title: 'No recent notices', date: new Date().toISOString(), type: 'notice' as 'notice' | 'voting' }
  });
  const [ordersStatus, setOrdersStatus] = useState({ pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  // Get user shares and business data
  const { 
    totalShares, 
    holdings, 
    loading: sharesLoading 
  } = useUserSharesBalance(user?.id || '');
  
  const { 
    summary, 
    loading: businessLoading 
  } = useBusinessSummary(user?.id || '', 'all');

  const isAgent = userProfile?.user_role === 'agent';

  // Smart Dashboard Intelligence
  const { intelligence, loading: intelligenceLoading } = useSmartDashboard(user?.id || '');

  const breadcrumbs = [
    { label: 'Dashboard' }
  ];

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);

      // Load recent activities from transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Transform transactions to activities format
      const activities = (transactionsData || []).map(transaction => ({
        id: transaction.id,
        type: transaction.transaction_type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description || `${transaction.transaction_type} transaction`,
        date: transaction.created_at,
        status: transaction.status
      }));

      setRecentActivities(activities);

      // Load company data
      const [sharesResult, dividendsResult, announcementsResult, ordersResult] = await Promise.all([
        supabase.from('shares').select('price_per_share, total_shares, available_shares').single(),
        supabase.from('dividend_declarations').select('*').order('created_at', { ascending: false }).limit(1),
        supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(1),
        supabase.from('user_shares').select('*').eq('user_id', user.id)
      ]);

      const shareData = sharesResult.data;
      const latestDividend = dividendsResult.data?.[0];
      const latestAnnouncement = announcementsResult.data?.[0];

      setCompanyData({
        totalSharesSold: shareData ? shareData.total_shares - shareData.available_shares : 0,
        currentSharePrice: shareData?.price_per_share || 0,
        lastDividend: {
          amount: latestDividend?.per_share_amount || 0,
          date: latestDividend?.created_at || new Date().toISOString()
        },
        latestNotice: {
          title: latestAnnouncement?.title || 'No recent notices',
          date: latestAnnouncement?.created_at || new Date().toISOString(),
          type: latestAnnouncement?.announcement_type === 'voting' ? 'voting' : 'notice'
        }
      });

      // Count user orders - use correct status values
      const userOrders = ordersResult.data || [];
      setOrdersStatus({
        pending: userOrders.filter(order => ['pending', 'processing', 'locked'].includes(order.status)).length,
        completed: userOrders.filter(order => ['released', 'available_for_trade'].includes(order.status)).length
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || userLoading || sharesLoading || businessLoading) {
    return (
      <UserLayout title="Dashboard" breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading your dashboard...</div>
        </div>
      </UserLayout>
    );
  }

  // Calculate portfolio values
  const sharesValue = summary?.shares?.currentValue || 0;
  const sharesROI = summary?.portfolioRoi || 0;
  const referralEarnings = (summary?.referrals?.realisedCommission || 0) + (summary?.referrals?.expectedCommission || 0);
  const agentEarnings = summary?.agent?.totalCommissions || 0;

  return (
    <>
      <CompactMobileHeader 
        title="Dashboard" 
        showNotifications={true}
        notificationCount={2} 
      />
      <UserLayout title="Dashboard" breadcrumbs={breadcrumbs}>
        <MobileBottomPadding>
          <div className="space-y-6 md:space-y-8">
            {/* Mobile Compact Summary */}
            <CompactDashboardSummary
              sharesValue={sharesValue}
              sharesROI={sharesROI}
              lastDividend={companyData.lastDividend}
              currentSharePrice={companyData.currentSharePrice}
            />

            {/* Header with Personalized Welcome */}
            <div className="space-y-4 md:space-y-6">
              <div className="hidden md:block">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                  Welcome, {userProfile?.full_name?.split(' ')[0] || 'Sam'}!
                </h1>
                <p className="text-muted-foreground text-sm md:text-lg">
                  Your investment dashboard is ready. Take action to grow your wealth.
                </p>
              </div>

              {/* Mobile Welcome - Compressed */}
              <div className="md:hidden">
                <h1 className="text-lg font-bold mb-1">
                  Hi, {userProfile?.full_name?.split(' ')[0] || 'Sam'}! 👋
                </h1>
                <p className="text-muted-foreground text-sm">
                  Ready to grow your wealth?
                </p>
              </div>

            {/* System Alerts */}
            {userProfile?.status !== 'active' && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Complete your profile verification to unlock full trading capabilities.
                </AlertDescription>
              </Alert>
            )}

            {/* Marketing CTAs */}
            <MarketingCTAs />
          </div>

          {/* Smart Insights */}
          {!intelligenceLoading && intelligence.insights.length > 0 && (
            <section>
              <SmartInsightsWidget 
                insights={intelligence.insights}
                nextBestAction={intelligence.nextBestAction}
              />
            </section>
          )}

          {/* Investment Health */}
          {totalShares > 0 && (
            <section>
              <InvestmentHealthScore
                score={intelligence.investmentHealth}
                totalShares={totalShares}
                portfolioValue={sharesValue}
                roi={sharesROI}
              />
            </section>
          )}

          {/* Main Navigation - Portfolio Summary */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Portfolio Overview</h2>
            <DashboardNavigationGrid
              userWallets={wallets}
              sharesValue={sharesValue}
              sharesROI={sharesROI}
              referralEarnings={referralEarnings}
              agentEarnings={agentEarnings}
              isAgent={isAgent}
            />
          </section>

          {/* Market Insights & Company Performance */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Market Insights & Performance</h2>
            <DashboardSummaryGrid
              lastDividendPayout={companyData.lastDividend}
              companyPerformance={{
                totalSharesSold: companyData.totalSharesSold,
                currentSharePrice: companyData.currentSharePrice
              }}
              ordersStatus={ordersStatus}
              latestNotice={companyData.latestNotice}
            />
          </section>

          {/* Business Hub */}
          {(summary?.referrals || isAgent) && (
            <section>
              <UnifiedBusinessHub
                userId={user?.id || ''}
                referralStats={{
                  totalReferrals: 0,
                  activeReferrals: 0,
                  totalCommissions: (summary?.referrals?.realisedCommission || 0) + (summary?.referrals?.expectedCommission || 0),
                  pendingCommissions: summary?.referrals?.expectedCommission || 0
                }}
                agentStats={isAgent ? {
                  totalClients: 0,
                  activeClients: 0,
                  totalEarnings: summary?.agent?.totalCommissions || 0,
                  monthlyEarnings: summary?.agent?.totalCommissions || 0
                } : undefined}
                isAgent={isAgent}
              />
            </section>
          )}

          {/* Recent Activities */}
          <section>
            <DashboardActivityFeed activities={recentActivities} />
          </section>

          {/* Social Links & Support Footer */}
          <section>
            <DashboardSocialFooter />
          </section>
        </div>
        </MobileBottomPadding>
      </UserLayout>
    </>
  );
};

export default Dashboard;
