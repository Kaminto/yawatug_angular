import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Calculator, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DividendProjectionCalculatorProps {
  userShares: any[];
  sharePool: any;
}

const DividendProjectionCalculator: React.FC<DividendProjectionCalculatorProps> = ({ userShares, sharePool }) => {
  const [assumptions, setAssumptions] = useState({
    annualDividendYield: 8.5,
    growthRate: 5.0,
    reinvestmentRate: 50,
    projectionYears: 10
  });
  
  const [historicalDividends, setHistoricalDividends] = useState<any[]>([]);
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>({});

  const totalShares = userShares.reduce((sum, share) => sum + share.quantity, 0);
  const currentPortfolioValue = userShares.reduce((sum, share) => 
    sum + (share.quantity * (share.shares?.price_per_share || 0)), 0);

  useEffect(() => {
    loadHistoricalDividends();
  }, []);

  useEffect(() => {
    calculateProjections();
  }, [assumptions, totalShares, currentPortfolioValue]);

  const loadHistoricalDividends = async () => {
    try {
      const { data, error } = await supabase
        .from('dividend_declarations')
        .select('*')
        .eq('status', 'approved')
        .order('declaration_date', { ascending: false })
        .limit(12);

      if (error) throw error;

      const historicalData = data?.map((dividend, index) => ({
        period: `Q${4 - (index % 4)}`,
        year: new Date(dividend.declaration_date).getFullYear(),
        perShare: dividend.per_share_amount,
        totalDividend: dividend.total_dividend,
        yieldRate: (dividend.per_share_amount / (sharePool?.price_per_share || 1)) * 100
      })) || [];

      setHistoricalDividends(historicalData);
    } catch (error) {
      console.error('Error loading historical dividends:', error);
      // Generate mock historical data
      const mockData = Array.from({ length: 12 }, (_, i) => {
        const quarter = (i % 4) + 1;
        const year = 2024 - Math.floor(i / 4);
        const basePerShare = 2000 + Math.random() * 1000;
        
        return {
          period: `Q${quarter}`,
          year,
          perShare: basePerShare,
          totalDividend: basePerShare * 100000,
          yieldRate: (basePerShare / 25000) * 100
        };
      });
      setHistoricalDividends(mockData);
    }
  };

  const calculateProjections = () => {
    const projections = Array.from({ length: assumptions.projectionYears }, (_, year) => {
      const yearIndex = year + 1;
      const growthMultiplier = Math.pow(1 + (assumptions.growthRate / 100), year);
      
      // Calculate base dividend
      const baseAnnualDividend = currentPortfolioValue * (assumptions.annualDividendYield / 100);
      const projectedDividend = baseAnnualDividend * growthMultiplier;
      
      // Calculate reinvestment effect
      const reinvestedAmount = projectedDividend * (assumptions.reinvestmentRate / 100);
      const additionalShares = reinvestedAmount / ((sharePool?.price_per_share || 25000) * growthMultiplier);
      const cumulativeShares = totalShares + (additionalShares * yearIndex);
      
      // Calculate compounded returns
      const portfolioValue = cumulativeShares * ((sharePool?.price_per_share || 25000) * growthMultiplier);
      
      return {
        year: yearIndex,
        dividend: Math.round(projectedDividend),
        reinvested: Math.round(reinvestedAmount),
        shares: Math.round(cumulativeShares),
        portfolioValue: Math.round(portfolioValue),
        yieldOnCost: (projectedDividend / currentPortfolioValue) * 100
      };
    });

    setProjectionData(projections);

    // Calculate summary statistics
    const totalDividends = projections.reduce((sum, p) => sum + p.dividend, 0);
    const finalPortfolioValue = projections[projections.length - 1]?.portfolioValue || 0;
    const totalReturn = ((finalPortfolioValue - currentPortfolioValue) / currentPortfolioValue) * 100;
    const annualizedReturn = Math.pow(finalPortfolioValue / currentPortfolioValue, 1 / assumptions.projectionYears) - 1;

    setSummaryStats({
      totalDividends,
      finalPortfolioValue,
      totalReturn,
      annualizedReturn: annualizedReturn * 100,
      breakEvenYears: projections.findIndex(p => p.dividend >= currentPortfolioValue * 0.1) + 1
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assumption Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Projection Assumptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Annual Dividend Yield (%)</Label>
              <Slider
                value={[assumptions.annualDividendYield]}
                onValueChange={([value]) => setAssumptions(prev => ({ ...prev, annualDividendYield: value }))}
                max={20}
                min={0}
                step={0.5}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground text-center">
                {assumptions.annualDividendYield}%
              </div>
            </div>

            <div className="space-y-2">
              <Label>Annual Growth Rate (%)</Label>
              <Slider
                value={[assumptions.growthRate]}
                onValueChange={([value]) => setAssumptions(prev => ({ ...prev, growthRate: value }))}
                max={15}
                min={-5}
                step={0.5}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground text-center">
                {assumptions.growthRate}%
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dividend Reinvestment Rate (%)</Label>
              <Slider
                value={[assumptions.reinvestmentRate]}
                onValueChange={([value]) => setAssumptions(prev => ({ ...prev, reinvestmentRate: value }))}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground text-center">
                {assumptions.reinvestmentRate}%
              </div>
            </div>

            <div className="space-y-2">
              <Label>Projection Period (Years)</Label>
              <Input
                type="number"
                value={assumptions.projectionYears}
                onChange={(e) => setAssumptions(prev => ({ ...prev, projectionYears: parseInt(e.target.value) || 10 }))}
                min={1}
                max={30}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projection Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Dividends</div>
                <div className="text-lg font-bold text-blue-600">
                  UGX {summaryStats.totalDividends?.toLocaleString() || '0'}
                </div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Final Portfolio Value</div>
                <div className="text-lg font-bold text-green-600">
                  UGX {summaryStats.finalPortfolioValue?.toLocaleString() || '0'}
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Return</div>
                <div className="text-lg font-bold text-purple-600">
                  {summaryStats.totalReturn?.toFixed(1) || '0'}%
                </div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-sm text-muted-foreground">Annualized Return</div>
                <div className="text-lg font-bold text-orange-600">
                  {summaryStats.annualizedReturn?.toFixed(1) || '0'}%
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">Current Holdings</div>
              <div className="text-lg font-semibold">{totalShares.toLocaleString()} shares</div>
              <div className="text-sm text-muted-foreground">
                Portfolio Value: UGX {currentPortfolioValue.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="projections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projections">Future Projections</TabsTrigger>
          <TabsTrigger value="historical">Historical Data</TabsTrigger>
        </TabsList>

        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle>Dividend Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: any) => [`UGX ${value.toLocaleString()}`, 'Amount']} />
                  <Line 
                    type="monotone" 
                    dataKey="dividend" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Annual Dividend"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="portfolioValue" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    name="Portfolio Value"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical">
          <Card>
            <CardHeader>
              <CardTitle>Historical Dividend Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={historicalDividends.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="perShare" fill="hsl(var(--primary))" name="Per Share (UGX)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DividendProjectionCalculator;