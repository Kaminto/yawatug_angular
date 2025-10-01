import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, ArrowLeftRight, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EnhancedHistoryTabProps {
  userId: string;
}

const EnhancedHistoryTab: React.FC<EnhancedHistoryTabProps> = ({ userId }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (userId) {
      loadTransactionHistory();
    }
  }, [userId]);

  const loadTransactionHistory = async () => {
    try {
      setLoading(true);
      
      // Load share transactions with fees
      const { data: shareTransactions } = await supabase
        .from('share_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Load dividend payments
      const { data: dividendPayments } = await supabase
        .from('dividend_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Load transfer requests (both sent and received) with fees
      const { data: transfers } = await supabase
        .from('share_transfer_requests')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      // Combine and format all transactions
      const allTransactions = [
        ...(shareTransactions || []).map(t => ({
          ...t,
          type: t.transaction_type,
          icon: t.transaction_type === 'buy' ? TrendingUp : TrendingDown,
          color: t.transaction_type === 'buy' ? 'text-green-600' : 'text-red-600',
          amount: t.total_amount || (t.quantity * (t.price_per_share || 0)),
          fees: t.transfer_fee || 0,
          description: `${t.quantity} shares @ UGX ${t.price_per_share?.toLocaleString() || 'N/A'}`
        })),
        ...(dividendPayments || []).map(d => ({
          ...d,
          type: 'dividend',
          icon: Gift,
          color: 'text-purple-600',
          amount: d.amount,
          fees: 0, // Dividends typically don't have fees
          description: `Dividend payment`,
          quantity: d.shares_owned || 0,
          price_per_share: d.shares_owned ? Math.round(d.amount / d.shares_owned) : 0
        })),
        ...(transfers || []).map(t => ({
          ...t,
          type: 'transfer',
          icon: ArrowLeftRight,
          color: 'text-blue-600',
          amount: t.transfer_value || 0,
          fees: t.transfer_fee || 0,
          description: `${t.quantity} shares`,
          quantity: t.quantity,
          price_per_share: t.transfer_value ? Math.round(t.transfer_value / t.quantity) : 0
        }))
      ]
        .filter(t => t.status === 'completed' || t.status === 'approved')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transaction history:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'buy': return 'Buy';
      case 'sell': return 'Sell';
      case 'transfer': return 'Transfer';
      case 'dividend': return 'Dividend';
      default: return type;
    }
  };

  const displayedTransactions = showMore ? transactions : transactions.slice(0, 5);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-5 bg-muted rounded w-32"></div>
                    <div className="h-4 bg-muted rounded w-48"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-24"></div>
                </div>
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
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {displayedTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transaction history found.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displayedTransactions.map((transaction) => {
                const IconComponent = transaction.icon;
                
                return (
                  <div key={transaction.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full bg-muted ${transaction.color}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={transaction.color}>
                              {getTransactionTypeLabel(transaction.type)}
                            </Badge>
                          </div>
                          <p className="font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                           {transaction.fees > 0 && (
                             <p className="text-xs text-muted-foreground">
                               Transaction fees: UGX {transaction.fees.toLocaleString()}
                             </p>
                           )}
                        </div>
                      </div>
                      <div className="text-right">
                         <p className={`text-lg font-semibold ${transaction.type === 'buy' || transaction.type === 'dividend' ? 'text-green-600' : transaction.type === 'sell' ? 'text-red-600' : 'text-blue-600'}`}>
                           {transaction.type === 'sell' ? '-' : '+'}UGX {transaction.amount.toLocaleString()}
                           {transaction.fees > 0 && (
                             <span className="text-xs block text-muted-foreground font-normal">
                               Net: UGX {(transaction.amount - (transaction.fees || 0)).toLocaleString()}
                             </span>
                           )}
                         </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {transactions.length > 5 && (
              <div className="text-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowMore(!showMore)}
                >
                  {showMore ? 'Show Less' : `View More (${transactions.length - 5} more)`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedHistoryTab;