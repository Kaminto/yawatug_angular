import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TestTube, CheckCircle, XCircle, Loader2, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestResult {
  success: boolean;
  error?: string;
  results?: {
    configuration?: any;
    apiConnectivity?: any;
    webhookHandler?: any;
    fullIntegration?: any;
  };
  timestamp: string;
  testType: string;
}

const RelWorxTestPanel: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testType, setTestType] = useState<'config' | 'api' | 'webhook' | 'full'>('config');
  const [testParams, setTestParams] = useState({
    phoneNumber: '256771234567',
    amount: 1000,
    currency: 'UGX' as 'UGX' | 'KES' | 'TZS'
  });

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      console.log('🧪 Running RelWorx integration test:', testType);
      
      const { data, error } = await supabase.functions.invoke('test-relworx', {
        body: {
          testType,
          phoneNumber: testParams.phoneNumber,
          amount: testParams.amount,
          currency: testParams.currency
        }
      });

      if (error) {
        console.error('Test invocation error:', error);
        setTestResult({
          success: false,
          error: error.message || 'Test execution failed',
          timestamp: new Date().toISOString(),
          testType
        });
        toast.error('Test execution failed');
      } else {
        console.log('Test completed:', data);
        setTestResult(data);
        if (data.success) {
          toast.success('RelWorx integration test passed!');
        } else {
          toast.error(data.error || 'Test failed');
        }
      }
    } catch (error: any) {
      console.error('Test error:', error);
      setTestResult({
        success: false,
        error: error.message || 'Unexpected test error',
        timestamp: new Date().toISOString(),
        testType
      });
      toast.error('Test execution failed');
    } finally {
      setTesting(false);
    }
  };

  const getTestDescription = (type: string) => {
    switch (type) {
      case 'config':
        return 'Tests RelWorx configuration, environment variables, and database settings';
      case 'api':
        return 'Tests connectivity to RelWorx API endpoints';
      case 'webhook':
        return 'Tests webhook handler configuration and signature verification';
      case 'full':
        return 'Comprehensive test of all RelWorx integration components';
      default:
        return 'Unknown test type';
    }
  };

  const renderTestResults = () => {
    if (!testResult) return null;

    return (
      <div className="space-y-4">
        <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
              <strong>
                {testResult.success ? 'Test Passed' : 'Test Failed'}
              </strong>
              {testResult.error && `: ${testResult.error}`}
            </AlertDescription>
          </div>
        </Alert>

        {testResult.results && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Test Results:</h4>
            
            {testResult.results.configuration && (
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Configuration Test</span>
                  <Badge variant={testResult.results.configuration.success ? "default" : "destructive"}>
                    {testResult.results.configuration.success ? 'Pass' : 'Fail'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {testResult.results.configuration.details?.config || 
                   testResult.results.configuration.error}
                </div>
              </Card>
            )}

            {testResult.results.apiConnectivity && (
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">API Connectivity Test</span>
                  <Badge variant={testResult.results.apiConnectivity.success ? "default" : "destructive"}>
                    {testResult.results.apiConnectivity.success ? 'Pass' : 'Fail'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Status: {testResult.results.apiConnectivity.statusCode || 'Unknown'}
                  {testResult.results.apiConnectivity.details?.note && (
                    <div>{testResult.results.apiConnectivity.details.note}</div>
                  )}
                </div>
              </Card>
            )}

            {testResult.results.webhookHandler && (
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Webhook Handler Test</span>
                  <Badge variant={testResult.results.webhookHandler.success ? "default" : "destructive"}>
                    {testResult.results.webhookHandler.success ? 'Pass' : 'Fail'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {testResult.results.webhookHandler.details?.note || 
                   testResult.results.webhookHandler.error}
                </div>
              </Card>
            )}

            {testResult.results.fullIntegration && (
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Full Integration Test</span>
                  <Badge variant={testResult.results.fullIntegration.success ? "default" : "destructive"}>
                    {testResult.results.fullIntegration.success ? 'Pass' : 'Fail'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {testResult.results.fullIntegration.details?.note || 
                   testResult.results.fullIntegration.error}
                </div>
              </Card>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Test completed at: {new Date(testResult.timestamp).toLocaleString()}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          RelWorx Integration Testing
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test your RelWorx payment gateway integration to ensure everything is working correctly
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Test Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testType">Test Type</Label>
            <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="config">Configuration Test</SelectItem>
                <SelectItem value="api">API Connectivity Test</SelectItem>
                <SelectItem value="webhook">Webhook Handler Test</SelectItem>
                <SelectItem value="full">Full Integration Test</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getTestDescription(testType)}
            </p>
          </div>

          {(testType === 'full') && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Test Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={testParams.phoneNumber}
                  onChange={(e) => setTestParams({...testParams, phoneNumber: e.target.value})}
                  placeholder="256771234567"
                />
                <p className="text-xs text-muted-foreground">
                  Phone number for integration testing
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Test Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={testParams.amount}
                  onChange={(e) => setTestParams({...testParams, amount: parseInt(e.target.value)})}
                  placeholder="1000"
                />
                <p className="text-xs text-muted-foreground">
                  Amount for test transaction
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={testParams.currency} 
                  onValueChange={(value: any) => setTestParams({...testParams, currency: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UGX">UGX</SelectItem>
                    <SelectItem value="KES">KES</SelectItem>
                    <SelectItem value="TZS">TZS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Test Action */}
        <Button
          onClick={runTest}
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run {testType.charAt(0).toUpperCase() + testType.slice(1)} Test
            </>
          )}
        </Button>

        {/* Test Results */}
        {renderTestResults()}

        {/* Test Information */}
        <Alert>
          <TestTube className="h-4 w-4" />
          <AlertDescription>
            <strong>Test Information:</strong>
            <ul className="list-disc list-inside mt-1 text-sm space-y-1">
              <li><strong>Configuration Test:</strong> Verifies environment variables and database settings</li>
              <li><strong>API Test:</strong> Checks connectivity to RelWorx payment gateway</li>
              <li><strong>Webhook Test:</strong> Validates webhook handler setup and signature verification</li>
              <li><strong>Full Test:</strong> Comprehensive integration test (creates and cleans up test transaction)</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default RelWorxTestPanel;