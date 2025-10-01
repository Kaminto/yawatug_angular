import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowRight, 
  ArrowDown, 
  ArrowUp, 
  Repeat, 
  Activity,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FlowNode {
  id: string;
  label: string;
  type: 'wallet' | 'admin' | 'external';
  balance?: number;
  currency?: string;
  transactions: number;
  volume: number;
}

interface FlowEdge {
  from: string;
  to: string;
  type: 'deposit' | 'withdraw' | 'transfer' | 'fee';
  amount: number;
  count: number;
  currency: string;
}

interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  timeRange: string;
  totalVolume: Record<string, number>;
}

const TransactionFlowVisualizer: React.FC = () => {
  const [flowData, setFlowData] = useState<FlowData>({
    nodes: [],
    edges: [],
    timeRange: '24h',
    totalVolume: {}
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedCurrency, setSelectedCurrency] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadFlowData = async () => {
    try {
      const hoursBack = selectedTimeRange === '24h' ? 24 : selectedTimeRange === '7d' ? 168 : 720;
      const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      // Load transaction data
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, currency, transaction_type, user_id, created_at, status')
        .gte('created_at', startDate)
        .eq('status', 'completed');

      // Load wallet data
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id, user_id, currency, balance');

      // Load admin wallets
      const { data: adminWallets } = await supabase
        .from('admin_sub_wallets')
        .select('id, wallet_type, currency, balance');

      if (!transactions || !wallets) return;

      // Filter by currency if selected
      const filteredTransactions = selectedCurrency === 'all' 
        ? transactions 
        : transactions.filter(t => t.currency === selectedCurrency);

      // Create nodes
      const nodes: FlowNode[] = [];
      const userWalletMap = new Map<string, FlowNode>();
      const adminWalletMap = new Map<string, FlowNode>();

      // Process user wallets
      wallets.forEach(wallet => {
        const key = `${wallet.user_id}-${wallet.currency}`;
        if (!userWalletMap.has(key)) {
          const walletTransactions = filteredTransactions.filter(t => 
            t.user_id === wallet.user_id && t.currency === wallet.currency
          );
          
          userWalletMap.set(key, {
            id: key,
            label: `${wallet.currency} Wallet`,
            type: 'wallet',
            balance: wallet.balance,
            currency: wallet.currency,
            transactions: walletTransactions.length,
            volume: walletTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
          });
        }
      });

      // Process admin wallets
      adminWallets?.forEach(wallet => {
        const key = `admin-${wallet.wallet_type}-${wallet.currency}`;
        adminWalletMap.set(key, {
          id: key,
          label: `${wallet.wallet_type.replace('_', ' ').toUpperCase()} (${wallet.currency})`,
          type: 'admin',
          balance: wallet.balance,
          currency: wallet.currency,
          transactions: 0,
          volume: 0
        });
      });

      // Add external services node
      const externalNode: FlowNode = {
        id: 'external',
        label: 'External Services',
        type: 'external',
        transactions: filteredTransactions.filter(t => 
          t.transaction_type === 'deposit' || t.transaction_type === 'withdraw'
        ).length,
        volume: filteredTransactions
          .filter(t => t.transaction_type === 'deposit' || t.transaction_type === 'withdraw')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      };

      nodes.push(...userWalletMap.values(), ...adminWalletMap.values(), externalNode);

      // Create edges
      const edges: FlowEdge[] = [];
      const edgeMap = new Map<string, FlowEdge>();

      filteredTransactions.forEach(transaction => {
        const userWalletKey = `${transaction.user_id}-${transaction.currency}`;
        
        let from: string, to: string;
        
        switch (transaction.transaction_type) {
          case 'deposit':
            from = 'external';
            to = userWalletKey;
            break;
          case 'withdraw':
            from = userWalletKey;
            to = 'external';
            break;
          case 'transfer':
            // For transfers, we'd need recipient info which might not be available
            from = userWalletKey;
            to = 'external'; // Simplified
            break;
          default:
            return; // Skip unknown types
        }

        const edgeKey = `${from}-${to}-${transaction.transaction_type}`;
        
        if (edgeMap.has(edgeKey)) {
          const edge = edgeMap.get(edgeKey)!;
          edge.amount += Math.abs(transaction.amount);
          edge.count += 1;
        } else {
          edgeMap.set(edgeKey, {
            from,
            to,
            type: transaction.transaction_type as any,
            amount: Math.abs(transaction.amount),
            count: 1,
            currency: transaction.currency
          });
        }
      });

      edges.push(...edgeMap.values());

      // Calculate total volume by currency
      const totalVolume: Record<string, number> = {};
      edges.forEach(edge => {
        totalVolume[edge.currency] = (totalVolume[edge.currency] || 0) + edge.amount;
      });

      setFlowData({
        nodes,
        edges,
        timeRange: selectedTimeRange,
        totalVolume
      });
    } catch (error) {
      console.error('Error loading flow data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlowData();
  }, [selectedTimeRange, selectedCurrency]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'wallet':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'admin':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'external':
        return 'bg-green-100 border-green-300 text-green-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getFlowIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDown className="h-3 w-3 text-green-600" />;
      case 'withdraw':
        return <ArrowUp className="h-3 w-3 text-red-600" />;
      case 'transfer':
        return <ArrowRight className="h-3 w-3 text-blue-600" />;
      case 'fee':
        return <Repeat className="h-3 w-3 text-purple-600" />;
      default:
        return <Activity className="h-3 w-3 text-gray-600" />;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    if (amount >= 1000000) {
      return `${currency} ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${currency} ${(amount / 1000).toFixed(1)}K`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };

  if (loading) {
    return <div className="animate-pulse">Loading transaction flow...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Transaction Flow Visualization
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadFlowData}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium">Time Range</label>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7d</SelectItem>
                  <SelectItem value="30d">Last 30d</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Currency</label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="UGX">UGX</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium">Total Volume</p>
              <div className="flex gap-4 mt-1">
                {Object.entries(flowData.totalVolume).map(([currency, volume]) => (
                  <Badge key={currency} variant="outline">
                    {formatAmount(volume, currency)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flow Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* External Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">External Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {flowData.nodes
                .filter(node => node.type === 'external')
                .map(node => (
                  <div key={node.id} className={`p-4 rounded-lg border-2 ${getNodeColor(node.type)}`}>
                    <h3 className="font-semibold">{node.label}</h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm">Transactions: {node.transactions}</p>
                      <p className="text-sm">Volume: {formatAmount(node.volume, 'UGX')}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction Flows */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Flows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {flowData.edges.map((edge, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getFlowIcon(edge.type)}
                    <div className="text-sm">
                      <p className="font-medium capitalize">{edge.type}</p>
                      <p className="text-muted-foreground">{edge.count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatAmount(edge.amount, edge.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      Avg: {formatAmount(edge.amount / edge.count, edge.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Admin & User Wallets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {flowData.nodes
                .filter(node => node.type === 'admin' || node.type === 'wallet')
                .slice(0, 10) // Show top 10 wallets
                .map(node => (
                  <div key={node.id} className={`p-3 rounded-lg border ${getNodeColor(node.type)}`}>
                    <h4 className="font-medium text-sm">{node.label}</h4>
                    <div className="mt-1 space-y-1">
                      {node.balance && (
                        <p className="text-xs">
                          Balance: {formatAmount(node.balance, node.currency || 'UGX')}
                        </p>
                      )}
                      <p className="text-xs">
                        Activity: {node.transactions} txns, {formatAmount(node.volume, node.currency || 'UGX')}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionFlowVisualizer;