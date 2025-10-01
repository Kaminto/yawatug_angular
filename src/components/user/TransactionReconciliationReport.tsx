
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionReconciliationReportProps {
  userId: string;
  wallets: any[];
}

interface ReconciliationStats {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netBalance: number;
  discrepancyCount: number;
  lastReconciled: Date | null;
}

const TransactionReconciliationReport: React.FC<TransactionReconciliationReportProps> = ({
  userId,
  wallets
}) => {
  const [stats, setStats] = useState<Record<string, ReconciliationStats>>({});
  const [loading, setLoading] = useState(false);

  const performDetailedReconciliation = async () => {
    setLoading(true);
    try {
      const reconciliationStats: Record<string, ReconciliationStats> = {};

      for (const wallet of wallets) {
        // Get all transactions for this wallet
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount, status, created_at, transaction_type')
          .eq('wallet_id', wallet.id)
          .in('status', ['completed', 'approved'])
          .order('created_at', { ascending: true });

        if (error) throw error;

        const credits = transactions?.filter(t => t.amount > 0) || [];
        const debits = transactions?.filter(t => t.amount < 0) || [];
        
        const totalCredits = credits.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalDebits = Math.abs(debits.reduce((sum, t) => sum + Number(t.amount), 0));
        const netBalance = totalCredits - totalDebits;
        
        const storedBalance = Number(wallet.balance);
        const discrepancy = Math.abs(netBalance - storedBalance);
        
        reconciliationStats[wallet.currency] = {
          totalTransactions: transactions?.length || 0,
          totalCredits,
          totalDebits,
          netBalance,
          discrepancyCount: discrepancy > 0.01 ? 1 : 0,
          lastReconciled: new Date()
        };
      }

      setStats(reconciliationStats);
      
      const totalDiscrepancies = Object.values(reconciliationStats)
        .reduce((sum, stat) => sum + stat.discrepancyCount, 0);
        
      if (totalDiscrepancies > 0) {
        toast.warning(`Found ${totalDiscrepancies} wallet(s) with discrepancies`);
      } else {
        toast.success('All transactions reconciled successfully');
      }

    } catch (error) {
      console.error('Error performing reconciliation:', error);
      toast.error('Failed to perform transaction reconciliation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wallets.length > 0) {
      performDetailedReconciliation();
    }
  }, [wallets]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Transaction Reconciliation Report
          </span>
          <Button
            onClick={performDetailedReconciliation}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(stats).length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-4">
            No reconciliation data available
          </p>
        )}

        {Object.entries(stats).map(([currency, stat]) => {
          const wallet = wallets.find(w => w.currency === currency);
          const hasDiscrepancy = stat.discrepancyCount > 0;
          
          return (
            <div key={currency} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{currency} Wallet Analysis</h3>
                {hasDiscrepancy ? (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Discrepancy Found
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Reconciled
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Transactions:</span>
                  <p className="font-medium">{stat.totalTransactions}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Balance (Calculated):</span>
                  <p className="font-medium">{currency} {stat.netBalance.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Credits:</span>
                  <p className="font-medium text-green-600">+{currency} {stat.totalCredits.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Debits:</span>
                  <p className="font-medium text-red-600">-{currency} {stat.totalDebits.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Stored Balance:</span>
                  <p className="font-medium">{currency} {wallet?.balance.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Difference:</span>
                  <p className={`font-medium ${hasDiscrepancy ? 'text-red-600' : 'text-green-600'}`}>
                    {currency} {Math.abs(stat.netBalance - (wallet?.balance || 0)).toLocaleString()}
                  </p>
                </div>
              </div>

              {hasDiscrepancy && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The stored balance doesn't match the calculated balance from transactions. 
                    This may indicate missing transactions or data inconsistency.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
        })}

        {Object.keys(stats).length > 0 && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Summary</span>
            </div>
            <div className="text-sm space-y-1">
              <p>Total Wallets Analyzed: {Object.keys(stats).length}</p>
              <p>Wallets with Discrepancies: {Object.values(stats).reduce((sum, stat) => sum + stat.discrepancyCount, 0)}</p>
              <p>Last Analysis: {stats[Object.keys(stats)[0]]?.lastReconciled?.toLocaleString()}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionReconciliationReport;
