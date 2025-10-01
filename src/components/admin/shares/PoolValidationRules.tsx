
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface PoolValidationRulesProps {
  shareData: any;
  pendingChanges?: {
    totalShares?: number;
    reservedShares?: number;
    availableShares?: number;
  };
}

const PoolValidationRules: React.FC<PoolValidationRulesProps> = ({ shareData, pendingChanges = {} }) => {
  if (!shareData) return null;

  const currentTotal = pendingChanges.totalShares ?? shareData.total_shares;
  const currentReserved = pendingChanges.reservedShares ?? shareData.reserved_shares ?? 0;
  const currentAvailable = pendingChanges.availableShares ?? shareData.available_shares;

  // Calculate sold shares (total - available - reserved)
  const soldShares = shareData.total_shares - shareData.available_shares - (shareData.reserved_shares ?? 0);

  const validationRules = [
    {
      id: 'total_positive',
      description: 'Total shares must be greater than 0',
      isValid: currentTotal > 0,
      severity: 'error' as const
    },
    {
      id: 'reserved_percentage',
      description: 'Reserved shares should not exceed 50% of total',
      isValid: (currentReserved / currentTotal) <= 0.5,
      severity: 'warning' as const
    },
    {
      id: 'available_calculation',
      description: 'Available shares = Total - Reserved',
      isValid: currentAvailable === (currentTotal - currentReserved),
      severity: 'error' as const
    },
    {
      id: 'minimum_pool_size',
      description: `Pool cannot be smaller than sold shares (${soldShares})`,
      isValid: currentTotal >= soldShares,
      severity: 'error' as const
    },
    {
      id: 'reserve_issued_check',
      description: 'Reserved issued cannot exceed reserved shares',
      isValid: (shareData.reserved_issued ?? 0) <= currentReserved,
      severity: 'error' as const
    }
  ];

  const errors = validationRules.filter(rule => !rule.isValid && rule.severity === 'error');
  const warnings = validationRules.filter(rule => !rule.isValid && rule.severity === 'warning');

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Validation Errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {errors.map(error => (
                <li key={error.id} className="text-sm">{error.description}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Warnings:</div>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map(warning => (
                <li key={warning.id} className="text-sm">{warning.description}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {validationRules.map(rule => (
          <div key={rule.id} className="flex items-center gap-2">
            {rule.isValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className={`h-4 w-4 ${rule.severity === 'error' ? 'text-red-500' : 'text-yellow-500'}`} />
            )}
            <Badge variant={rule.isValid ? 'default' : rule.severity === 'error' ? 'destructive' : 'secondary'}>
              {rule.id.replace('_', ' ')}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PoolValidationRules;
