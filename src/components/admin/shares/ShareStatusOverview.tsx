
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { PieChart, LineChart, Line, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface ShareStatusProps {
  shareData: {
    total_shares: number;
    available_shares: number;
    reserved_shares: number;
    sold_shares: number;
    booked_shares: number;
    buyback_pending: number;
    price_per_share: number;
    currency: string;
    price_change_percent: number;
  };
  reserveAllocations: any[];
}

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6'];

const ShareStatusOverview: React.FC<ShareStatusProps> = ({ shareData, reserveAllocations }) => {
  // Calculate remaining available shares (excluding booked)
  const actualAvailable = shareData.available_shares - shareData.booked_shares;
  
  // Prepare data for pie chart
  const pieData = [
    { name: 'Available', value: actualAvailable },
    { name: 'Reserved', value: shareData.reserved_shares },
    { name: 'Sold', value: shareData.sold_shares },
    { name: 'Booked', value: shareData.booked_shares },
    { name: 'Pending Buyback', value: shareData.buyback_pending }
  ];
  
  // Calculate percentages
  const getPercentage = (value: number) => {
    return ((value / shareData.total_shares) * 100).toFixed(1) + '%';
  };
  
  // Prepare data for reserve allocations pie chart
  const reserveData = reserveAllocations.map((allocation, index) => ({
    name: allocation.purpose,
    value: allocation.quantity,
    color: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p>{payload[0].value.toLocaleString()} shares</p>
          <p>{((payload[0].value / shareData.total_shares) * 100).toFixed(2)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Share Pool Overview</CardTitle>
          <CardDescription>Current allocation of all company shares</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:justify-around items-center mb-4">
            <div className="text-center mb-4 sm:mb-0">
              <p className="text-sm text-muted-foreground">Total Shares</p>
              <p className="text-2xl font-bold">{shareData.total_shares.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Price</p>
              <div className="flex items-center justify-center">
                <span className="text-2xl font-bold mr-2">
                  {formatCurrency(shareData.price_per_share, shareData.currency)}
                </span>
                {shareData.price_change_percent !== 0 && (
                  <span className={`text-sm flex items-center ${shareData.price_change_percent > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {shareData.price_change_percent > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                    {Math.abs(shareData.price_change_percent).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${getPercentage(value)}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="font-medium">{actualAvailable.toLocaleString()}</p>
              <p className="text-xs">{getPercentage(actualAvailable)}</p>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Reserved</p>
              <p className="font-medium">{shareData.reserved_shares.toLocaleString()}</p>
              <p className="text-xs">{getPercentage(shareData.reserved_shares)}</p>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Sold</p>
              <p className="font-medium">{shareData.sold_shares.toLocaleString()}</p>
              <p className="text-xs">{getPercentage(shareData.sold_shares)}</p>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Booked</p>
              <p className="font-medium">{shareData.booked_shares.toLocaleString()}</p>
              <p className="text-xs">{getPercentage(shareData.booked_shares)}</p>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Pending Buyback</p>
              <p className="font-medium">{shareData.buyback_pending.toLocaleString()}</p>
              <p className="text-xs">{getPercentage(shareData.buyback_pending)}</p>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs text-muted-foreground">Market Cap</p>
              <p className="font-medium">
                {formatCurrency(shareData.sold_shares * shareData.price_per_share, shareData.currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Reserve Allocations</CardTitle>
          <CardDescription>How reserved shares are allocated</CardDescription>
        </CardHeader>
        <CardContent>
          {reserveAllocations.length > 0 ? (
            <>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reserveData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reserveData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 border rounded-md divide-y">
                {reserveAllocations.map((allocation, index) => (
                  <div key={allocation.id} className="p-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span>{allocation.purpose}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{allocation.quantity.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{allocation.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <p className="text-muted-foreground mb-4">No reserve allocations defined</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareStatusOverview;
