import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useUser } from '@/providers/UserProvider';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  transaction_type: string; // Changed from union to string to match database
  status: string; // Changed from union to string to match database
  approval_status?: string;
  fee_amount?: number;
  created_at: string;
  description?: string;
  reference?: string;
}

const WalletRecentActivities: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const { userId } = useUser();

  useEffect(() => {
    if (userId) {
      loadRecentTransactions();
    }
  }, [userId]);

  const loadRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return ArrowDownLeft;
      case 'withdraw':
        return ArrowUpRight;
      case 'transfer':
        return ArrowLeftRight;
      case 'exchange':
        return DollarSign;
      default:
        return DollarSign;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-accent-green bg-accent-green/10 border-accent-green/20';
      case 'withdraw':
        return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
      case 'transfer':
        return 'text-accent-blue bg-accent-blue/10 border-accent-blue/20';
      case 'exchange':
        return 'text-primary bg-primary/10 border-primary/20';
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const formatTransactionType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getTransactionSource = (transaction: Transaction) => {
    if (transaction.reference) {
      if (transaction.reference.includes('REL')) return 'RelWorx';
      if (transaction.reference.includes('MTN')) return 'MTN Mobile Money';
      if (transaction.reference.includes('AIRTEL')) return 'Airtel Money';
      if (transaction.reference.includes('BANK')) return 'Bank Transfer';
    }
    return formatTransactionType(transaction.transaction_type);
  };

  const getStatusBadgeVariant = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'rejected' || status === 'failed') return 'destructive';
    if (status === 'completed' || approvalStatus === 'approved') return 'default';
    if (status === 'processing' || approvalStatus === 'pending') return 'secondary';
    return 'outline';
  };

  const getStatusIcon = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'rejected' || status === 'failed') return XCircle;
    if (status === 'completed' || approvalStatus === 'approved') return CheckCircle;
    if (status === 'processing' || approvalStatus === 'pending') return Clock;
    return AlertCircle;
  };

  const displayedTransactions = showMore ? transactions : transactions.slice(0, 5);

  if (loading) {
    return (
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border border-border/50 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm max-w-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Recent Activities</CardTitle>
              <p className="text-xs text-muted-foreground">Latest transactions</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.location.href = '/transactions'}
            className="text-xs hover:bg-primary/10 hover:text-primary"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-card-foreground mb-2">No recent activities found</h3>
            <p className="text-sm text-muted-foreground">
              Your transaction history will appear here once you start making deposits, withdrawals, or transfers.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTransactions.map((transaction) => {
              const Icon = getTransactionIcon(transaction.transaction_type);
              const StatusIcon = getStatusIcon(transaction.status, transaction.approval_status);
              
              return (
                <div key={transaction.id} className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200">
                  <div className={`p-2.5 sm:p-3 rounded-xl border shadow-sm ${getTransactionColor(transaction.transaction_type)}`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-card-foreground">
                        {formatTransactionType(transaction.transaction_type)}
                      </p>
                      <Badge variant={getStatusBadgeVariant(transaction.status, transaction.approval_status)} className="text-xs">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {transaction.approval_status || transaction.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {getTransactionSource(transaction)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.transaction_type === 'deposit' 
                        ? 'text-accent-green' 
                        : 'text-card-foreground'
                    }`}>
                      {transaction.transaction_type === 'deposit' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                    </p>
                    {transaction.fee_amount && transaction.fee_amount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Fee: {formatCurrency(transaction.fee_amount, transaction.currency)}
                      </p>
                    )}
                    {transaction.transaction_type !== 'deposit' && transaction.fee_amount && transaction.fee_amount > 0 && (
                      <p className="text-xs text-accent-orange">
                        Net: {formatCurrency(Math.abs(transaction.amount) - transaction.fee_amount, transaction.currency)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            
            {transactions.length > 5 && (
              <div className="flex justify-center pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowMore(!showMore)}
                  className="text-sm"
                >
                  {showMore ? 'Show Less' : `View More (${transactions.length - 5} more)`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletRecentActivities;