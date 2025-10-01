
import React from 'react';
import { format, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface SharePriceHistoryChartProps {
  priceHistory: any[];
}

const SharePriceHistoryChart: React.FC<SharePriceHistoryChartProps> = ({ priceHistory }) => {
  // Sort history by date ascending for proper chart display
  const sortedData = [...priceHistory].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  // Format data for charts
  const chartData = sortedData.map(item => ({
    date: formatDateValue(item.date),
    price: item.price_per_share,
    currency: item.currency,
    method: item.calculation_method
  }));

  // Format date values consistently
  function formatDateValue(dateValue: string | Date): string {
    if (!dateValue) return '';
    
    try {
      const date = typeof dateValue === 'string' 
        ? parseISO(dateValue)
        : dateValue;
      return format(date, 'MMM d');
    } catch (error) {
      console.error("Error parsing date:", error);
      return '';
    }
  }

  // Find initial price for reference line (if exists)
  const initialPrice = sortedData.length > 0 ? sortedData[0].price_per_share : 0;

  // Calculate price change percentage for the entire period
  const priceChangePercentage = priceHistory.length > 1 
    ? ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price) * 100 
    : 0;

  // Custom tooltip formatter for better display
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded p-3 shadow-sm">
          <p className="text-sm font-semibold">{`${label}`}</p>
          <p className="text-sm text-yawatu-gold">
            {`Price: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: payload[0].payload.currency || 'USD'
            }).format(payload[0].value)}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {`Method: ${payload[0].payload.method || 'manual'}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (priceHistory.length < 2) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Not enough price history data to display chart</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between mb-2">
        <div>
          <p className="text-sm font-medium">
            Period Change: <span className={priceChangePercentage >= 0 ? "text-green-600" : "text-red-600"}>
              {priceChangePercentage >= 0 ? "+" : ""}{priceChangePercentage.toFixed(2)}%
            </span>
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">
            Current Price: <span className="text-yawatu-gold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: chartData[chartData.length - 1]?.currency || 'USD'
              }).format(chartData[chartData.length - 1]?.price || 0)}
            </span>
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.1} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }} 
            tickLine={false}
          />
          <YAxis 
            tickFormatter={(value) => value.toLocaleString()} 
            tick={{ fontSize: 12 }} 
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <ReferenceLine 
            y={initialPrice} 
            stroke="#888" 
            strokeDasharray="3 3"
            label={{ 
              value: "Initial Price", 
              position: "insideBottomRight",
              fontSize: 10
            }} 
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            name="Share Price" 
            stroke="#D4AF37" 
            strokeWidth={2} 
            activeDot={{ r: 8 }} 
            dot={{ r: 4, strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SharePriceHistoryChart;
