import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, PiggyBank, Building } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubWallet {
  id: string;
  wallet_type: string;
  wallet_name: string;
  currency: string;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SubWalletSummary {
  type: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  totalUGX: number;
  totalUSD: number;
  wallets: SubWallet[];
  description: string;
}

const AdminSubWalletsOverview = () => {
  const [subWallets, setSubWallets] = useState<SubWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_sub_wallets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubWallets(data || []);
    } catch (error) {
      console.error('Error fetching sub-wallets:', error);
      toast.error('Failed to fetch sub-wallets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubWallets();

    // Set up real-time subscription for admin_sub_wallets changes
    const subscription = supabase
      .channel('admin-sub-wallets-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'admin_sub_wallets'
        },
        (payload) => {
          console.log('Admin wallet balance updated:', payload);
          // Refresh data when any change occurs
          fetchSubWallets();
        }
      )
      .subscribe();

    // Also listen to admin_wallet_fund_transfers for real-time updates
    const transferSubscription = supabase
      .channel('admin-fund-transfers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_wallet_fund_transfers'
        },
        (payload) => {
          console.log('New fund transfer detected:', payload);
          // Refresh data when new transfers occur
          setTimeout(() => fetchSubWallets(), 1000); // Small delay to ensure DB is updated
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(transferSubscription);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubWallets();
  };

  // Group wallets by main categories
  const groupedWallets: SubWalletSummary[] = [
    {
      type: 'admin_fund',
      name: 'Admin Fund',
      icon: <Building className="h-6 w-6" />,
      color: 'hsl(var(--chart-1))',
      totalUGX: subWallets.filter(w => w.wallet_type === 'admin_fund' && w.currency === 'UGX').reduce((sum, w) => sum + w.balance, 0),
      totalUSD: subWallets.filter(w => w.wallet_type === 'admin_fund' && w.currency === 'USD').reduce((sum, w) => sum + w.balance, 0),
      wallets: subWallets.filter(w => w.wallet_type === 'admin_fund'),
      description: 'Operational expenses, salaries, commissions'
    },
    {
      type: 'project_funding',
      name: 'Project Fund',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'hsl(var(--chart-2))',
      totalUGX: subWallets.filter(w => w.wallet_type === 'project_funding' && w.currency === 'UGX').reduce((sum, w) => sum + w.balance, 0),
      totalUSD: subWallets.filter(w => w.wallet_type === 'project_funding' && w.currency === 'USD').reduce((sum, w) => sum + w.balance, 0),
      wallets: subWallets.filter(w => w.wallet_type === 'project_funding'),
      description: 'Mining projects and development funding'
    },
    {
      type: 'share_buyback',
      name: 'Buyback Fund',
      icon: <PiggyBank className="h-6 w-6" />,
      color: 'hsl(var(--chart-3))',
      totalUGX: subWallets.filter(w => w.wallet_type === 'share_buyback' && w.currency === 'UGX').reduce((sum, w) => sum + w.balance, 0),
      totalUSD: subWallets.filter(w => w.wallet_type === 'share_buyback' && w.currency === 'USD').reduce((sum, w) => sum + w.balance, 0),
      wallets: subWallets.filter(w => w.wallet_type === 'share_buyback'),
      description: 'Share repurchase and market stabilization'
    }
  ];

  const grandTotalUGX = groupedWallets.reduce((sum, group) => sum + group.totalUGX, 0);
  const grandTotalUSD = groupedWallets.reduce((sum, group) => sum + group.totalUSD, 0);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Grand Total */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Total Admin Funds</CardTitle>
            <CardDescription>Combined balance across all sub-wallets</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">UGX Balance</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(grandTotalUGX, 'UGX')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">USD Balance</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(grandTotalUSD, 'USD')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-wallet Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {groupedWallets.map((group) => (
          <Card key={group.type} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${group.color}15`, color: group.color }}
                  >
                    {group.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {group.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">
                  {group.wallets.length} wallets
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* UGX Balance */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">UGX</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(group.totalUGX, 'UGX')}
                  </span>
                </div>
                <Progress 
                  value={grandTotalUGX > 0 ? (group.totalUGX / grandTotalUGX) * 100 : 0}
                  className="h-2"
                  style={{ 
                    '--progress-background': group.color,
                  } as any}
                />
              </div>

              {/* USD Balance */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">USD</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(group.totalUSD, 'USD')}
                  </span>
                </div>
                <Progress 
                  value={grandTotalUSD > 0 ? (group.totalUSD / grandTotalUSD) * 100 : 0}
                  className="h-2"
                  style={{ 
                    '--progress-background': group.color,
                  } as any}
                />
              </div>

              {/* Individual Wallets */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Individual Wallets:</p>
                <div className="space-y-1">
                  {group.wallets.map((wallet) => (
                    <div key={wallet.id} className="flex justify-between text-xs">
                      <span className="truncate">{wallet.currency}</span>
                      <span className="font-medium">
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed View */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Sub-wallet Breakdown</CardTitle>
          <CardDescription>
            Complete overview of all admin sub-wallets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admin_fund" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="admin_fund">Admin Fund</TabsTrigger>
              <TabsTrigger value="project_funding">Project Fund</TabsTrigger>
              <TabsTrigger value="share_buyback">Buyback Fund</TabsTrigger>
            </TabsList>
            
            {groupedWallets.map((group) => (
              <TabsContent key={group.type} value={group.type} className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.wallets.map((wallet) => (
                      <Card key={wallet.id} className="border-l-4" style={{ borderLeftColor: group.color }}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{wallet.wallet_name}</p>
                              <p className="text-sm text-muted-foreground">{wallet.currency}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">
                                {formatCurrency(wallet.balance, wallet.currency)}
                              </p>
                              <Badge variant={wallet.is_active ? "default" : "secondary"}>
                                {wallet.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                            Last updated: {new Date(wallet.updated_at).toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubWalletsOverview;