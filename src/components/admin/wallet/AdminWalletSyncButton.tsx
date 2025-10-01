import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AdminWalletSyncButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handleBackfillAllocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-missing-allocations');
      
      if (error) throw error;
      
      if (data.success) {
        setLastSync(new Date());
        toast.success(
          `Backfill completed! Processed ${data.summary.share_purchases_processed} purchases, ` +
          `allocated ${data.summary.total_amount_allocated?.toLocaleString()} UGX`
        );
      } else {
        throw new Error(data.error || 'Backfill failed');
      }
    } catch (error: any) {
      console.error('Error during backfill:', error);
      toast.error(`Backfill failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleBackfillAllocations}
        disabled={loading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Syncing...' : 'Sync Missing Allocations'}
      </Button>
      
      {lastSync && (
        <div className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>Last sync: {lastSync.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
};