import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatDateTime } from '@/lib/dateFormatter';

interface UnifiedTransaction {
  id: string;
  type: string; // unified type string
  date: string;
  amount: number;
  quantity?: number;
  price_per_share?: number;
  currency: string;
  status: string;
  description: string;
  reference?: string;
  counterparty?: string;
  metadata?: any;
}

interface TransactionHistoryProps {
  userId: string;
}

const UnifiedTransactionHistory: React.FC<TransactionHistoryProps> = ({ userId }) => {
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAll, setShowAll] = useState(false);
  const displayLimit = 5;

  useEffect(() => {
    // Clear transactions first to avoid showing cached data
    setTransactions([]);
    setLoading(true);
    
    if (userId) {
      loadTransactionHistory();
    }
  }, [userId]);

  const loadTransactionHistory = async () => {
    try {
      setLoading(true);
      
      const allTransactions: UnifiedTransaction[] = [];

      // Load each transaction type separately to avoid complex type inference
      try {
        const shareTransactionsResult = await supabase
          .from('share_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (shareTransactionsResult.data) {
          shareTransactionsResult.data.forEach((t: any) => {
            const mapType = (tt: string) => {
              if (tt === 'buy' || tt === 'purchase' || tt === 'share_purchase') return 'purchase';
              if (tt === 'sell' || tt === 'sale' || tt === 'share_sale') return 'sale';
              if (tt === 'booking_payment') return 'booking_payment';
              if (tt === 'transfer_in') return 'transfer_received';
              if (tt === 'transfer_out') return 'transfer_sent';
              if (tt === 'dividend_issue' || tt === 'dividend_payment') return 'dividend';
              if (tt === 'company_issue') return 'company_issue';
              if (tt === 'reserve_issue') return 'reserve_issue';
              return tt;
            };
            allTransactions.push({
              id: `st-${t.id}`,
              type: mapType(t.transaction_type),
              date: t.created_at,
              amount: Math.abs(t.total_amount || t.amount || 0),
              quantity: t.quantity,
              price_per_share: t.price_per_share,
              currency: t.currency || 'UGX',
              status: t.status,
              description: `Share ${mapType(t.transaction_type).replace('_',' ')}`,
              reference: t.id
            });
          });
        }
      } catch (error) {
        console.log('Error loading share transactions:', error);
      }

      try {
        const sellOrdersResult = await supabase
          .from('share_sell_orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (sellOrdersResult.data) {
          sellOrdersResult.data.forEach((order: any) => {
            allTransactions.push({
              id: `so-${order.id}`,
              type: 'sale',
              date: order.created_at,
              amount: order.total_sell_value || 0,
              quantity: order.quantity,
              price_per_share: order.current_market_price,
              currency: 'UGX',
              status: order.status,
              description: `Share sale order`,
              reference: order.id
            });
          });
        }
      } catch (error) {
        console.log('Error loading sell orders:', error);
      }

      try {
        const dividendsResult = await supabase
          .from('dividend_payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (dividendsResult.data) {
          dividendsResult.data.forEach((dividend: any) => {
            allTransactions.push({
              id: `d-${dividend.id}`,
              type: 'dividend',
              date: dividend.created_at,
              amount: dividend.amount || 0,
              currency: 'UGX',
              status: dividend.status || 'completed',
              description: `Dividend payment`,
              reference: dividend.dividend_declaration_id
            });
          });
        }
      } catch (error) {
        console.log('Error loading dividends:', error);
      }

      // Deliberately exclude share_stock_movements from user-facing history to avoid double-recording
      // Admin views will handle stock movements separately.
      // (No movement fetch here)

      // Sort by date
      allTransactions.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      });

      // Final safety filter: exclude any residual stock movements
      const sanitized = allTransactions.filter((t) => {
        const desc = (t.description || '').toLowerCase();
        const isMovementLike = t.id?.startsWith('mv-') || desc.startsWith('stock movement');
        const isZeroAmountPurchase = (t.type === 'purchase') && (!t.amount || Number(t.amount) === 0);
        return !(isMovementLike || isZeroAmountPurchase);
      });

      setTransactions(sanitized);
    } catch (error) {
      console.error('Error loading transaction history:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.counterparty?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Quantity', 'Price Per Share', 'Status', 'Reference'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(transaction => [
        format(new Date(transaction.date), 'yyyy-MM-dd HH:mm:ss'),
        transaction.type,
        `"${transaction.description}"`,
        transaction.amount,
        transaction.quantity || '',
        transaction.price_per_share || '',
        transaction.status,
        transaction.reference || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Transaction history exported successfully');
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'booking_payment':
        return 'bg-blue-100 text-blue-800';
      case 'sale':
        return 'bg-red-100 text-red-800';
      case 'transfer_sent':
        return 'bg-orange-100 text-orange-800';
      case 'transfer_received':
        return 'bg-green-100 text-green-800';
      case 'dividend':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedTransactions = showAll ? filteredTransactions : filteredTransactions.slice(0, displayLimit);
  const hasMore = filteredTransactions.length > displayLimit;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Transaction History</CardTitle>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase">Purchases</SelectItem>
                <SelectItem value="sale">Sales</SelectItem>
                <SelectItem value="transfer_sent">Transfers Sent</SelectItem>
                <SelectItem value="transfer_received">Transfers Received</SelectItem>
                <SelectItem value="dividend">Dividends</SelectItem>
                <SelectItem value="booking_payment">Booking Payments</SelectItem>
                <SelectItem value="booking">Bookings</SelectItem>
                <SelectItem value="company_issue">Company Issue</SelectItem>
                <SelectItem value="reserve_issue">Reserve Issue</SelectItem>
              </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </Button>
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found matching your criteria.
            </div>
          ) : (
            displayedTransactions.map((transaction) => (
              <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50 max-w-full overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={getTransactionTypeColor(transaction.type)}>
                        {transaction.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                    
                    <p className="font-medium">{transaction.description}</p>
                    
                    {(transaction.quantity || transaction.price_per_share) && (
                      <p className="text-sm text-gray-600">
                        {transaction.quantity && `${transaction.quantity} shares`}
                        {transaction.quantity && transaction.price_per_share && ' @ '}
                        {transaction.price_per_share && `UGX ${transaction.price_per_share.toLocaleString()}/share`}
                      </p>
                    )}
                    
                    {transaction.counterparty && (
                      <p className="text-sm text-gray-600">
                        With: {transaction.counterparty}
                      </p>
                    )}
                    
                      <p className="text-xs text-gray-500 break-words">
                        {formatDateTime(transaction.date)}
                      </p>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${
                      ['transfer_sent', 'purchase', 'booking_payment'].includes(transaction.type) 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {['transfer_sent', 'purchase', 'booking_payment'].includes(transaction.type) ? '-' : '+'}
                      {transaction.currency} {transaction.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Show More / Less Button */}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowAll(!showAll)}
              className="w-full sm:w-auto"
            >
              {showAll ? 'Show Less' : `View More (${filteredTransactions.length - displayLimit} more)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnifiedTransactionHistory;