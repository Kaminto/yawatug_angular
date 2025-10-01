import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSharePoolReconciliation } from '@/hooks/useSharePoolReconciliation';

const SharePoolReconciliationPanel: React.FC = () => {
  const { loading, reconcileSharePools } = useSharePoolReconciliation();

  const handleReconcile = async () => {
    const result = await reconcileSharePools();
    // Result is handled in the hook with toast notifications
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Share Pool Reconciliation
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Manually trigger reconciliation of all share pools to fix any data inconsistencies
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="font-medium">What does reconciliation do?</span>
          </div>
          <ul className="text-sm space-y-1 ml-6">
            <li>• Recalculates available shares based on actual holdings</li>
            <li>• Updates share pool statistics in real-time</li>
            <li>• Fixes any inconsistencies between calculated and stored values</li>
            <li>• Ensures triggers are working correctly</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800">Automatic Updates Active</span>
          </div>
          <p className="text-sm text-green-700">
            Database triggers automatically maintain share pool relationships when:
          </p>
          <ul className="text-sm text-green-700 mt-1 ml-4">
            <li>• Users purchase shares</li>
            <li>• Buyback orders are processed</li>
            <li>• Share bookings are created or modified</li>
          </ul>
        </div>

        <Button
          onClick={handleReconcile}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Reconciling Share Pools...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconcile All Share Pools
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>Note: Reconciliation is typically only needed if you suspect data inconsistencies or after manual database changes.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SharePoolReconciliationPanel;