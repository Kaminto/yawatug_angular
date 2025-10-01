import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Activity, CreditCard, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RelWorxConfigurationManager from './RelWorxConfigurationManager';
import RelWorxTestPanel from './RelWorxTestPanel';

interface RelWorxConfig {
  id: string;
  merchant_id: string;
  api_key: string;
  webhook_secret: string;
  is_active: boolean;
  is_sandbox: boolean;
  created_at: string;
  updated_at: string;
}

interface PaymentTransaction {
  id: string;
  gateway_transaction_id: string;
  gateway_reference: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  user_id: string;
  gateway_response: any;
}

const RelWorxPaymentManagement: React.FC = () => {
  const [config, setConfig] = useState<RelWorxConfig | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configFormOpen, setConfigFormOpen] = useState(false);
  const [testPaymentOpen, setTestPaymentOpen] = useState(false);

  const [formData, setFormData] = useState({
    merchant_id: '',
    api_key: '',
    webhook_secret: '',
    is_active: false,
    is_sandbox: true
  });

  useEffect(() => {
    loadConfig();
    loadTransactions();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('relworx_payment_configs')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setConfig(data);
        setFormData({
          merchant_id: data.merchant_id,
          api_key: data.api_key,
          webhook_secret: data.webhook_secret,
          is_active: data.is_active,
          is_sandbox: data.is_sandbox
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Failed to load payment configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_gateway_transactions')
        .select('*')
        .eq('gateway_name', 'relworx')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      // Deactivate existing configs
      await supabase
        .from('relworx_payment_configs')
        .update({ is_active: false })
        .neq('id', 'dummy');

      // Insert new config
      const { error } = await supabase
        .from('relworx_payment_configs')
        .upsert({
          ...formData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Payment configuration saved successfully');
      setConfigFormOpen(false);
      loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const testPaymentGateway = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('process-mobile-money-payment', {
        body: {
          amount: 1000,
          currency: 'UGX',
          phone: '+256777123456',
          network: 'mtn',
          transaction_type: 'deposit',
          description: 'Test payment from admin panel'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Test payment initiated successfully');
      } else {
        toast.error(data.error || 'Test payment failed');
      }
    } catch (error) {
      console.error('Test payment error:', error);
      toast.error('Test payment failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><X className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RelWorx Payment Gateway</h2>
          <p className="text-muted-foreground">Manage mobile money payments integration</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={testPaymentOpen} onOpenChange={setTestPaymentOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Activity className="w-4 h-4 mr-2" />
                Test Gateway
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Test Payment Gateway</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This will initiate a test payment of 1,000 UGX to verify gateway connectivity.
                </p>
                <Button onClick={testPaymentGateway} className="w-full">
                  Run Test Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={configFormOpen} onOpenChange={setConfigFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Settings className="w-4 h-4 mr-2" />
                Configure Gateway
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>RelWorx Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="merchant_id">Merchant ID</Label>
                  <Input
                    id="merchant_id"
                    value={formData.merchant_id}
                    onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                    placeholder="Your RelWorx merchant ID"
                  />
                </div>
                
                <div>
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="Your RelWorx API key"
                  />
                </div>
                
                <div>
                  <Label htmlFor="webhook_secret">Webhook Secret</Label>
                  <Input
                    id="webhook_secret"
                    type="password"
                    value={formData.webhook_secret}
                    onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                    placeholder="Webhook verification secret"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_sandbox">Sandbox Mode</Label>
                  <Switch
                    id="is_sandbox"
                    checked={formData.is_sandbox}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_sandbox: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                
                <Button onClick={saveConfig} disabled={saving} className="w-full">
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-2xl font-bold">
                  {config?.is_active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Mode</p>
                <p className="text-2xl font-bold">
                  {config?.is_sandbox ? 'Sandbox' : 'Live'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payment Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-xs">
                        {transaction.gateway_transaction_id?.slice(0, 12)}...
                      </TableCell>
                      <TableCell>
                        {transaction.amount.toLocaleString()} {transaction.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.payment_method}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

            <TabsContent value="settings">
              <div className="space-y-6">
                <RelWorxConfigurationManager />
                <RelWorxTestPanel />
              </div>
            </TabsContent>
      </Tabs>
    </div>
  );
};

export default RelWorxPaymentManagement;