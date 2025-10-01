import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminWalletBalanceSyncProps {
  onSyncComplete?: () => void;
}

const AdminWalletBalanceSync: React.FC<AdminWalletBalanceSyncProps> = ({ onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  const handleSyncAllBalances = async () => {
    setSyncing(true);
    try {
      // Use type assertion for RPC calls since function types may not be updated yet
      const { data, error } = await supabase.rpc('fix_all_wallet_balances' as any);
      
      if (error) {
        console.error('Error syncing all balances:', error);
        throw error;
      }
      
      console.log('Global sync result:', data);
      const result = data as any;
      setLastSyncResult(result);
      toast.success(`Successfully synced ${result.wallets_updated || 0} wallets`);
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Error syncing wallet balances:', error);
      toast.error('Failed to sync wallet balances');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Wallet Balance Synchronization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Manual Balance Sync</p>
            <p className="text-xs text-muted-foreground">
              Recalculate all wallet balances from transaction history
            </p>
          </div>
          <Button 
            onClick={handleSyncAllBalances}
            disabled={syncing}
            variant="outline"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync All Balances
          </Button>
        </div>

        {lastSyncResult && (
          <div className="border rounded-lg p-3 bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Last Sync Result</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Updated Wallets:</span>
                <Badge variant="secondary" className="ml-2">
                  {typeof lastSyncResult === 'object' && lastSyncResult?.updated_wallets || 'N/A'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Errors:</span>
                <Badge variant={
                  (typeof lastSyncResult === 'object' && lastSyncResult?.errors > 0) ? "destructive" : "secondary"
                } className="ml-2">
                  {typeof lastSyncResult === 'object' && lastSyncResult?.errors || 0}
                </Badge>
              </div>
            </div>
            {typeof lastSyncResult === 'object' && lastSyncResult?.message && (
              <p className="text-xs text-muted-foreground mt-2">
                {lastSyncResult.message}
              </p>
            )}
          </div>
        )}

        <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Automatic Sync Active</span>
          </div>
          <p className="text-xs text-blue-600">
            Database triggers are now automatically updating wallet balances when transaction statuses change.
            Manual sync is only needed for troubleshooting or fixing historical discrepancies.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminWalletBalanceSync;