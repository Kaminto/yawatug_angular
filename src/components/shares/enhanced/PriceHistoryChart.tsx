import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
interface PriceHistoryChartProps {
  shareId?: string;
  timeRange?: '1D' | '1W' | '1M' | '3M' | '1Y';
}
const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  shareId,
  timeRange = '1M'
}) => {
  const [priceData, setPriceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(timeRange);
  const [priceChange, setPriceChange] = useState({
    amount: 0,
    percentage: 0
  });
  useEffect(() => {
    loadPriceHistory();
  }, [shareId, selectedRange]);
  const loadPriceHistory = async () => {
    try {
      setLoading(true);

      // Calculate date range based on selection
      const endDate = new Date();
      const startDate = new Date();
      switch (selectedRange) {
        case '1D':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '1W':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '1M':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3M':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '1Y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Load price calculations (historical data)
      const {
        data: priceHistory,
        error
      } = await supabase.from('share_price_calculations').select('*').gte('calculation_date', startDate.toISOString()).order('calculation_date', {
        ascending: true
      });
      if (error) throw error;

      // Format data for chart
      const chartData = priceHistory?.map(item => ({
        date: new Date(item.calculation_date).toLocaleDateString(),
        price: item.new_price,
        timestamp: new Date(item.calculation_date).getTime()
      })) || [];

      // If no historical data, create mock data based on current price
      if (chartData.length === 0) {
        const {
          data: currentShare
        } = await supabase.from('shares').select('price_per_share').limit(1).single();
        const currentPrice = currentShare?.price_per_share || 0;
        const mockData = generateMockPriceData(currentPrice, selectedRange);
        setPriceData(mockData);
      } else {
        setPriceData(chartData);
      }

      // Calculate price change
      if (chartData.length >= 2) {
        const firstPrice = chartData[0].price;
        const lastPrice = chartData[chartData.length - 1].price;
        const change = lastPrice - firstPrice;
        const changePercentage = change / firstPrice * 100;
        setPriceChange({
          amount: change,
          percentage: changePercentage
        });
      }
    } catch (error) {
      console.error('Error loading price history:', error);

      // Fallback to mock data
      const mockData = generateMockPriceData(25000, selectedRange);
      setPriceData(mockData);
    } finally {
      setLoading(false);
    }
  };
  const generateMockPriceData = (basePrice: number, range: string) => {
    const points = range === '1D' ? 24 : range === '1W' ? 7 : range === '1M' ? 30 : range === '3M' ? 90 : 365;
    const data = [];
    for (let i = 0; i < points; i++) {
      const date = new Date();
      if (range === '1D') {
        date.setHours(date.getHours() - (points - i));
      } else {
        date.setDate(date.getDate() - (points - i));
      }

      // Generate realistic price movement (±2% daily volatility)
      const volatility = 0.02;
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const price = basePrice * (1 + randomChange * (i / points));
      data.push({
        date: range === '1D' ? date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }) : date.toLocaleDateString(),
        price: Math.round(price),
        timestamp: date.getTime()
      });
    }
    return data;
  };
  const timeRanges = [{
    key: '1D',
    label: '1D'
  }, {
    key: '1W',
    label: '1W'
  }, {
    key: '1M',
    label: '1M'
  }, {
    key: '3M',
    label: '3M'
  }, {
    key: '1Y',
    label: '1Y'
  }];
  const isPositive = priceChange.amount >= 0;
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse">Loading chart...</div>
          </div>
        </CardContent>
      </Card>;
  }
  return;
};
export default PriceHistoryChart;