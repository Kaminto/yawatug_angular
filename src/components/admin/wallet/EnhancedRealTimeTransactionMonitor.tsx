
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, DollarSign, TrendingUp, Eye, Filter, Clock } from 'lucide-react';

interface EnhancedTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  created_at: string;
  user_profile?: {
    full_name: string;
    email: string;
    verification_level: string;
  };
  risk_score: number;
  risk_factors: string[];
  wallet_id?: string;
}

const EnhancedRealTimeTransactionMonitor: React.FC = () => {
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [alerts, setAlerts] = useState<EnhancedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState({
    activeAlerts: 0,
    todayVolume: 0,
    transactionCount: 0,
    averageRiskScore: 0
  });

  const calculateRealRiskScore = (transaction: any, userTransactionHistory: any[]): { score: number; factors: string[] } => {
    let score = 0;
    const factors: string[] = [];
    
    // Amount-based risk (0-30 points)
    const amountUGX = transaction.currency === 'USD' ? transaction.amount * 3700 : transaction.amount;
    if (amountUGX > 50000000) { // > 50M UGX
      score += 30;
      factors.push('Very large amount (>50M UGX)');
    } else if (amountUGX > 10000000) { // > 10M UGX
      score += 20;
      factors.push('Large amount (>10M UGX)');
    } else if (amountUGX > 5000000) { // > 5M UGX
      score += 10;
      factors.push('Medium-high amount (>5M UGX)');
    }
    
    // Transaction type risk (0-20 points)
    if (transaction.transaction_type === 'withdrawal') {
      score += 15;
      factors.push('Withdrawal transaction');
    } else if (transaction.transaction_type === 'transfer') {
      score += 10;
      factors.push('Transfer transaction');
    }
    
    // Time-based risk (0-15 points)
    const hour = new Date(transaction.created_at).getHours();
    if (hour < 6 || hour > 22) {
      score += 15;
      factors.push('Off-hours transaction');
    }
    
    // Frequency risk based on user history (0-25 points)
    const recentTransactions = userTransactionHistory.filter(tx => 
      new Date(tx.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    
    if (recentTransactions.length > 10) {
      score += 25;
      factors.push('High frequency (>10 transactions/day)');
    } else if (recentTransactions.length > 5) {
      score += 15;
      factors.push('Medium frequency (>5 transactions/day)');
    }
    
    // User verification level risk (0-10 points)
    if (!transaction.user_profile?.verification_level || transaction.user_profile.verification_level === 'unverified') {
      score += 10;
      factors.push('Unverified user');
    }
    
    return { score: Math.min(score, 100), factors };
  };

  const loadRealTransactions = async () => {
    try {
      // Get recent transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!transactionsData) return;

      // Get user profiles
      const userIds = [...new Set(transactionsData.map(tx => tx.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, status')
        .in('id', userIds);

      // Get transaction history for each user (for frequency analysis)
      const userTransactionHistory = new Map();
      for (const userId of userIds) {
        const { data: history } = await supabase
          .from('transactions')
          .select('created_at, amount, transaction_type')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        
        userTransactionHistory.set(userId, history || []);
      }

      // Process transactions with real risk scoring
      const processedTransactions = transactionsData.map(tx => {
        const userProfile = profiles?.find(p => p.id === tx.user_id);
        const history = userTransactionHistory.get(tx.user_id) || [];
        const riskAnalysis = calculateRealRiskScore(tx, history);
        
        return {
          ...tx,
          user_profile: {
            full_name: userProfile?.full_name || 'Unknown User',
            email: userProfile?.email || 'unknown@example.com',
            verification_level: userProfile?.status || 'unverified'
          },
          risk_score: riskAnalysis.score,
          risk_factors: riskAnalysis.factors
        };
      });

      setTransactions(processedTransactions);
      setAlerts(processedTransactions.filter(tx => tx.risk_score > 60));

      // Calculate real stats
      const todayTxs = processedTransactions.filter(tx => 
        new Date(tx.created_at).toDateString() === new Date().toDateString()
      );
      
      setStats({
        activeAlerts: processedTransactions.filter(tx => tx.risk_score > 60).length,
        todayVolume: todayTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
        transactionCount: processedTransactions.length,
        averageRiskScore: processedTransactions.reduce((sum, tx) => sum + tx.risk_score, 0) / processedTransactions.length
      });

    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealTransactions();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('transaction-monitor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
        loadRealTransactions();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions' }, () => {
        loadRealTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRiskBadge = (score: number) => {
    if (score > 80) return <Badge variant="destructive">Critical Risk</Badge>;
    if (score > 60) return <Badge variant="destructive">High Risk</Badge>;
    if (score > 40) return <Badge className="bg-yellow-500 text-white">Medium Risk</Badge>;
    return <Badge variant="secondary">Low Risk</Badge>;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'all') return true;
    if (filterType === 'high-risk') return tx.risk_score > 60;
    if (filterType === 'pending') return tx.status === 'pending';
    if (filterType === 'large-amounts') return tx.amount > 1000000;
    return true;
  });

  if (loading) {
    return <div className="animate-pulse">Loading enhanced transaction monitor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Alert Summary */}
      {alerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {alerts.length} high-risk transaction(s) detected. Average system risk: {stats.averageRiskScore.toFixed(1)}%
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Monitoring Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.activeAlerts}</p>
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
                <p className="text-2xl font-bold">UGX {stats.todayVolume.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Risk Score</p>
                <p className="text-2xl font-bold">{stats.averageRiskScore.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Monitored</p>
                <p className="text-2xl font-bold">{stats.transactionCount}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Transaction List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enhanced Real-Time Transaction Monitor</CardTitle>
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
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium">{transaction.user_profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{transaction.user_profile?.email}</p>
                    {getRiskBadge(transaction.risk_score)}
                    <Badge variant={transaction.status === 'completed' ? 'default' : transaction.status === 'pending' ? 'secondary' : 'destructive'}>
                      {transaction.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
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

                  {transaction.risk_factors.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium">Risk Factors:</p>
                      <ul className="list-disc list-inside">
                        {transaction.risk_factors.map((factor, index) => (
                          <li key={index}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Investigate
                </Button>
              </div>
            ))}
            
            {filteredTransactions.length === 0 && (
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

export default EnhancedRealTimeTransactionMonitor;
