
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle } from 'lucide-react';

interface SecurityConfirmationProps {
  transactionDetails: {
    type: string;
    amount: number;
    currency: string;
    method: string;
    destination?: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
  requiresOTP?: boolean;
  requiresPIN?: boolean;
}

const SecurityConfirmation: React.FC<SecurityConfirmationProps> = ({
  transactionDetails,
  onConfirm,
  onCancel,
  requiresOTP = false,
  requiresPIN = false
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    // Simulate processing delay
    setTimeout(() => {
      setLoading(false);
      onConfirm();
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Confirm Transaction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transaction Summary */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p><strong>Transaction:</strong> {transactionDetails.type}</p>
              <p><strong>Amount:</strong> {transactionDetails.amount.toLocaleString()} {transactionDetails.currency}</p>
              <p><strong>Method:</strong> {transactionDetails.method.replace('_', ' ')}</p>
              {transactionDetails.destination && (
                <p><strong>Destination:</strong> {transactionDetails.destination}</p>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {/* Warning */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Security Notice:</strong> Please review the transaction details carefully before confirming. 
            This action cannot be undone.
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Transaction'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityConfirmation;
