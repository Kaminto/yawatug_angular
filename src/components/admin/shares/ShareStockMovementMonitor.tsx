import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, Share2, Users, AlertCircle, 
  RefreshCw, Download, Filter, BarChart3 
} from 'lucide-react';
import { format } from 'date-fns';

interface Movement {
  id: string;
  movement_type: string;
  source_bucket: string;
  destination_bucket: string;
  quantity: number | null;
  price_per_share: number | null;
  total_value: number | null;
  currency: string | null;
  user_id: string | null;
  share_id: string | null;
  status: string;
  created_at: string;
  description: string | null;
  user_name?: string;
  share_name?: string;
}

const ShareStockMovementMonitor: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [poolStatus, setPoolStatus] = useState<any>(null);

  useEffect(() => {
    loadMovements();
    loadPoolStatus();
  }, [filterType, filterStatus]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('share_stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.eq('movement_type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user names and share names separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(m => m.user_id).filter(Boolean))];
        const shareIds = [...new Set(data.map(m => m.share_id).filter(Boolean))];

        const [usersData, sharesData] = await Promise.all([
          userIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', userIds) : { data: [] },
          shareIds.length > 0 ? supabase.from('shares').select('id, name').in('id', shareIds) : { data: [] }
        ]);

        const userMap = new Map((usersData.data || []).map(u => [u.id, u.full_name]));
        const shareMap = new Map((sharesData.data || []).map(s => [s.id, s.name]));

        const enrichedData = data.map(m => ({
          ...m,
          user_name: m.user_id ? userMap.get(m.user_id) : undefined,
          share_name: m.share_id ? shareMap.get(m.share_id) : undefined
        }));

        setMovements(enrichedData);
      } else {
        setMovements([]);
      }
    } catch (error) {
      console.error('Error loading movements:', error);
      toast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  };

  const loadPoolStatus = async () => {
    try {
      // Get share pool status including reserved shares
      const { data: shareData, error: shareError } = await supabase
        .from('shares')
        .select('*')
        .limit(1)
        .single();

      if (shareError) throw shareError;

      // Get total user holdings
      const { data: userSharesData, error: userSharesError } = await supabase
        .from('user_shares')
        .select('quantity');

      if (userSharesError) throw userSharesError;

      const totalUserHoldings = userSharesData?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Get pending movements
      const { data: pendingData, error: pendingError } = await supabase
        .from('share_stock_movements')
        .select('quantity')
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      const pendingQuantity = pendingData?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Calculate net reserved shares (reserved - issued)
      const reservedShares = shareData?.reserved_shares || 0;
      const reservedIssued = shareData?.reserved_issued || 0;
      const netReservedShares = Math.max(0, reservedShares - reservedIssued);

      // Discrepancy = Total - (Available + User Holdings + Net Reserved)
      const calculatedTotal = (shareData?.available_shares || 0) + totalUserHoldings + netReservedShares;
      const discrepancy = Math.abs((shareData?.total_shares || 0) - calculatedTotal);

      setPoolStatus({
        totalShares: shareData?.total_shares || 0,
        availableShares: shareData?.available_shares || 0,
        userHoldings: totalUserHoldings,
        pendingMovements: pendingQuantity,
        reservedShares: reservedShares,
        reservedIssued: reservedIssued,
        netReservedShares: netReservedShares,
        discrepancy: discrepancy
      });
    } catch (error) {
      console.error('Error loading pool status:', error);
    }
  };

  const refreshBalanceView = async () => {
    try {
      // Refresh data by reloading
      await loadPoolStatus();
      await loadMovements();
      toast.success('Balance reconciliation refreshed');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Failed to refresh');
    }
  };

  const exportMovements = () => {
    const csv = [
      ['Date', 'Type', 'User', 'Quantity', 'Price', 'Total', 'Status', 'Description'].join(','),
      ...movements.map(m => [
        format(new Date(m.created_at), 'yyyy-MM-dd HH:mm:ss'),
        m.movement_type,
        m.user_name || 'N/A',
        m.quantity,
        m.price_per_share,
        m.total_value,
        m.status,
        m.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `share-movements-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getMovementIcon = (type: string) => {
    const poolReducing = ['purchase', 'booking', 'company_issue', 'reserve_issue', 'dividend_issue'];
    return poolReducing.includes(type) ? <TrendingDown className="h-4 w-4 text-red-500" /> : 
           <TrendingUp className="h-4 w-4 text-green-500" />;
  };

  const getMovementBadgeColor = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    if (['company_issue', 'reserve_issue'].includes(type)) return 'default';
    if (type === 'dividend_issue') return 'secondary';
    if (type === 'share_sale') return 'destructive';
    return 'outline';
  };

  // Safe number formatting helpers to avoid calling toLocaleString on null/undefined
  const fmtNumber = (n?: number | null) => (n ?? 0).toLocaleString();
  const fmtCurrency = (n?: number | null, cur?: string | null) => `${cur || 'UGX'} ${fmtNumber(n)}`;

  return (
    <div className="space-y-6">
      {/* Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issued</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNumber(poolStatus?.totalShares)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Pool</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNumber(poolStatus?.availableShares)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Holdings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNumber(poolStatus?.userHoldings)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Reserves</CardTitle>
            <Share2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{fmtNumber(poolStatus?.netReservedShares)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {fmtNumber(poolStatus?.reservedShares)} reserved, {fmtNumber(poolStatus?.reservedIssued)} issued
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtNumber(poolStatus?.pendingMovements)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discrepancy</CardTitle>
            <AlertCircle className={`h-4 w-4 ${poolStatus?.discrepancy > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${poolStatus?.discrepancy > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {fmtNumber(poolStatus?.discrepancy)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="movements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movements">Movement History</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Share Stock Movements</CardTitle>
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="company_issue">Company Issue</SelectItem>
                      <SelectItem value="reserve_issue">Reserve Issue</SelectItem>
                      <SelectItem value="dividend_issue">Dividend Issue</SelectItem>
                      <SelectItem value="share_sale">Share Sale</SelectItem>
                      <SelectItem value="transfer_in">Transfer In</SelectItem>
                      <SelectItem value="transfer_out">Transfer Out</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" onClick={loadMovements}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>

                  <Button variant="outline" size="sm" onClick={exportMovements}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading movements...</div>
              ) : movements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No movements found</div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {movements.map((movement) => (
                    <div key={movement.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          {getMovementIcon(movement.movement_type)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getMovementBadgeColor(movement.movement_type)}>
                                {movement.movement_type.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <span className="font-medium">{movement.user_name || 'System'}</span>
                              {movement.share_name && (
                                <span className="text-sm text-muted-foreground">• {movement.share_name}</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{movement.description || 'No description'}</p>
                            <div className="flex gap-4 mt-2 text-sm">
                              <span>Quantity: <strong>{fmtNumber(movement.quantity)}</strong></span>
                              <span>Price: <strong>{fmtCurrency(movement.price_per_share, movement.currency)}</strong></span>
                              <span>Total: <strong>{fmtCurrency(movement.total_value, movement.currency)}</strong></span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{movement.status}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(movement.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Pool Reconciliation</CardTitle>
                <Button onClick={refreshBalanceView}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Balance View
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Issued Shares</p>
                    <p className="text-2xl font-bold">{fmtNumber(poolStatus?.totalShares)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available in Pool</p>
                    <p className="text-2xl font-bold">{fmtNumber(poolStatus?.availableShares)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total User Holdings</p>
                    <p className="text-2xl font-bold">{fmtNumber(poolStatus?.userHoldings)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Admin Net Reserves</p>
                    <p className="text-2xl font-bold text-blue-600">{fmtNumber(poolStatus?.netReservedShares)}</p>
                    <p className="text-xs text-muted-foreground">
                      ({fmtNumber(poolStatus?.reservedShares)} - {fmtNumber(poolStatus?.reservedIssued)} issued)
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Calculated Total (Pool + Users + Reserves)</p>
                    <p className="text-2xl font-bold">
                      {((poolStatus?.availableShares || 0) + (poolStatus?.userHoldings || 0) + (poolStatus?.netReservedShares || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>

                {poolStatus?.discrepancy > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-900">Discrepancy Detected</h4>
                        <p className="text-sm text-red-700">
                          There is a {poolStatus.discrepancy} share discrepancy between total issued and (pool + user holdings + admin reserves).
                          Please review the share stock movements and reconcile.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {poolStatus?.discrepancy === 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-900">Pool Balanced</h4>
                        <p className="text-sm text-green-700">
                          All shares are properly accounted for. Total issued = Pool + User holdings + Admin net reserves.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Movement Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Movement analytics and charts coming soon</p>
                <p className="text-sm">Track trends, volumes, and patterns in share movements</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShareStockMovementMonitor;