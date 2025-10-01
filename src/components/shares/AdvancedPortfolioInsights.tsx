import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

interface AnalyticsProps {
  userId: string;
  userShares: UserShare[];
  currentSharePrice: number;
}

interface PerformanceData {
  date: string;
  value: number;
  investment: number;
  gainLoss: number;
}

interface CostBasisData {
  purchaseDate: string;
  quantity: number;
  pricePerShare: number;
  totalCost: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

const AdvancedPortfolioInsights: React.FC<AnalyticsProps> = ({ 
  userId, 
  userShares, 
  currentSharePrice 
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [costBasisData, setCostBasisData] = useState<CostBasisData[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && userShares.length > 0) {
      loadAnalyticsData();
    }
  }, [userId, userShares, currentSharePrice]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        generatePerformanceData(),
        generateCostBasisAnalysis(),
        generateRecommendations()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePerformanceData = () => {
    // Generate performance data over time
    const data: PerformanceData[] = [];
    const today = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const totalShares = userShares.reduce((sum, share) => sum + share.quantity, 0);
      const totalInvestment = userShares.reduce((sum, share) => 
        sum + (share.quantity * share.purchase_price_per_share), 0
      );
      
      // Simulate price variation (in real app, this would come from historical data)
      const priceVariation = currentSharePrice * (1 + (Math.random() - 0.5) * 0.05);
      const currentValue = totalShares * priceVariation;
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: currentValue,
        investment: totalInvestment,
        gainLoss: currentValue - totalInvestment
      });
    }
    
    setPerformanceData(data);
  };

  const generateCostBasisAnalysis = () => {
    // Group purchases by date for cost basis analysis
    const costBasis: CostBasisData[] = userShares.map(share => {
      const currentValue = share.quantity * currentSharePrice;
      const totalCost = share.quantity * share.purchase_price_per_share;
      const gainLoss = currentValue - totalCost;
      
      return {
        purchaseDate: share.created_at,
        quantity: share.quantity,
        pricePerShare: share.purchase_price_per_share,
        totalCost,
        currentValue,
        gainLoss,
        gainLossPercent: totalCost > 0 ? (gainLoss / totalCost) * 100 : 0
      };
    });
    
    setCostBasisData(costBasis);
  };

  const generateRecommendations = () => {
    const totalShares = userShares.reduce((sum, share) => sum + share.quantity, 0);
    const totalInvestment = userShares.reduce((sum, share) => 
      sum + (share.quantity * share.purchase_price_per_share), 0
    );
    const currentValue = totalShares * currentSharePrice;
    const gainLossPercent = totalInvestment > 0 ? ((currentValue - totalInvestment) / totalInvestment) * 100 : 0;
    
    const recs = [];
    
    if (gainLossPercent > 20) {
      recs.push({
        type: 'profit_taking',
        title: 'Consider Profit Taking',
        description: `You have a ${gainLossPercent.toFixed(1)}% gain. Consider selling some shares to lock in profits.`,
        priority: 'medium'
      });
    }
    
    if (gainLossPercent < -15) {
      recs.push({
        type: 'buy_dip',
        title: 'Buying Opportunity',
        description: 'Your investment is down. This might be a good time to buy more shares at a lower price.',
        priority: 'high'
      });
    }
    
    if (totalShares < 100) {
      recs.push({
        type: 'diversification',
        title: 'Increase Position Size',
        description: 'Consider increasing your position for better dividend returns and portfolio impact.',
        priority: 'low'
      });
    }
    
    setRecommendations(recs);
  };

  const totalInvestment = userShares.reduce((sum, share) => 
    sum + (share.quantity * share.purchase_price_per_share), 0
  );
  const totalShares = userShares.reduce((sum, share) => sum + share.quantity, 0);
  const currentValue = totalShares * currentSharePrice;
  const totalGainLoss = currentValue - totalInvestment;
  const gainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Return on Investment</p>
                <p className={`text-2xl font-bold ${gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Holding Period</p>
                <p className="text-2xl font-bold">
                  {Math.round((Date.now() - new Date(userShares[0]?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalGainLoss >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {totalGainLoss >= 0 ? 
                  <TrendingUp className="h-5 w-5 text-green-600" /> :
                  <TrendingDown className="h-5 w-5 text-red-600" />
                }
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unrealized P&L</p>
                <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  UGX {Math.abs(totalGainLoss).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cost-basis">Cost Basis</TabsTrigger>
          <TabsTrigger value="recommendations">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        `UGX ${Number(value).toLocaleString()}`,
                        name === 'value' ? 'Portfolio Value' : 'Investment Cost'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="investment" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost-basis">
          <Card>
            <CardHeader>
              <CardTitle>Cost Basis Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costBasisData.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {item.quantity} shares @ UGX {item.pricePerShare.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Purchased: {new Date(item.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          UGX {item.totalCost.toLocaleString()} → UGX {item.currentValue.toLocaleString()}
                        </p>
                        <p className={`text-sm ${item.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.gainLoss >= 0 ? '+' : ''}UGX {Math.abs(item.gainLoss).toLocaleString()} 
                          ({item.gainLossPercent >= 0 ? '+' : ''}{item.gainLossPercent.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-4">
            {recommendations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No recommendations at this time. Keep monitoring your portfolio!</p>
                </CardContent>
              </Card>
            ) : (
              recommendations.map((rec, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        rec.priority === 'high' ? 'bg-red-100' : 
                        rec.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <Target className={`h-5 w-5 ${
                          rec.priority === 'high' ? 'text-red-600' : 
                          rec.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-medium">{rec.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedPortfolioInsights;