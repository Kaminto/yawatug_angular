
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, TrendingUp, Users, DollarSign, Package, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { ShareData } from '@/types/custom';

interface EnhancedSharePoolOverviewProps {
  shareData: ShareData;
  onUpdate: () => void;
  onNavigate?: (tab: string) => void;
}

const EnhancedSharePoolOverview: React.FC<EnhancedSharePoolOverviewProps> = ({ 
  shareData, 
  onUpdate 
}) => {
  const [reserveAllocations, setReserveAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReserveData();

    // Set up real-time subscription for reserve allocations
    const reserveAllocationsChannel = supabase
      .channel('reserve-allocations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'share_reserve_allocations'
        },
        (payload) => {
          console.log('Reserve allocations changed:', payload);
          loadReserveData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reserveAllocationsChannel);
    };
  }, [shareData]);

  const loadReserveData = async () => {
    try {
      setLoading(true);
      
      // Load reserve allocations
      const { data: allocations, error } = await supabase
        .from('share_reserve_allocations')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setReserveAllocations(allocations || []);
    } catch (error) {
      console.error('Error loading reserve data:', error);
      toast.error('Failed to load reserve data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReserveData();
    onUpdate();
    setRefreshing(false);
    toast.success('Share data refreshed');
  };

  const calculateStats = () => {
    // Use the calculated values from ShareDataManager
    const totalReserved = shareData.reserve_allocated_shares || 0;
    const availableShares = shareData.available_shares || 0;
    const reserveIssued = shareData.reserve_issued_shares || 0;
    const soldShares = shareData.calculated_sold_shares || 0;
    const netReserved = Math.max(0, totalReserved - reserveIssued);
    
    return {
      totalShares: shareData.total_shares,
      soldShares,
      availableShares,
      totalReserved,
      reserveIssued,
      netReserved
    };
  };

  const getUtilizationPercentage = () => {
    const stats = calculateStats();
    return ((stats.soldShares + stats.netReserved) / stats.totalShares) * 100;
  };

  const getAvailabilityStatus = () => {
    const utilization = getUtilizationPercentage();
    if (utilization >= 90) return { color: 'text-red-600', status: 'Critical' };
    if (utilization >= 75) return { color: 'text-yellow-600', status: 'Low' };
    if (utilization >= 50) return { color: 'text-blue-600', status: 'Moderate' };
    return { color: 'text-green-600', status: 'High' };
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const stats = calculateStats();
  const availabilityStatus = getAvailabilityStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{shareData.name} - Pool Overview</h2>
          <p className="text-muted-foreground">
            Real-time share distribution and availability tracking
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Shares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalShares.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Pool Size</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Sold Shares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.soldShares.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.soldShares / stats.totalShares) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${availabilityStatus.color}`}>
              {stats.availableShares.toLocaleString()}
            </div>
            <Badge variant="outline" className={availabilityStatus.color}>
              {availabilityStatus.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Reserved (Net)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.netReserved.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalReserved.toLocaleString()} - {stats.reserveIssued.toLocaleString()} issued
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Current Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {shareData.currency} {shareData.price_per_share.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Per Share</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Market Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">
              {shareData.currency} {(stats.soldShares * shareData.price_per_share).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total Sold</p>
          </CardContent>
        </Card>
      </div>

      {/* Pool Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Pool Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Utilization</span>
                <span className="text-sm font-bold">
                  {getUtilizationPercentage().toFixed(1)}%
                </span>
              </div>
              <Progress value={getUtilizationPercentage()} className="h-3" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sold:</span>
                <span className="font-medium text-blue-600">
                  {((stats.soldShares / stats.totalShares) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reserved:</span>
                <span className="font-medium text-orange-600">
                  {((stats.netReserved / stats.totalShares) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available:</span>
                <span className={`font-medium ${availabilityStatus.color}`}>
                  {((stats.availableShares / stats.totalShares) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reserve Allocations Details */}
      {reserveAllocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reserve Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reserveAllocations.map((allocation) => (
                <div key={allocation.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <div>
                    <span className="font-medium">{allocation.purpose}</span>
                    {allocation.description && (
                      <p className="text-sm text-muted-foreground">{allocation.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{allocation.quantity.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{allocation.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader>
            <CardTitle>Key Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {shareData.price_per_share.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Price per Share</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((stats.soldShares / stats.totalShares) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Pool Sold</div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">Last Updated</div>
                <div className="font-medium">
                  {new Date(shareData.updated_at).toLocaleString()}
                </div>
              </div>
              
              {stats.availableShares <= stats.totalShares * 0.1 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">Low Availability Warning</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Only {stats.availableShares.toLocaleString()} shares remaining ({((stats.availableShares / stats.totalShares) * 100).toFixed(1)}%)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedSharePoolOverview;
