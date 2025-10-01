import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const RelWorxTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apiTestResults, setApiTestResults] = useState<any>(null);
  const [apiTesting, setApiTesting] = useState(false);
  const [balanceResult, setBalanceResult] = useState<any>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 5000,
    currency: 'UGX' as 'UGX' | 'KES' | 'TZS',
    phone: '256700000000',
    network: 'mtn' as 'mtn' | 'airtel' | 'mpesa' | 'tigo'
  });

  const checkBalance = async () => {
    setCheckingBalance(true);
    try {
      const { data, error } = await supabase.functions.invoke('simpleles-gateway', {
        body: {
          operation: 'balance'
        }
      });

      if (error) {
        console.error('Balance check error:', error);
        toast.error('Balance check failed: ' + error.message);
        return;
      }

      console.log('Balance check results:', data);
      setBalanceResult(data);
      
      if (data.success) {
        toast.success('Balance retrieved successfully!');
      } else {
        toast.error('Balance check failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Balance check execution error:', error);
      toast.error('Failed to check balance: ' + error.message);
    } finally {
      setCheckingBalance(false);
    }
  };

  const runApiTest = async () => {
    setApiTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-relworx-api');

      if (error) {
        console.error('API test error:', error);
        toast.error('API test failed: ' + error.message);
        return;
      }

      console.log('API test results:', data);
      setApiTestResults(data);
      
      if (data.success) {
        toast.success('RelWorx API test completed successfully');
      } else {
        toast.error('API test failed: ' + data.error);
      }
    } catch (error: any) {
      console.error('API test execution error:', error);
      toast.error('Failed to run API test: ' + error.message);
    } finally {
      setApiTesting(false);
    }
  };

  const runIntegrationTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test_relworx_integration', {
        body: { testType: 'full', currency: 'UGX' }
      });

      if (error) {
        console.error('Test error:', error);
        toast.error('Test failed: ' + error.message);
        return;
      }

      console.log('Test results:', data);
      setTestResults(data);
      
      if (data.success) {
        toast.success('RelWorx integration test completed successfully');
      } else {
        toast.error('Test failed: ' + data.error);
      }
    } catch (error: any) {
      console.error('Test execution error:', error);
      toast.error('Failed to run test: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testPayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-relworx-api', {
        body: {
          amount: paymentData.amount.toString(),
          currency: paymentData.currency,
          msisdn: paymentData.phone,
          description: `Test payment: ${paymentData.currency} ${paymentData.amount} via ${paymentData.network}`
        }
      });

      if (error) {
        console.error('Payment test error:', error);
        toast.error('Payment test failed: ' + error.message);
        return;
      }

      console.log('Payment test results:', data);
      setTestResults(data);
      
      if (data.success) {
        toast.success('Payment initiated successfully! Check response for details.');
      } else {
        toast.error('Payment failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Payment test execution error:', error);
      toast.error('Failed to run payment test: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testWalletDeposit = async () => {
    setLoading(true);
    try {
      // First test the SimpleLes API
      const apiTest = await supabase.functions.invoke('test-relworx-api', {
        body: {
          amount: paymentData.amount.toString(),
          currency: paymentData.currency,
          msisdn: paymentData.phone,
          description: `Wallet deposit test: ${paymentData.currency} ${paymentData.amount}`
        }
      });

      if (apiTest.error) {
        toast.error('API test failed: ' + apiTest.error.message);
        return;
      }

      // If API test succeeds, process the deposit
      const { data, error } = await supabase.functions.invoke('process-deposit', {
        body: {
          amount: paymentData.amount,
          currency: paymentData.currency,
          phone: paymentData.phone,
          network: paymentData.network,
          merchant_code: 'YEW2024A25E4R',
          merchant_transaction_id: `TEST_${Date.now()}`,
          description: `Test deposit: ${paymentData.currency} ${paymentData.amount}`
        }
      });

      if (error) {
        console.error('Deposit error:', error);
        toast.error('Deposit failed: ' + error.message);
        return;
      }

      console.log('Deposit results:', data);
      setTestResults({
        ...data,
        apiTestResults: apiTest.data
      });
      
      if (data.success) {
        toast.success('Deposit created successfully! Transaction is pending approval.');
      } else {
        toast.error('Deposit failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Deposit execution error:', error);
      toast.error('Failed to process deposit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTestResults = () => {
    if (!testResults) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={testResults.success ? 'default' : 'destructive'}>
            {testResults.success ? 'SUCCESS' : 'FAILED'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {testResults.timestamp}
          </span>
        </div>

        {testResults.results && Object.entries(testResults.results).map(([key, result]: [string, any]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.success ? 'PASS' : 'FAIL'}
                </Badge>
              </div>
              
              {result.error && (
                <p className="text-sm text-red-600 mb-2">{result.error}</p>
              )}
              
              {result.details && (
                <div className="text-xs text-muted-foreground">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>SimpleLes Balance Inquiry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground mb-2">
            Account: YEW2024A25E4R
          </div>
          <Button 
            onClick={checkBalance} 
            disabled={checkingBalance}
            className="w-full"
          >
            {checkingBalance ? 'Checking Balance...' : 'Check SimpleLes Balance'}
          </Button>
          
          {balanceResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={balanceResult.success ? 'default' : 'destructive'}>
                  {balanceResult.success ? 'SUCCESS' : 'FAILED'}
                </Badge>
              </div>
              
              {balanceResult.data && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">Balance Information:</div>
                  <div className="text-2xl font-bold text-primary">
                    UGX {balanceResult.data.balance?.toLocaleString() || '0'}
                  </div>
                  {balanceResult.data.statusCode && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Status Code: {balanceResult.data.statusCode}
                    </div>
                  )}
                </div>
              )}
              
              {balanceResult.responseData && (
                <div className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                  <div className="font-medium mb-2">Full Response:</div>
                  <pre>{JSON.stringify(balanceResult.responseData, null, 2)}</pre>
                </div>
              )}
              
              {balanceResult.error && (
                <p className="text-sm text-red-600">{balanceResult.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RelWorx API Direct Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runApiTest} 
            disabled={apiTesting}
            className="w-full"
          >
            {apiTesting ? 'Testing API...' : 'Test RelWorx API Direct'}
          </Button>
          
          {apiTestResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={apiTestResults.success ? 'default' : 'destructive'}>
                  {apiTestResults.success ? 'SUCCESS' : 'FAILED'}
                </Badge>
              </div>
              
              {apiTestResults.results && (
                <div className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                  <pre>{JSON.stringify(apiTestResults.results, null, 2)}</pre>
                </div>
              )}
              
              {apiTestResults.error && (
                <p className="text-sm text-red-600">{apiTestResults.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RelWorx Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runIntegrationTest} 
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? 'Running Tests...' : 'Run Integration Test'}
          </Button>
          
          {testResults && renderTestResults()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Mobile Money Deposit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={paymentData.currency}
                onChange={(e) => setPaymentData(prev => ({ ...prev, currency: e.target.value as any }))}
                className="w-full p-2 border rounded"
              >
                <option value="UGX">UGX</option>
                <option value="KES">KES</option>
                <option value="TZS">TZS</option>
              </select>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={paymentData.phone}
                onChange={(e) => setPaymentData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="256700000000"
              />
            </div>
            <div>
              <Label htmlFor="network">Network</Label>
              <select
                id="network"
                value={paymentData.network}
                onChange={(e) => setPaymentData(prev => ({ ...prev, network: e.target.value as any }))}
                className="w-full p-2 border rounded"
              >
                <option value="mtn">MTN</option>
                <option value="airtel">Airtel</option>
                <option value="mpesa">M-Pesa</option>
                <option value="tigo">Tigo</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={testPayment} 
              disabled={loading}
              className="flex-1"
              variant="outline"
            >
              {loading ? 'Testing...' : 'Test API Only'}
            </Button>
            
            <Button 
              onClick={testWalletDeposit} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Test Full Deposit'}
            </Button>
          </div>
          
          {testResults && testResults.testType === 'payment' && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge variant={testResults.success ? 'default' : 'destructive'}>
                  {testResults.success ? 'SUCCESS' : 'FAILED'}
                </Badge>
              </div>
              
              {testResults.results && (
                <div className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                  <pre>{JSON.stringify(testResults.results, null, 2)}</pre>
                </div>
              )}
              
              {testResults.error && (
                <p className="text-sm text-red-600">{testResults.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};