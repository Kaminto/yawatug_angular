
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Users, DollarSign, Package, Activity } from 'lucide-react';

interface PoolStatsDashboardProps {
  shareData: any;
}

const PoolStatsDashboard: React.FC<PoolStatsDashboardProps> = ({ shareData }) => {
  const [poolStats, setPoolStats] = useState({
    totalHolders: 0,
    totalSold: 0,
    totalValue: 0,
    averageHolding: 0,
    distributionRate: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shareData) {
      loadPoolStats();
    }
  }, [shareData]);

  const loadPoolStats = async () => {
    if (!shareData) return;
    
    try {
      // Get total unique holders
      const { data: holders, error: holdersError } = await supabase
        .from('user_share_holdings')
        .select('user_id')
        .eq('share_id', shareData.id);

      if (holdersError) throw holdersError;

      const uniqueHolders = new Set(holders?.map(h => h.user_id) || []).size;

      // Get total sold shares from completed transactions
      const { data: transactions, error: transError } = await supabase
        .from('share_transactions')
        .select('quantity')
        .eq('share_id', shareData.id)
        .eq('transaction_type', 'purchase')
        .eq('status', 'completed');

      if (transError) throw transError;

      const totalSold = transactions?.reduce((sum, tx) => sum + tx.quantity, 0) || 0;

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentTrans, error: recentError } = await supabase
        .from('share_transactions')
        .select('id')
        .eq('share_id', shareData.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (recentError) throw recentError;

      const totalValue = totalSold * shareData.price_per_share;
      const averageHolding = uniqueHolders > 0 ? totalSold / uniqueHolders : 0;
      const distributionRate = (totalSold / shareData.total_shares) * 100;

      setPoolStats({
        totalHolders: uniqueHolders,
        totalSold,
        totalValue,
        averageHolding: Math.round(averageHolding),
        distributionRate,
        recentActivity: recentTrans?.length || 0
      });
    } catch (error) {
      console.error('Error loading pool stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading pool statistics...</div>;
  }

  const statsCards = [
    {
      title: 'Total Shareholders',
      value: poolStats.totalHolders,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Shares Sold',
      value: poolStats.totalSold.toLocaleString(),
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Value',
      value: `${shareData.currency} ${poolStats.totalValue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Avg. Holding',
      value: poolStats.averageHolding.toLocaleString(),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.title}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribution Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Share Distribution</span>
            <Badge variant="outline">
              {poolStats.distributionRate.toFixed(1)}% Distributed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={poolStats.distributionRate} className="mb-4" />
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-green-600">
                {poolStats.totalSold.toLocaleString()}
              </div>
              <div className="text-muted-foreground">Sold</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-600">
                {shareData.available_shares.toLocaleString()}
              </div>
              <div className="text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-purple-600">
                {(shareData.reserved_shares || 0).toLocaleString()}
              </div>
              <div className="text-muted-foreground">Reserved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity (7 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{poolStats.recentActivity}</div>
            <div className="text-sm text-muted-foreground">
              transactions in the last week
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoolStatsDashboard;
