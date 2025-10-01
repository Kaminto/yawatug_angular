
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Download, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

interface AllocationData {
  walletType: string;
  balance: number;
  percentage: number;
  currency: string;
}

const FundAllocationReports = () => {
  const [allocations, setAllocations] = useState<AllocationData[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllocationData();
  }, []);

  const loadAllocationData = async () => {
    try {
      // Get current wallet balances
      const { data: wallets, error: walletsError } = await supabase
        .from('admin_sub_wallets')
        .select('*')
        .eq('is_active', true);

      if (walletsError) throw walletsError;

      // Get fund transfers for allocation tracking
      const { data: transferData, error: transfersError } = await supabase
        .from('admin_wallet_fund_transfers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (transfersError) throw transfersError;

      // Calculate allocations
      const totalBalance = wallets?.reduce((sum, w) => sum + w.balance, 0) || 0;
      
      const allocationData = wallets?.map(wallet => ({
        walletType: wallet.wallet_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        balance: wallet.balance,
        percentage: totalBalance > 0 ? (wallet.balance / totalBalance) * 100 : 0,
        currency: wallet.currency
      })) || [];

      // Group transfers by month for trends
      const monthlyTransfers = transferData?.reduce((acc: any, transfer) => {
        const month = new Date(transfer.created_at).toISOString().substring(0, 7);
        if (!acc[month]) {
          acc[month] = { month, amount: 0, count: 0 };
        }
        acc[month].amount += transfer.amount;
        acc[month].count += 1;
        return acc;
      }, {});

      setAllocations(allocationData);
      setTransfers(Object.values(monthlyTransfers || {}).slice(-6));
    } catch (error) {
      console.error('Error loading allocation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const headers = ['Wallet Type', 'Balance (UGX)', 'Percentage'];
    const csvData = allocations.map(a => [
      a.walletType,
      a.balance,
      `${a.percentage.toFixed(2)}%`
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fund-allocation-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return <div className="animate-pulse">Loading fund allocation reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Fund Allocation Reports</h3>
        <Button onClick={exportReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {allocations.map((allocation, index) => (
          <Card key={allocation.walletType}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                {allocation.walletType}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                UGX {allocation.balance.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                {allocation.percentage.toFixed(1)}% of total funds
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allocation Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Current Fund Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocations}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ walletType, percentage }) => `${walletType} ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="balance"
                >
                  {allocations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Transfer Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Fund Transfer Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transfers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#8884d8" name="Transfer Amount" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Allocation Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Allocation Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allocations.map((allocation, index) => (
              <div key={allocation.walletType} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <h4 className="font-medium">{allocation.walletType}</h4>
                    <p className="text-sm text-muted-foreground">
                      {allocation.percentage.toFixed(2)}% of total allocation
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    UGX {allocation.balance.toLocaleString()}
                  </p>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        backgroundColor: COLORS[index % COLORS.length],
                        width: `${allocation.percentage}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FundAllocationReports;
