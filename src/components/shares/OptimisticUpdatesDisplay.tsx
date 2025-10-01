
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates';

const OptimisticUpdatesDisplay: React.FC = () => {
  const { pendingUpdates } = useOptimisticUpdates();

  if (pendingUpdates.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'confirmed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Transaction Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pendingUpdates.map((update) => (
          <Alert key={update.id} className="py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(update.status)}
                <span className="text-sm capitalize">{update.type} operation</span>
              </div>
              <Badge variant={getStatusColor(update.status) as any}>
                {update.status}
              </Badge>
            </div>
            {update.status === 'pending' && (
              <AlertDescription className="mt-1 text-xs">
                Processing your {update.type} request...
              </AlertDescription>
            )}
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
};

export default OptimisticUpdatesDisplay;
