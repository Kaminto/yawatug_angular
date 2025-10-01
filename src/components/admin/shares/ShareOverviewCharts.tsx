
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { SharePool } from '@/types/custom';

interface ShareOverviewChartsProps {
  shareData: SharePool;
  reserveAllocations?: any[];
}

const ShareOverviewCharts: React.FC<ShareOverviewChartsProps> = ({ shareData, reserveAllocations = [] }) => {
  // Prepare pie chart data
  const pieData = [
    { name: 'Available', value: shareData.available_shares, color: '#10B981' },
    { name: 'Reserved', value: shareData.reserved_shares || 0, color: '#F59E0B' },
    { name: 'Issued', value: shareData.reserved_issued || 0, color: '#3B82F6' },
  ];

  // Calculate sold shares (total - available - reserved)
  const soldShares = shareData.total_shares - shareData.available_shares - (shareData.reserved_shares || 0);
  if (soldShares > 0) {
    pieData.push({ name: 'Sold', value: soldShares, color: '#EF4444' });
  }

  // Summary stats for bar chart
  const summaryData = [
    { name: 'Total Shares', value: shareData.total_shares, color: '#6B7280' },
    { name: 'Available', value: shareData.available_shares, color: '#10B981' },
    { name: 'Reserved', value: shareData.reserved_shares || 0, color: '#F59E0B' },
    { name: 'Issued', value: shareData.reserved_issued || 0, color: '#3B82F6' },
    { name: 'Sold', value: soldShares, color: '#EF4444' }
  ];

  // Reserve allocations data
  const reserveData = reserveAllocations.map(allocation => ({
    name: allocation.purpose,
    value: allocation.quantity,
    percentage: allocation.percentage
  }));

  const marketValue = shareData.total_shares * shareData.price_per_share;
  const availableValue = shareData.available_shares * shareData.price_per_share;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Share Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Share Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Share Summary Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Share Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Market Value Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Market Value Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <span className="font-medium">Total Market Value</span>
              <span className="text-lg font-bold text-blue-600">
                {shareData.currency} {marketValue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <span className="font-medium">Available Value</span>
              <span className="text-lg font-bold text-green-600">
                {shareData.currency} {availableValue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded">
              <span className="font-medium">Current Price</span>
              <span className="text-lg font-bold text-amber-600">
                {shareData.currency} {shareData.price_per_share.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reserve Allocations */}
      {reserveData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reserve Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reserveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      value.toLocaleString(),
                      name === 'value' ? 'Quantity' : name
                    ]}
                  />
                  <Bar dataKey="value" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShareOverviewCharts;
