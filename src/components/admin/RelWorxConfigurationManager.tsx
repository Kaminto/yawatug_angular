import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Save, TestTube, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RelWorxConfig {
  id: string;
  merchant_id: string;
  account_no: string;
  api_key: string;
  webhook_secret: string;
  is_sandbox: boolean;
  is_active: boolean;
  key_prefix?: string;
  authorized_business_accounts?: string[];
  key_name?: string;
  key_permissions?: object;
  rate_limit_settings?: {
    max_requests: number;
    window_minutes: number;
  };
  webhook_url?: string;
  api_version?: string;
  supported_currencies?: string[];
  payment_limits?: {
    min_ugx: number;
    max_ugx: number;
    min_kes: number;
    max_kes: number;
    min_tzs: number;
    max_tzs: number;
  };
}

const RelWorxConfigurationManager: React.FC = () => {
  const [config, setConfig] = useState<RelWorxConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('relworx_payment_configs')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({
          ...data,
          key_permissions: (data.key_permissions as any) || {},
          rate_limit_settings: (data.rate_limit_settings as any) || { max_requests: 5, window_minutes: 10 },
          payment_limits: (data.payment_limits as any) || { min_ugx: 1000, max_ugx: 10000000, min_kes: 100, max_kes: 1000000, min_tzs: 1000, max_tzs: 10000000 }
        });
      } else {
        // Create default config
        setConfig({
          id: '',
          merchant_id: '',
          account_no: '',
          api_key: '',
          webhook_secret: '',
          is_sandbox: false,
          is_active: true,
          key_name: 'Yawatu_1',
          api_version: 'v2',
          supported_currencies: ['UGX', 'KES', 'TZS'],
          payment_limits: {
            min_ugx: 500,
            max_ugx: 5000000,
            min_kes: 10,
            max_kes: 70000,
            min_tzs: 500,
            max_tzs: 5000000
          },
          rate_limit_settings: {
            max_requests: 5,
            window_minutes: 10
          }
        });
      }
    } catch (error) {
      console.error('Error loading RelWorx config:', error);
      toast.error('Failed to load RelWorx configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!config) return;

    setSaving(true);
    try {
      // Validation
      if (!config.merchant_id || !config.account_no || !config.api_key) {
        toast.error('Please fill in all required fields');
        return;
      }

      const configData = {
        merchant_id: config.merchant_id,
        account_no: config.account_no,
        api_key: config.api_key,
        webhook_secret: config.webhook_secret,
        is_sandbox: config.is_sandbox,
        is_active: config.is_active,
        key_name: config.key_name || 'Yawatu_1',
        key_prefix: config.merchant_id ? config.merchant_id.slice(0, 14) : '',
        authorized_business_accounts: config.account_no ? [config.account_no] : [],
        api_version: config.api_version || 'v2',
        supported_currencies: config.supported_currencies || ['UGX', 'KES', 'TZS'],
        payment_limits: config.payment_limits || {
          min_ugx: 500,
          max_ugx: 5000000,
          min_kes: 10,
          max_kes: 70000,
          min_tzs: 500,
          max_tzs: 5000000
        },
        rate_limit_settings: config.rate_limit_settings || {
          max_requests: 5,
          window_minutes: 10
        }
      };

      let result;
      if (config.id) {
        // Update existing
        result = await supabase
          .from('relworx_payment_configs')
          .update(configData)
          .eq('id', config.id)
          .select()
          .single();
      } else {
        // Create new
        result = await supabase
          .from('relworx_payment_configs')
          .insert(configData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setConfig(result.data);
      toast.success('RelWorx configuration saved successfully');
    } catch (error) {
      console.error('Error saving RelWorx config:', error);
      toast.error('Failed to save RelWorx configuration');
    } finally {
      setSaving(false);
    }
  };

  const testConfiguration = async () => {
    if (!config) return;

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-relworx-integration', {
        body: {
          testType: 'full',
          phoneNumber: '256771234567',
          amount: 1000,
          currency: 'UGX'
        }
      });

      if (error) {
        setTestResult({
          success: false,
          message: error.message || 'Integration test failed'
        });
      } else if (data?.success) {
        setTestResult({
          success: true,
          message: `Integration test passed! All components working: ${JSON.stringify(data.results, null, 2)}`
        });
      } else {
        setTestResult({
          success: false,
          message: data?.error || `Integration test failed: ${JSON.stringify(data.results, null, 2)}`
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Integration test request failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const getConfigurationStatus = () => {
    if (!config) return { status: 'unknown', message: 'Configuration not loaded' };

    const hasValidMerchantId = config.merchant_id && 
      config.merchant_id !== 'YOUR_ACTUAL_RELWORX_MERCHANT_ID' &&
      config.merchant_id.length > 5;
      
    const hasValidAccountNo = config.account_no && 
      config.account_no !== 'RELWORX_ACCOUNT_NUMBER_REQUIRED' &&
      config.account_no.length > 5;

    const hasValidApiKey = config.api_key && 
      config.api_key !== 'will_be_overridden_by_env' &&
      config.api_key.length > 10;

    if (!hasValidMerchantId || !hasValidAccountNo || !hasValidApiKey) {
      return { status: 'incomplete', message: 'Configuration incomplete - please fill in all credentials' };
    }

    if (!config.is_active) {
      return { status: 'inactive', message: 'Configuration is disabled' };
    }

    return { status: 'ready', message: 'Configuration ready for use' };
  };

  const status = getConfigurationStatus();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <span>Loading RelWorx configuration...</span>
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
          RelWorx Payment Gateway Configuration
        </CardTitle>
        <div className="flex items-center gap-2">
          {status.status === 'ready' && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready
            </Badge>
          )}
          {status.status === 'incomplete' && (
            <Badge className="bg-yellow-100 text-yellow-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Incomplete
            </Badge>
          )}
          {status.status === 'inactive' && (
            <Badge className="bg-red-100 text-red-800">
              <XCircle className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">{status.message}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Alert */}
        {status.status !== 'ready' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {status.message}. Mobile money payments will not work until configuration is complete.
            </AlertDescription>
          </Alert>
        )}

        {config && (
          <>
            {/* Basic Configuration */}
            <div className="space-y-4">
              <h3 className="font-medium">Gateway Credentials</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="merchant_id">Merchant ID *</Label>
                  <Input
                    id="merchant_id"
                    value={config.merchant_id}
                    onChange={(e) => setConfig({ ...config, merchant_id: e.target.value })}
                    placeholder="Enter RelWorx Merchant ID"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account_no">Account Number *</Label>
                  <Input
                    id="account_no"
                    value={config.account_no}
                    onChange={(e) => setConfig({ ...config, account_no: e.target.value })}
                    placeholder="Enter RelWorx Account Number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_key">API Key *</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="Enter RelWorx API Key"
                />
                <p className="text-xs text-muted-foreground">
                  Note: The actual API key should be set in Supabase secrets as RELWORX_API_KEY
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_secret">Webhook Secret</Label>
                <Input
                  id="webhook_secret"
                  type="password"
                  value={config.webhook_secret}
                  onChange={(e) => setConfig({ ...config, webhook_secret: e.target.value })}
                  placeholder="Enter RelWorx Webhook Secret"
                />
                <p className="text-xs text-muted-foreground">
                  Used to verify incoming webhooks from RelWorx
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="key_name">API Key Name</Label>
                  <Input
                    id="key_name"
                    value={config.key_name || ''}
                    onChange={(e) => setConfig({ ...config, key_name: e.target.value })}
                    placeholder="e.g., Yawatu_1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Friendly name for your API key
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="key_prefix">Key Prefix</Label>
                  <Input
                    id="key_prefix"
                    value={config.key_prefix || ''}
                    disabled
                    placeholder="Auto-generated from merchant ID"
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically derived from merchant ID
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook_url">Webhook URL</Label>
                <Input
                  id="webhook_url"
                  value={config.webhook_url || ''}
                  onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                  placeholder="https://yourdomain.com/api/relworx/webhook"
                />
                <p className="text-xs text-muted-foreground">
                  URL where RelWorx will send payment notifications
                </p>
              </div>
            </div>

            <Separator />

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="font-medium">Settings</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_sandbox">Sandbox Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable for testing with RelWorx sandbox environment
                  </p>
                </div>
                <Switch
                  id="is_sandbox"
                  checked={config.is_sandbox}
                  onCheckedChange={(checked) => setConfig({ ...config, is_sandbox: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_active">Active Configuration</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable to use this configuration for payments
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={config.is_active}
                  onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Supported Currencies</Label>
                <div className="text-sm text-muted-foreground">
                  {config.supported_currencies?.join(', ') || 'UGX, KES, TZS'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currencies supported by this configuration
                </p>
              </div>

              <div className="space-y-2">
                <Label>Rate Limits</Label>
                <div className="text-sm text-muted-foreground">
                  {config.rate_limit_settings?.max_requests || 5} requests per {config.rate_limit_settings?.window_minutes || 10} minutes
                </div>
                <p className="text-xs text-muted-foreground">
                  RelWorx API rate limiting as per documentation
                </p>
              </div>

              <div className="space-y-2">
                <Label>Payment Limits (UGX)</Label>
                <div className="text-sm text-muted-foreground">
                  Min: UGX {config.payment_limits?.min_ugx?.toLocaleString() || '500'} - 
                  Max: UGX {config.payment_limits?.max_ugx?.toLocaleString() || '5,000,000'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum and maximum transaction amounts
                </p>
              </div>
            </div>

            <Separator />

            {/* Test Results */}
            {testResult && (
              <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                  {testResult.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={saveConfiguration}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={testConfiguration}
                disabled={testing || status.status !== 'ready'}
                className="flex-1"
              >
                {testing ? 'Testing...' : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Configuration
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RelWorxConfigurationManager;