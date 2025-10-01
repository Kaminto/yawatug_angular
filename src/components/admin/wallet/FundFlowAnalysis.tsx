
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Sankey } from 'recharts';
import { ArrowRight, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface FundFlow {
  id: string;
  from_wallet: string;
  to_wallet: string;
  amount: number;
  currency: string;
  transfer_type: string;
  description: string;
  created_at: string;
}

const FundFlowAnalysis = () => {
  const [flows, setFlows] = useState<FundFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyFlows, setDailyFlows] = useState<any[]>([]);

  useEffect(() => {
    loadFundFlowData();
  }, []);

  const loadFundFlowData = async () => {
    try {
      const { data: transfers, error } = await supabase
        .from('admin_wallet_fund_transfers')
        .select(`
          *,
          from_wallet:from_wallet_id(wallet_name),
          to_wallet:to_wallet_id(wallet_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedFlows = transfers?.map((transfer: any) => ({
        id: transfer.id,
        from_wallet: transfer.from_wallet?.wallet_name || 'External',
        to_wallet: transfer.to_wallet?.wallet_name || 'External', 
        amount: transfer.amount,
        currency: transfer.currency,
        transfer_type: transfer.transfer_type,
        description: transfer.description,
        created_at: transfer.created_at
      })) || [];

      setFlows(formattedFlows);

      // Group by day for trend analysis
      const dailyData = formattedFlows.reduce((acc: any, flow) => {
        const date = new Date(flow.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, inflow: 0, outflow: 0, net: 0 };
        }
        
        if (flow.from_wallet === 'External') {
          acc[date].inflow += flow.amount;
        } else if (flow.to_wallet === 'External') {
          acc[date].outflow += flow.amount;
        }
        
        acc[date].net = acc[date].inflow - acc[date].outflow;
        return acc;
      }, {});

      setDailyFlows(Object.values(dailyData).slice(-30));
    } catch (error) {
      console.error('Error loading fund flow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalInflow = flows
    .filter(f => f.from_wallet === 'External')
    .reduce((sum, f) => sum + f.amount, 0);

  const totalOutflow = flows
    .filter(f => f.to_wallet === 'External')
    .reduce((sum, f) => sum + f.amount, 0);

  const netFlow = totalInflow - totalOutflow;

  if (loading) {
    return <div className="animate-pulse">Loading fund flow analysis...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Inflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              UGX {totalInflow.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total Outflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              UGX {totalOutflow.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Net Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              UGX {netFlow.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Flow Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Fund Flow Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyFlows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="inflow" stroke="#10b981" name="Inflow" />
              <Line type="monotone" dataKey="outflow" stroke="#ef4444" name="Outflow" />
              <Line type="monotone" dataKey="net" stroke="#3b82f6" name="Net Flow" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Fund Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {flows.slice(0, 10).map((flow) => (
              <div key={flow.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="font-medium">{flow.from_wallet}</span>
                    <ArrowRight className="inline h-3 w-3 mx-2" />
                    <span className="font-medium">{flow.to_wallet}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {flow.transfer_type}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">
                    {flow.currency} {flow.amount.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(flow.created_at).toLocaleDateString()}
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

export default FundFlowAnalysis;
