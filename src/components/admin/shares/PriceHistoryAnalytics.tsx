import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Activity, Download, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PriceHistoryAnalyticsProps {
  shareData: any;
  onRefresh?: () => void;
}

interface PriceRecord {
  id: string;
  date: string;
  price_per_share: number;
  previous_price: number;
  price_change_percent: number;
  calculation_method: string;
  currency: string;
  admin_notes?: string;
  calculation_factors?: any;
  created_at: string;
}

interface PriceMetrics {
  current_price: number;
  highest_price: number;
  lowest_price: number;
  average_price: number;
  total_changes: number;
  positive_changes: number;
  negative_changes: number;
  volatility: number;
  growth_rate_30d: number;
  growth_rate_7d: number;
}

const PriceHistoryAnalytics: React.FC<PriceHistoryAnalyticsProps> = ({ shareData, onRefresh }) => {
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<PriceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (shareData?.id) {
      loadPriceHistory();
    }
  }, [shareData, timeRange]);

  const loadPriceHistory = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));

      // Get price history
      const { data: historyData, error: historyError } = await supabase
        .from('share_price_history')
        .select('*')
        .eq('share_id', shareData.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      const history = historyData || [];
      setPriceHistory(history);

      // Transform data for charts
      const transformedData = history
        .reverse()
        .map((record, index) => ({
          date: new Date(record.created_at).toLocaleDateString(),
          price: record.price_per_share,
          change: record.price_change_percent || 0,
          method: record.calculation_method,
          volume: Math.random() * 1000 + 500, // Mock volume data
        }));

      setChartData(transformedData);

      // Calculate metrics
      if (history.length > 0) {
        const prices = history.map(h => h.price_per_share);
        const changes = history.map(h => h.price_change_percent || 0);
        
        const currentPrice = history[0].price_per_share;
        const highestPrice = Math.max(...prices);
        const lowestPrice = Math.min(...prices);
        const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        // Calculate volatility (standard deviation of changes)
        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
        const volatility = Math.sqrt(changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length);

        // Calculate growth rates
        const growth30d = history.length > 1 ? ((currentPrice - history[history.length - 1].price_per_share) / history[history.length - 1].price_per_share) * 100 : 0;
        const growth7d = history.length > 7 ? ((currentPrice - history[7].price_per_share) / history[7].price_per_share) * 100 : 0;

        setMetrics({
          current_price: currentPrice,
          highest_price: highestPrice,
          lowest_price: lowestPrice,
          average_price: averagePrice,
          total_changes: history.length,
          positive_changes: changes.filter(c => c > 0).length,
          negative_changes: changes.filter(c => c < 0).length,
          volatility: volatility,
          growth_rate_30d: growth30d,
          growth_rate_7d: growth7d
        });
      }

    } catch (error) {
      console.error('Error loading price history:', error);
      toast.error('Failed to load price history');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (priceHistory.length === 0) return;

    const csvData = [
      ['Date', 'Price', 'Previous Price', 'Change %', 'Method', 'Notes'],
      ...priceHistory.map(record => [
        new Date(record.created_at).toLocaleString(),
        record.price_per_share,
        record.previous_price || '',
        record.price_change_percent || '',
        record.calculation_method,
        record.admin_notes || ''
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-history-${shareData.currency}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Activity className="h-6 w-6 animate-spin mr-2" />
            Loading price history...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Price History & Analytics</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadPriceHistory} 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="180">6 Months</SelectItem>
              <SelectItem value="365">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{shareData.currency} {metrics.current_price.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Current Price</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{shareData.currency} {metrics.highest_price.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Highest ({timeRange}d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{shareData.currency} {metrics.lowest_price.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Lowest ({timeRange}d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{metrics.volatility.toFixed(2)}%</div>
              <p className="text-sm text-muted-foreground">Volatility</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Growth Performance */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="flex items-center">
                  {metrics.growth_rate_7d >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-2" />
                  )}
                  <span className={`font-semibold ${metrics.growth_rate_7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.growth_rate_7d.toFixed(2)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">7-Day Growth</p>
              </div>
              <div>
                <div className="flex items-center">
                  {metrics.growth_rate_30d >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-2" />
                  )}
                  <span className={`font-semibold ${metrics.growth_rate_30d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.growth_rate_30d.toFixed(2)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">30-Day Growth</p>
              </div>
              <div>
                <div className="text-sm">
                  <Badge variant="outline" className="mr-2">
                    {metrics.positive_changes} Up
                  </Badge>
                  <Badge variant="outline">
                    {metrics.negative_changes} Down
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Price Changes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts and Data */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Price Chart</TabsTrigger>
          <TabsTrigger value="changes">Price Changes</TabsTrigger>
          <TabsTrigger value="methods">By Method</TabsTrigger>
          <TabsTrigger value="table">Data Table</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Trend ({timeRange} days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={['dataMin - 1000', 'dataMax + 1000']} />
                    <Tooltip 
                      formatter={(value, name) => [`${shareData.currency} ${value?.toLocaleString()}`, 'Price']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Changes (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name) => [`${typeof value === 'number' ? value.toFixed(2) : value}%`, 'Change']}
                    />
                    <Bar dataKey="change">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.change >= 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Methods Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(
                  priceHistory.reduce((acc, record) => {
                    acc[record.calculation_method] = (acc[record.calculation_method] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([method, count]) => (
                  <div key={method} className="flex justify-between items-center">
                    <Badge variant="outline" className="capitalize">{method.replace('_', ' ')}</Badge>
                    <span className="font-medium">{count} changes</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price History Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.slice(0, 50).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.created_at).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        {shareData.currency} {record.price_per_share.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {record.price_change_percent && (
                          <Badge variant={record.price_change_percent >= 0 ? "default" : "destructive"}>
                            {record.price_change_percent.toFixed(2)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {record.calculation_method.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.admin_notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PriceHistoryAnalytics;