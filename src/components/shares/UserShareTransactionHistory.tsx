import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/lib/dateFormatter';
import { getTransactionTypeLabel, getShareTransactionTypes } from '@/lib/transactionTypes';
import { Clock, TrendingUp, ArrowUpDown } from 'lucide-react';

interface UserShareTransactionHistoryProps {
  userId: string;
}

const UserShareTransactionHistory: React.FC<UserShareTransactionHistoryProps> = ({ userId }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      // Load share transactions (only user-facing types, exclude admin/system stock movements)
      const userTransactionTypes = ['buy', 'purchase', 'sell', 'sale', 'transfer_in', 'transfer_out', 'share_transfer_in', 'share_transfer_out'];
      const { data: shareTransactionsData, error: shareTransactionsError } = await supabase
        .from('share_transactions')
        .select(`
          *,
          shares:share_id (
            id,
            name,
            price_per_share,
            currency
          )
        `)
        .eq('user_id', userId)
        .in('transaction_type', userTransactionTypes)
        .order('created_at', { ascending: false })
        .limit(50);

      if (shareTransactionsError) {
        console.error('Error loading share transactions:', shareTransactionsError);
      }

      // Omit stock movements from user-facing history to avoid duplication with share_transactions
      const stockMovementsData: any[] = [];


      // Load booking payments from transactions table
      const { data: bookingPaymentsData, error: bookingPaymentsError } = await supabase
        .from('transactions')
        .select(`
          *,
          wallets!wallet_id (
            currency
          )
        `)
        .eq('user_id', userId)
        .in('transaction_type', ['booking', 'booking_payment', 'booking_completion'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (bookingPaymentsError) {
        console.error('Error loading booking payments:', bookingPaymentsError);
      }

      // Combine and sort transactions (exclude stock movements for user-facing view)
      const allTransactions = [
        ...(shareTransactionsData || []).map(t => ({
          ...t,
          source: 'transaction',
          display_date: t.created_at,
        })),
        ...(bookingPaymentsData || []).map(b => {
          const metadata = b.metadata as any;
          return {
            ...b,
            source: 'booking',
            display_date: b.created_at,
            quantity: Math.abs(b.amount),
            price_per_share: 1,
            currency: b.currency,
            shares: { 
              id: metadata?.share_id || '',
              name: metadata?.booking_id ? 'Booking Payment' : 'Share Booking',
              price_per_share: 1,
              currency: b.currency
            },
          };
        })
      ].sort((a, b) => new Date(b.display_date).getTime() - new Date(a.display_date).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount == null || currency == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === 'all') return true;
    return tx.transaction_type === filterType;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle>Share Transaction History</CardTitle>
            <CardDescription>
              Complete record of all your share transactions and movements
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="buy">Purchases</SelectItem>
                <SelectItem value="sell">Sales</SelectItem>
                <SelectItem value="transfer_in">Transfers In</SelectItem>
                <SelectItem value="transfer_out">Transfers Out</SelectItem>
                <SelectItem value="booking">Bookings</SelectItem>
                <SelectItem value="booking_payment">Booking Payments</SelectItem>
                <SelectItem value="dividend_issue">Dividend Issues</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              {filteredTransactions.length} transactions
            </Badge>
          </div>

          {/* Transactions Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Share</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price/Share</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => {
                  const txType = getTransactionTypeLabel(tx.transaction_type);
                  const isNegative = ['sell', 'sale', 'transfer_out'].includes(tx.transaction_type);
                  
                  return (
                    <TableRow key={`${tx.source}-${tx.id}`}>
                      <TableCell className="text-sm">
                        {formatDateTime(tx.display_date)}
                      </TableCell>
                      <TableCell>
                        <Badge className={txType.color}>{txType.label}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {tx.shares?.name || 'Unknown Share'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {isNegative ? '-' : '+'}{(tx.quantity || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(tx.price_per_share, tx.currency || tx.shares?.currency)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(
                          (tx.quantity || 0) * (tx.price_per_share || 0),
                          tx.currency || tx.shares?.currency
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'completed' ? 'default' : 'outline'}>
                          {tx.status || 'completed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ArrowUpDown className="h-8 w-8" />
                        <p>No transactions found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserShareTransactionHistory;
