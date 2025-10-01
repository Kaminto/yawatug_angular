
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileText, Calendar } from 'lucide-react';

interface TransactionReport {
  id: string;
  user_email: string;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  fee_amount: number;
  created_at: string;
  approval_status?: string;
}

const TransactionReports = () => {
  const [transactions, setTransactions] = useState<TransactionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadTransactionReports();
  }, [dateRange, statusFilter, typeFilter]);

  const loadTransactionReports = async () => {
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filter
      if (dateRange !== 'all') {
        const daysAgo = parseInt(dateRange);
        const dateThreshold = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', dateThreshold.toISOString());
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply type filter
      if (typeFilter !== 'all') {
        query = query.eq('transaction_type', typeFilter);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;

      const formattedData = data?.map((transaction: any) => ({
        id: transaction.id,
        user_email: transaction.user_email || 'Unknown',
        transaction_type: transaction.transaction_type,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        fee_amount: transaction.fee_amount || 0,
        created_at: transaction.created_at,
        approval_status: transaction.approval_status
      })) || [];

      setTransactions(formattedData);
    } catch (error) {
      console.error('Error loading transaction reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User Email', 'Type', 'Amount', 'Currency', 'Fee', 'Status', 'Approval Status'];
    const csvData = transactions.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.user_email,
      t.transaction_type,
      t.amount,
      t.currency,
      t.fee_amount,
      t.status,
      t.approval_status || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalAmount = transactions.reduce((sum, t) => {
    const amount = t.currency === 'USD' ? t.amount * 3700 : t.amount;
    return sum + Math.abs(amount);
  }, 0);

  const totalFees = transactions.reduce((sum, t) => {
    const fee = t.currency === 'USD' ? t.fee_amount * 3700 : t.fee_amount;
    return sum + fee;
  }, 0);

  if (loading) {
    return <div className="animate-pulse">Loading transaction reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Transaction Reports</h3>
        <Button onClick={exportToCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4" />
              Total Fees Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {totalFees.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="withdraw">Withdraw</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="share_purchase">Share Purchase</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details ({transactions.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 50).map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.user_email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {transaction.transaction_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {transaction.currency} {Math.abs(transaction.amount).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono">
                    {transaction.currency} {transaction.fee_amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      transaction.status === 'completed' ? 'default' :
                      transaction.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.approval_status && (
                      <Badge variant={
                        transaction.approval_status === 'approved' ? 'default' :
                        transaction.approval_status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {transaction.approval_status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionReports;
