import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';

interface AdvancedPortfolioChartsProps {
  userShares: any[];
  sharePool: any;
}

const AdvancedPortfolioCharts: React.FC<AdvancedPortfolioChartsProps> = ({ userShares, sharePool }) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
  const [performanceComparison, setPerformanceComparison] = useState<any[]>([]);
  const [correlationData, setCorrelationData] = useState<any[]>([]);

  useEffect(() => {
    generateMockData();
  }, [timeRange, userShares]);

  const generateMockData = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const currentValue = userShares.reduce((sum, share) => 
      sum + (share.quantity * (share.shares?.price_per_share || 0)), 0);
    
    // Generate portfolio value over time
    const portfolioData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      const volatility = 0.02 + Math.random() * 0.03;
      const change = (Math.random() - 0.5) * volatility;
      const baseValue = currentValue * (0.9 + Math.random() * 0.2);
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.round(baseValue * (1 + change)),
        invested: Math.round(baseValue * 0.95),
        gains: Math.round(baseValue * change),
        volume: Math.round(Math.random() * 1000000)
      };
    });

    // Generate performance comparison
    const comparisonData = userShares.map(share => ({
      name: share.shares?.name || 'Share',
      currentValue: share.quantity * (share.shares?.price_per_share || 0),
      invested: share.quantity * (share.purchase_price_per_share || share.shares?.price_per_share || 0),
      returns: ((share.shares?.price_per_share || 0) - (share.purchase_price_per_share || 0)) / (share.purchase_price_per_share || 1) * 100,
      volatility: 5 + Math.random() * 15,
      sharpeRatio: 0.5 + Math.random() * 2
    }));

    // Generate correlation data
    const correlationMatrix = userShares.map(share => ({
      name: share.shares?.name || 'Share',
      market: 0.3 + Math.random() * 0.6,
      mining: 0.7 + Math.random() * 0.3,
      tech: Math.random() * 0.4,
      energy: 0.4 + Math.random() * 0.4
    }));

    setPortfolioHistory(portfolioData);
    setPerformanceComparison(comparisonData);
    setCorrelationData(correlationMatrix);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Advanced Portfolio Analytics</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
            <SelectItem value="90d">90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="value" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="value" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Value
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Risk
          </TabsTrigger>
          <TabsTrigger value="correlation" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Correlation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="value" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Value Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={portfolioHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `UGX ${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: any) => [`UGX ${value.toLocaleString()}`, 'Value']} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.1}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="invested" 
                    stroke="hsl(var(--muted-foreground))" 
                    fill="hsl(var(--muted-foreground))" 
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Returns vs Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="returns" fill="hsl(var(--primary))" name="Returns %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk-Return Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={performanceComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="volatility" name="Volatility" unit="%" />
                  <YAxis type="number" dataKey="returns" name="Returns" unit="%" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter dataKey="currentValue" fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Correlation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {correlationData.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <h4 className="font-medium">{item.name}</h4>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Market:</span>
                        <span className="font-medium">{item.market.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mining:</span>
                        <span className="font-medium">{item.mining.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tech:</span>
                        <span className="font-medium">{item.tech.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Energy:</span>
                        <span className="font-medium">{item.energy.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedPortfolioCharts;