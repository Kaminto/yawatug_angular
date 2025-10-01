
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, Clock, XCircle, TrendingUp, DollarSign } from 'lucide-react';

const AdminInsights = () => {
  const [insights, setInsights] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    pendingVerification: 0,
    blockedUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    pendingWalletRequests: 0,
    shareTransactions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      // Get user statistics
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: verifiedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: pendingVerification } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_verification');

      const { count: blockedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'blocked');

      // Get transaction statistics
      const { count: totalTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      const { data: volumeData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('currency', 'UGX');

      const totalVolume = volumeData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Get pending wallet requests
      const { count: pendingWalletRequests } = await supabase
        .from('wallet_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get share transactions
      const { count: shareTransactions } = await supabase
        .from('share_transactions')
        .select('*', { count: 'exact', head: true });

      setInsights({
        totalUsers: totalUsers || 0,
        verifiedUsers: verifiedUsers || 0,
        pendingVerification: pendingVerification || 0,
        blockedUsers: blockedUsers || 0,
        totalTransactions: totalTransactions || 0,
        totalVolume,
        pendingWalletRequests: pendingWalletRequests || 0,
        shareTransactions: shareTransactions || 0
      });
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading insights...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.verifiedUsers}</div>
            <p className="text-xs text-muted-foreground">
              {insights.totalUsers > 0 ? 
                `${((insights.verifiedUsers / insights.totalUsers) * 100).toFixed(1)}% of total` : 
                '0% of total'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.pendingVerification}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Users</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.blockedUsers}</div>
            <p className="text-xs text-muted-foreground">Restricted accounts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaction Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {insights.totalVolume.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total volume</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.pendingWalletRequests}</div>
            <p className="text-xs text-muted-foreground">Wallet operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Share Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.shareTransactions}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminInsights;
