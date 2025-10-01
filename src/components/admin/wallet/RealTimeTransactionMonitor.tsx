import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, DollarSign, TrendingUp, Eye, Filter } from 'lucide-react';

interface Transaction {
  id: string;
  admin_wallet_id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  created_at: string;
  created_by: string;
  description: string;
  reference_id?: string;
  user_profile?: {
    full_name: string;
    email: string;
  };
  risk_score: number;
}

const RealTimeTransactionMonitor = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadTransactions();
    setupRealTimeSubscription();
  }, []);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user profiles separately
      const userIds = [...new Set(data?.map(tx => tx.created_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const processedTransactions = (data || []).map(tx => ({
        ...tx,
        user_profile: profiles?.find(p => p.id === tx.created_by) || {
          full_name: 'System User',
          email: 'system@yawatu.com'
        },
        risk_score: calculateRiskScore(tx),
        reference_id: tx.id
      }));

      setTransactions(processedTransactions);
      setAlerts(processedTransactions.filter(tx => tx.risk_score > 70));
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscription = () => {
    const channel = supabase
      .channel('admin-wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_wallet_transactions'
        },
        () => {
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const calculateRiskScore = (transaction: any): number => {
    let score = 0;
    
    // Amount-based risk
    if (transaction.amount > 10000000) score += 40; // > 10M UGX
    else if (transaction.amount > 5000000) score += 25; // > 5M UGX
    else if (transaction.amount > 1000000) score += 15; // > 1M UGX
    
    // Transaction type risk
    if (transaction.transaction_type === 'withdrawal') score += 20;
    else if (transaction.transaction_type === 'transfer') score += 15;
    
    // Time-based risk (late night transactions)
    const hour = new Date(transaction.created_at).getHours();
    if (hour < 6 || hour > 22) score += 10;
    
    // Frequency risk (would need to check recent transactions)
    // This is a simplified version
    score += 5;
    
    return Math.min(score, 100);
  };

  const getRiskBadge = (score: number) => {
    if (score > 70) return <Badge variant="destructive">High Risk</Badge>;
    if (score > 40) return <Badge className="bg-yellow-500 text-white">Medium Risk</Badge>;
    return <Badge variant="secondary">Low Risk</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'all') return true;
    if (filterType === 'high-risk') return tx.risk_score > 70;
    if (filterType === 'pending') return tx.status === 'pending';
    if (filterType === 'large-amounts') return tx.amount > 1000000;
    return true;
  });

  if (loading) {
    return <div className="animate-pulse">Loading transaction monitor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      {alerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {alerts.length} high-risk transaction(s) detected requiring attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Monitoring Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Volume</p>
                <p className="text-2xl font-bold">
                  UGX {transactions
                    .filter(tx => new Date(tx.created_at).toDateString() === new Date().toDateString())
                    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
                    .toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transaction Count</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Real-Time Transaction Monitor</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'high-risk' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('high-risk')}
              >
                High Risk
              </Button>
              <Button
                variant={filterType === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('pending')}
              >
                Pending
              </Button>
              <Button
                variant={filterType === 'large-amounts' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('large-amounts')}
              >
                Large Amounts
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.filter(tx => {
              if (filterType === 'all') return true;
              if (filterType === 'high-risk') return tx.risk_score > 70;
              if (filterType === 'pending') return tx.status === 'pending';
              if (filterType === 'large-amounts') return tx.amount > 1000000;
              return true;
            }).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium">{transaction.user_profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{transaction.user_profile?.email}</p>
                    <Badge variant={transaction.risk_score > 70 ? 'destructive' : transaction.risk_score > 40 ? 'secondary' : 'default'}>
                      {transaction.risk_score > 70 ? 'High Risk' : transaction.risk_score > 40 ? 'Medium Risk' : 'Low Risk'}
                    </Badge>
                    <Badge variant={transaction.status === 'completed' ? 'default' : transaction.status === 'pending' ? 'secondary' : 'destructive'}>
                      {transaction.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{transaction.transaction_type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">{transaction.currency} {Math.abs(transaction.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Time</p>
                      <p className="font-medium">{new Date(transaction.created_at).toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Risk Score</p>
                      <p className="font-medium">{transaction.risk_score}%</p>
                    </div>
                  </div>
                  
                  {transaction.description && (
                    <p className="text-sm text-muted-foreground mt-2">{transaction.description}</p>
                  )}
                </div>
                
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            ))}
            
            {transactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No transactions match the current filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const calculateRiskScore = (transaction: any): number => {
  let score = 0;
  
  // Amount-based risk
  if (transaction.amount > 10000000) score += 40; // > 10M UGX
  else if (transaction.amount > 5000000) score += 25; // > 5M UGX
  else if (transaction.amount > 1000000) score += 15; // > 1M UGX
  
  // Transaction type risk
  if (transaction.transaction_type === 'withdrawal') score += 20;
  else if (transaction.transaction_type === 'transfer') score += 15;
  
  // Time-based risk (late night transactions)
  const hour = new Date(transaction.created_at).getHours();
  if (hour < 6 || hour > 22) score += 10;
  
  // Frequency risk (would need to check recent transactions)
  // This is a simplified version
  score += 5;
  
  return Math.min(score, 100);
};

export default RealTimeTransactionMonitor;
