import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { MobileBottomPadding } from '@/components/layout/MobileBottomPadding';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSingleShareSystem } from '@/hooks/useSingleShareSystem';
import UserTradingHub from '@/components/shares/UserTradingHub';
import PortfolioQuickStats from '@/components/shares/PortfolioQuickStats';
import UnifiedTransactionHistory from '@/components/shares/UnifiedTransactionHistory';
import SimplifiedDividendDashboard from '@/components/shares/SimplifiedDividendDashboard';
import BusinessSummaryWidget from '@/components/shares/BusinessSummaryWidget';
import { useUserSharesBalance } from '@/hooks/useUserSharesBalance';

interface UserShare {
  id: string;
  user_id: string;
  share_id: string;
  share_name?: string;
  quantity: number;
  purchase_price_per_share: number;
  currency: string;
  created_at: string;
  updated_at: string;
  status: string;
  grace_period_ends_at: string;
}

const EnhancedUserShares = () => {
  const [userShares, setUserShares] = useState<UserShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('buy');
  const { shareData: sharePool, loading: shareLoading } = useSingleShareSystem();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userWallets, setUserWallets] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>('');
  const { directShares, progressiveShares, totalShares } = useUserSharesBalance(userId);

  useEffect(() => {
    loadUserShares();
    loadUserData();

    // Set up real-time subscriptions to keep data fresh
    const userSharesChannel = supabase
      .channel('user-shares-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_shares' },
        (payload) => {
          console.log('User shares change detected:', payload);
          loadUserShares();
        }
      )
      .subscribe();

    const transactionsChannel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          console.log('Transaction change detected:', payload);
          loadUserShares();
          loadUserData(); // Reload wallets as well
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userSharesChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Set user id only if changed
      setUserId((prev) => (prev !== user.id ? user.id : prev));

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserProfile(profile);

      // Load user wallets
      const { data: wallets } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id);

      setUserWallets(wallets || []);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadUserShares = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load all user shares (single share system - show all shares)
      const result = await supabase
        .from('user_shares')
        .select('*')
        .eq('user_id', user.id) as any;

      if (result.error) {
        console.error('Database error:', result.error);
        throw result.error;
      }

      // For single share system, show all user shares
      setUserShares(result.data || []);
    } catch (error) {
      console.error('Error loading user shares:', error);
      toast.error('Failed to load your shares');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionComplete = async () => {
    await loadUserShares();
    await loadUserData();
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Share Trading' }
  ];

  if (loading || shareLoading) {
    return (
      <UserLayout title="Share Trading" breadcrumbs={breadcrumbs}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Share Trading" breadcrumbs={breadcrumbs}>
      <MobileBottomPadding>
        <div className="p-4 sm:p-6 space-y-6 max-w-full overflow-hidden">
          <PortfolioQuickStats 
            userShares={userShares}
            userWallets={userWallets}
            sharePool={sharePool}
            totalSharesOverride={totalShares}
          />

          {/* Enhanced Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 mb-6">
              <TabsTrigger value="buy" className="text-sm font-medium">
                Buy Shares
              </TabsTrigger>
              <TabsTrigger value="sell" className="text-sm font-medium">
                Sell Shares
              </TabsTrigger>
              <TabsTrigger value="transfer" className="text-sm font-medium">
                Transfer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buy">
              <UserTradingHub
                sharePool={sharePool}
                userProfile={userProfile}
                userId={userId}
                userWallets={userWallets}
                userShares={userShares}
                onTransactionComplete={handleTransactionComplete}
                activeTab="buy"
              />
            </TabsContent>
            
            <TabsContent value="sell">
              <UserTradingHub
                sharePool={sharePool}
                userProfile={userProfile}
                userId={userId}
                userWallets={userWallets}
                userShares={userShares}
                onTransactionComplete={handleTransactionComplete}
                activeTab="sell"
              />
            </TabsContent>
            
            <TabsContent value="transfer">
              <UserTradingHub
                sharePool={sharePool}
                userProfile={userProfile}
                userId={userId}
                userWallets={userWallets}
                userShares={userShares}
                onTransactionComplete={handleTransactionComplete}
                activeTab="transfer"
              />
            </TabsContent>
          </Tabs>

          {/* Dividends Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Dividends</h2>
            <SimplifiedDividendDashboard 
              userId={userId} 
              totalShares={totalShares}
            />
          </div>

          {/* Business Summary */}
          <BusinessSummaryWidget 
            userId={userId}
            userShares={userShares}
            sharePool={sharePool}
          />

          {/* Transaction History at Bottom */}
          <UnifiedTransactionHistory userId={userId} />
        </div>
      </MobileBottomPadding>
    </UserLayout>
  );
};

export default EnhancedUserShares;
