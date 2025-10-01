
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WalletBalanceReconciliationProps {
  userId: string;
  onReconciliationComplete: () => void;
}

interface ReconciliationResult {
  walletId: string;
  currency: string;
  storedBalance: number;
  calculatedBalance: number;
  difference: number;
  needsSync: boolean;
}

const WalletBalanceReconciliation: React.FC<WalletBalanceReconciliationProps> = ({
  userId,
  onReconciliationComplete
}) => {
  const [reconciliationResults, setReconciliationResults] = useState<ReconciliationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const performReconciliation = async () => {
    setLoading(true);
    try {
      // Get all user wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id, currency, balance')
        .eq('user_id', userId);

      if (walletsError) throw walletsError;

      const results: ReconciliationResult[] = [];

      for (const wallet of wallets || []) {
        // Calculate balance from transactions
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('amount, status')
          .eq('wallet_id', wallet.id)
          .in('status', ['completed', 'approved']);

        if (txError) throw txError;

        const calculatedBalance = transactions?.reduce((sum, tx) => {
          return sum + Number(tx.amount);
        }, 0) || 0;

        const storedBalance = Number(wallet.balance);
        const difference = Math.abs(calculatedBalance - storedBalance);
        const needsSync = difference > 0.01; // Allow for small rounding differences

        results.push({
          walletId: wallet.id,
          currency: wallet.currency,
          storedBalance,
          calculatedBalance,
          difference,
          needsSync
        });
      }

      setReconciliationResults(results);
      setLastCheck(new Date());

      const mismatchCount = results.filter(r => r.needsSync).length;
      if (mismatchCount > 0) {
        toast.warning(`Found ${mismatchCount} wallet(s) with balance mismatches`);
      } else {
        toast.success('All wallet balances are reconciled');
      }

    } catch (error) {
      console.error('Error performing reconciliation:', error);
      toast.error('Failed to perform balance reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const syncWalletBalance = async (walletId: string, calculatedBalance: number) => {
    try {
      const { error } = await supabase
        .from('wallets')
        .update({ 
          balance: calculatedBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId);

      if (error) throw error;

      toast.success('Wallet balance synchronized');
      await performReconciliation(); // Refresh results
      onReconciliationComplete();

    } catch (error) {
      console.error('Error syncing wallet balance:', error);
      toast.error('Failed to sync wallet balance');
    }
  };

  const syncAllMismatches = async () => {
    const mismatches = reconciliationResults.filter(r => r.needsSync);
    
    for (const mismatch of mismatches) {
      await syncWalletBalance(mismatch.walletId, mismatch.calculatedBalance);
    }
  };

  useEffect(() => {
    performReconciliation();
  }, [userId]);

  const hasMismatches = reconciliationResults.some(r => r.needsSync);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Balance Reconciliation
          </span>
          <Button
            onClick={performReconciliation}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Checking...' : 'Check Balances'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastCheck && (
          <p className="text-sm text-muted-foreground">
            Last checked: {lastCheck.toLocaleString()}
          </p>
        )}

        {hasMismatches && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Some wallet balances don't match transaction history</span>
              <Button onClick={syncAllMismatches} size="sm" variant="destructive">
                Fix All
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {reconciliationResults.map((result) => (
            <div key={result.walletId} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                {result.needsSync ? (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <div>
                  <p className="font-medium">{result.currency} Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    Stored: {result.storedBalance.toLocaleString()} | 
                    Calculated: {result.calculatedBalance.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {result.needsSync ? (
                  <>
                    <Badge variant="destructive">
                      Diff: {result.difference.toLocaleString()}
                    </Badge>
                    <Button
                      onClick={() => syncWalletBalance(result.walletId, result.calculatedBalance)}
                      size="sm"
                      variant="outline"
                    >
                      Sync
                    </Button>
                  </>
                ) : (
                  <Badge variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    OK
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {reconciliationResults.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-4">
            No wallets found or reconciliation not performed yet
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletBalanceReconciliation;
