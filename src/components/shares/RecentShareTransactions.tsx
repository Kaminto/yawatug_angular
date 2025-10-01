import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowRightLeft, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ShareTransaction {
  id: string;
  transaction_type: string;
  quantity: number;
  price_per_share: number;
  total_amount: number;
  status: string;
  created_at: string;
  currency: string;
}

interface RecentShareTransactionsProps {
  userId: string;
  showViewMore?: boolean;
}

const RecentShareTransactions: React.FC<RecentShareTransactionsProps> = ({ 
  userId, 
  showViewMore = true 
}) => {
  const [transactions, setTransactions] = useState<ShareTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchRecentTransactions();
    }
  }, [userId]);

  const fetchRecentTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('share_transactions')
        .select('*')
        .eq('user_id', userId)
        .in('transaction_type', ['buy', 'sell', 'transfer'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'sell':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'transfer':
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'buy':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'sell':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'transfer':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-50 text-green-700';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700';
      case 'failed':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg animate-pulse">
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-4 w-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recent transactions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.transaction_type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getTransactionColor(transaction.transaction_type)}>
                        {transaction.transaction_type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {transaction.quantity.toLocaleString()} shares • {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {transaction.currency} {transaction.total_amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @ {transaction.price_per_share.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {showViewMore && transactions.length > 0 && (
          <Button variant="outline" className="w-full mt-4">
            View More Transactions
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentShareTransactions;