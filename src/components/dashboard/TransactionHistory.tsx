
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from '@/lib/dateFormatter';

interface TransactionHistoryProps {
  transactions: any[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
  const formatCurrency = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount == null || currency == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getTransactionTypeLabel = (type: string) => {
    // Import transaction types from shared library
    const TRANSACTION_TYPES: Record<string, { label: string; color: string }> = {
      deposit: { label: 'Deposit', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      deposit_request: { label: 'Deposit Request', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      withdrawal: { label: 'Withdrawal', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      withdrawal_request: { label: 'Withdrawal Request', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      buy: { label: 'Buy Shares', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      purchase: { label: 'Share Purchase', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      sell: { label: 'Sell Shares', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      sale: { label: 'Share Sale', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      share_purchase: { label: 'Share Purchase', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      share_sale: { label: 'Share Sale', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      booking_payment: { label: 'Booking Payment', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      transfer_in: { label: 'Transfer In', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300' },
      transfer_out: { label: 'Transfer Out', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
      currency_exchange: { label: 'Currency Exchange', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300' },
    };
    
    return TRANSACTION_TYPES[type] || { 
      label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' 
    };
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const txType = getTransactionTypeLabel(tx.transaction_type);
            return (
              <TableRow key={tx.id}>
                <TableCell>
                  <Badge className={txType.color}>{txType.label}</Badge>
                </TableCell>
                <TableCell 
                  className={tx.amount && tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                >
                  {formatCurrency(tx.amount ? Math.abs(tx.amount) : null, tx.currency)}
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="text-sm">{tx.reference || '-'}</div>
                    <div className="text-xs text-muted-foreground">{tx.created_at ? formatDateTime(tx.created_at) : '-'}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={tx.status === 'completed' ? 'default' : 'outline'}>
                    {tx.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}

          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">
                No recent transactions
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionHistory;
