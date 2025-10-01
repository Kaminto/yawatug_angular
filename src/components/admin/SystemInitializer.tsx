
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSystemInitialization } from '@/hooks/useSystemInitialization';
import { CheckCircle, XCircle, Settings, RefreshCw } from 'lucide-react';

const SystemInitializer = () => {
  const { 
    initialized, 
    loading, 
    needsInitialization, 
    initializeDefaults, 
    checkSystemInitialization 
  } = useSystemInitialization();

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? "default" : "destructive"}>
        {status ? "Initialized" : "Missing"}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Initialization Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsInitialization && (
          <Alert>
            <AlertDescription>
              Some system components need initialization. Click "Initialize Defaults" to set up missing configurations.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(initialized.walletLimits)}
              <span className="font-medium">Wallet Limits</span>
            </div>
            {getStatusBadge(initialized.walletLimits)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(initialized.securitySettings)}
              <span className="font-medium">Security Settings</span>
            </div>
            {getStatusBadge(initialized.securitySettings)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(initialized.feeSettings)}
              <span className="font-medium">Fee Settings</span>
            </div>
            {getStatusBadge(initialized.feeSettings)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(initialized.adminWallets)}
              <span className="font-medium">Admin Wallets</span>
            </div>
            {getStatusBadge(initialized.adminWallets)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getStatusIcon(initialized.paymentMethods)}
              <span className="font-medium">Payment Methods</span>
            </div>
            {getStatusBadge(initialized.paymentMethods)}
          </div>
        </div>

        <div className="flex gap-2">
          {needsInitialization && (
            <Button onClick={initializeDefaults} disabled={loading}>
              {loading ? 'Initializing...' : 'Initialize Defaults'}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={checkSystemInitialization}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Check Status
          </Button>
        </div>

        {!needsInitialization && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">All systems initialized successfully!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemInitializer;
