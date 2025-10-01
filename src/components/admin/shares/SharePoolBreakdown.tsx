
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

interface SharePoolBreakdownProps {
  shares: {
    total_shares: number;
    available_shares: number;
    reserved_shares: number;
  };
  reserveAllocations: any[];
}

const COLORS = ['#D4AF37', '#0088FE', '#FF8042', '#FFBB28', '#8884d8', '#82ca9d', '#a4de6c', '#d0ed57'];

const SharePoolBreakdown: React.FC<SharePoolBreakdownProps> = ({ shares, reserveAllocations }) => {
  // Calculate sold shares
  const soldShares = shares.total_shares - shares.available_shares - shares.reserved_shares;
  
  // Basic data with available and sold shares
  const baseData = [
    { name: 'Available', value: shares.available_shares },
    { name: 'Sold', value: soldShares },
  ];
  
  // Add reserve allocations if they exist
  const reserveData = reserveAllocations.map(allocation => ({
    name: allocation.purpose,
    value: allocation.quantity
  }));
  
  // If there are no specific allocations but there are reserved shares, add a generic "Reserved" category
  const chartData = [...baseData];
  
  if (reserveAllocations.length > 0) {
    chartData.push(...reserveData);
  } else if (shares.reserved_shares > 0) {
    chartData.push({ name: 'Reserved', value: shares.reserved_shares });
  }
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded p-3 shadow-sm">
          <p className="font-semibold">{`${data.name}`}</p>
          <p className="text-sm">
            <span className="font-medium">Shares: </span>
            {data.value.toLocaleString()}
          </p>
          <p className="text-sm">
            <span className="font-medium">Percentage: </span>
            {((data.value / shares.total_shares) * 100).toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default SharePoolBreakdown;
