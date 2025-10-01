import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wallet, ArrowRightLeft, TrendingUp, Settings, RefreshCw } from 'lucide-react';
import { WalletShareIntegration as WalletShareIntegrationType } from '@/types/shares';

interface WalletShareIntegrationProps {
  shareData: any;
  onUpdate: () => Promise<void>;
}

const WalletShareIntegration: React.FC<WalletShareIntegrationProps> = ({ shareData, onUpdate }) => {
  const [integrations, setIntegrations] = useState<WalletShareIntegrationType[]>([]);
  const [walletBalances, setWalletBalances] = useState<any[]>([]);
  const [crossCurrencyRates, setCrossCurrencyRates] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    auto_sync_enabled: true,
    real_time_updates: true,
    cross_currency_enabled: true,
    default_exchange_fee: 2.5
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadIntegrations();
    loadWalletBalances();
    loadExchangeRates();
    loadSettings();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_wallet_fund_transfers')
        .select(`
          *,
          from_wallet:admin_sub_wallets!from_wallet_id(wallet_name, currency),
          to_wallet:admin_sub_wallets!to_wallet_id(wallet_name, currency)
        `)
        .eq('transfer_type', 'share_purchase_allocation')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Transform to match our interface
      const transformedData = data?.map(item => ({
        wallet_id: item.from_wallet_id || item.to_wallet_id || '',
        share_transaction_id: item.reference || '',
        integration_type: 'purchase' as const,
        amount: item.amount,
        currency: item.currency,
        processing_status: 'completed' as const,
        created_at: item.created_at
      })) || [];
      
      setIntegrations(transformedData);
    } catch (error) {
      console.error('Error loading wallet-share integrations:', error);
    }
  };

  const loadWalletBalances = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_sub_wallets')
        .select('*')
        .in('wallet_type', ['project_funding', 'admin_fund', 'share_buyback']);

      if (error) throw error;
      setWalletBalances(data || []);
    } catch (error) {
      console.error('Error loading wallet balances:', error);
    }
  };

  const loadExchangeRates = async () => {
    try {
      const { data, error } = await supabase
        .from('currency_conversion')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCrossCurrencyRates(data || []);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_payment_settings')
        .select('*')
        .eq('setting_name', 'wallet_share_integration')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSettings(JSON.parse(data.setting_value));
      }
    } catch (error) {
      console.error('Error loading integration settings:', error);
    }
  };

  const handleSettingsUpdate = async () => {
    setLoading(true);
    try {
      const { data: existingSettings } = await supabase
        .from('admin_payment_settings')
        .select('id')
        .eq('setting_name', 'wallet_share_integration')
        .single();

      const settingsData = {
        setting_name: 'wallet_share_integration',
        setting_value: JSON.stringify(settings),
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (existingSettings) {
        const { error } = await supabase
          .from('admin_payment_settings')
          .update(settingsData)
          .eq('id', existingSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_payment_settings')
          .insert(settingsData);
        if (error) throw error;
      }

      toast.success('Integration settings updated successfully');
    } catch (error: any) {
      console.error('Error updating integration settings:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const syncWalletBalances = async () => {
    setLoading(true);
    try {
      // Simulate real-time sync with wallet system
      await loadWalletBalances();
      await loadIntegrations();
      toast.success('Wallet balances synchronized successfully');
    } catch (error: any) {
      console.error('Error syncing wallet balances:', error);
      toast.error(error.message || 'Failed to sync balances');
    } finally {
      setLoading(false);
    }
  };

  const processShareTransaction = async (walletId: string, amount: number, type: string) => {
    setLoading(true);
    try {
      // Create integration record
      const integrationData = {
        from_wallet_id: type === 'purchase' ? walletId : null,
        to_wallet_id: type === 'sale' ? walletId : null,
        amount,
        currency: shareData.currency,
        transfer_type: `share_${type}_integration`,
        description: `Automated ${type} integration`,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('admin_wallet_fund_transfers')
        .insert(integrationData);

      if (error) throw error;

      toast.success(`Share ${type} processed successfully`);
      loadIntegrations();
      loadWalletBalances();
    } catch (error: any) {
      console.error(`Error processing share ${type}:`, error);
      toast.error(error.message || `Failed to process ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      pending: "outline",
      completed: "default",
      failed: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getIntegrationTypeBadge = (type: string) => {
    const colors = {
      purchase: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      sale: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      dividend: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      buyback: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
    };
    return <Badge className={colors[type] || colors.purchase}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="currency" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Cross-Currency
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {walletBalances.map((wallet) => (
              <Card key={wallet.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">
                    {wallet.wallet_name.replace('_', ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {wallet.currency} {wallet.balance.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {wallet.wallet_type.replace('_', ' ')}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => processShareTransaction(wallet.id, 1000, 'purchase')}
                  >
                    Test Integration
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Integration Status</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={syncWalletBalances}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {integrations.filter(i => i.processing_status === 'completed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {integrations.filter(i => i.processing_status === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {integrations.filter(i => i.processing_status === 'failed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {settings.auto_sync_enabled ? 'ON' : 'OFF'}
                  </div>
                  <div className="text-sm text-muted-foreground">Auto Sync</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Wallet-Share Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wallet ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations.map((integration, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(integration.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {getIntegrationTypeBadge(integration.integration_type)}
                      </TableCell>
                      <TableCell>
                        {integration.currency} {integration.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{integration.currency}</TableCell>
                      <TableCell>
                        {getStatusBadge(integration.processing_status)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {integration.wallet_id.slice(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))}
                  {integrations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No wallet-share integrations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Currency Exchange Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crossCurrencyRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>{rate.from_currency}</TableCell>
                      <TableCell>{rate.to_currency}</TableCell>
                      <TableCell>{rate.rate.toFixed(4)}</TableCell>
                      <TableCell>
                        {new Date(rate.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          Update Rate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {crossCurrencyRates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No exchange rates configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-sync">Automatic Synchronization</Label>
                    <div className="text-sm text-muted-foreground">
                      Automatically sync wallet balances with share transactions
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="auto-sync"
                    checked={settings.auto_sync_enabled}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      auto_sync_enabled: e.target.checked 
                    }))}
                    className="toggle"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="real-time">Real-time Updates</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable real-time balance updates during transactions
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="real-time"
                    checked={settings.real_time_updates}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      real_time_updates: e.target.checked 
                    }))}
                    className="toggle"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="cross-currency">Cross-Currency Operations</Label>
                    <div className="text-sm text-muted-foreground">
                      Allow share operations across different currencies
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="cross-currency"
                    checked={settings.cross_currency_enabled}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      cross_currency_enabled: e.target.checked 
                    }))}
                    className="toggle"
                  />
                </div>

                <div>
                  <Label htmlFor="exchange-fee">Default Exchange Fee (%)</Label>
                  <Input
                    id="exchange-fee"
                    type="number"
                    step="0.1"
                    value={settings.default_exchange_fee}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      default_exchange_fee: parseFloat(e.target.value) || 0 
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button onClick={handleSettingsUpdate} disabled={loading}>
                {loading ? 'Updating...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WalletShareIntegration;