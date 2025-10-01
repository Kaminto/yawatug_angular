import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Search,
  Filter,
  Download,
  ArrowRightLeft
} from 'lucide-react';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  description?: string;
  reference?: string;
}

interface EnhancedTransactionHistoryProps {
  onRefresh?: () => void;
}

const EnhancedTransactionHistory = React.forwardRef<{ refresh: () => void }, EnhancedTransactionHistoryProps>(
  ({ onRefresh }, ref) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    loadTransactions();
  }, [filterType, filterStatus, page]);

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (filterType !== 'all') {
        query = query.eq('transaction_type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (page === 1) {
        setTransactions(data || []);
      } else {
        setTransactions(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);

    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    setPage(1);
    setLoading(true);
    loadTransactions();
    onRefresh?.();
  };

  // Expose refresh function via ref
  React.useImperativeHandle(ref, () => ({
    refresh: refreshData
  }));

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'deposit_request':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'withdraw':
      case 'withdrawal':
      case 'withdrawal_request':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'transfer':
        return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        transaction.transaction_type.toLowerCase().includes(searchLower) ||
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.reference?.toLowerCase().includes(searchLower) ||
        transaction.currency.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const formatAmount = (amount: number, currency: string) => {
    const absAmount = Math.abs(amount);
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}${currency} ${absAmount.toLocaleString()}`;
  };

  if (loading && page === 1) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
              <SelectItem value="transfer">Transfers</SelectItem>
              <SelectItem value="share_purchase">Share Purchase</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction List */}
        <div className="space-y-2">
          {filteredTransactions.length > 0 ? (
            <>
              {filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.transaction_type)}
                    <div>
                      <p className="font-medium capitalize">
                        {transaction.transaction_type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()} • {new Date(transaction.created_at).toLocaleTimeString()}
                      </p>
                      {transaction.description && (
                        <p className="text-xs text-muted-foreground">
                          {transaction.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </p>
                    <Badge variant={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                    {transaction.reference && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Ref: {transaction.reference}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="text-center pt-4">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? 'Loading...' : 'View More'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                  ? 'No transactions match your filters' 
                  : 'No transactions found'
                }
              </p>
              {(searchTerm || filterType !== 'all' || filterStatus !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                    setFilterStatus('all');
                  }}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

EnhancedTransactionHistory.displayName = 'EnhancedTransactionHistory';

export default EnhancedTransactionHistory;