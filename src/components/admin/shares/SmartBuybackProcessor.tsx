import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Brain, Zap, TrendingUp, Settings, Play, Pause } from 'lucide-react';
import { SmartBuybackSettings, EnhancedBuybackOrder } from '@/types/shares';

interface SmartBuybackProcessorProps {
  shareData: any;
  onUpdate: () => Promise<void>;
}

const SmartBuybackProcessor: React.FC<SmartBuybackProcessorProps> = ({ shareData, onUpdate }) => {
  const [settings, setSettings] = useState<SmartBuybackSettings>({
    id: '',
    is_enabled: false,
    algorithm_type: 'fifo',
    max_daily_amount: 100000,
    min_fund_threshold: 50000,
    auto_approval_limit: 10000,
    batch_processing_size: 10,
    processing_frequency: 'daily',
    market_price_factor: 0.95,
    created_at: '',
    updated_at: ''
  });
  
  const [orders, setOrders] = useState<EnhancedBuybackOrder[]>([]);
  const [processing, setProcessing] = useState(false);
  const [fundBalance, setFundBalance] = useState(0);
  const [dailyProcessed, setDailyProcessed] = useState(0);

  useEffect(() => {
    loadSettings();
    loadOrders();
    loadFundBalance();
    loadDailyStats();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_payment_settings')
        .select('*')
        .eq('setting_name', 'smart_buyback_config')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSettings(JSON.parse(data.setting_value));
      }
    } catch (error) {
      console.error('Error loading smart buyback settings:', error);
    }
  };

  const loadOrders = async () => {
    try {
      // Use existing share_buyback_orders table
      const { data, error } = await supabase
        .from('share_buyback_orders')
        .select(`
          *,
          profiles:user_id(full_name, email)
        `)
        .in('status', ['pending', 'partial'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform to enhanced format
      const transformedOrders = data?.map(order => ({
        ...order,
        original_quantity: order.quantity,
        remaining_quantity: order.quantity,
        partial_payment: 0,
        total_payments_made: 0,
        payment_percentage: 0,
        fifo_position: null,
        last_payment_date: null,
        expires_at: null,
        completed_at: null
      })) || [];
      
      setOrders(transformedOrders as any);
    } catch (error) {
      console.error('Error loading buyback orders:', error);
    }
  };

  const loadFundBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_sub_wallets')
        .select('balance')
        .eq('wallet_type', 'share_buyback')
        .eq('currency', shareData.currency)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setFundBalance(data?.balance || 0);
    } catch (error) {
      console.error('Error loading fund balance:', error);
    }
  };

  const loadDailyStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('share_buyback_orders')
        .select('requested_price')
        .eq('status', 'approved')
        .gte('created_at', today);

      if (error) throw error;
      const total = data?.reduce((sum, order) => sum + (order.requested_price || 0), 0) || 0;
      setDailyProcessed(total);
    } catch (error) {
      console.error('Error loading daily stats:', error);
    }
  };

  const handleSettingsUpdate = async () => {
    try {
      const { data: existingSettings } = await supabase
        .from('admin_payment_settings')
        .select('id')
        .eq('setting_name', 'smart_buyback_config')
        .single();

      const settingsData = {
        setting_name: 'smart_buyback_config',
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

      toast.success('Smart buyback settings updated successfully');
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error(error.message || 'Failed to update settings');
    }
  };

  const processNextBatch = async () => {
    setProcessing(true);
    try {
      const remainingDaily = settings.max_daily_amount - dailyProcessed;
      if (remainingDaily <= 0) {
        toast.error('Daily processing limit reached');
        return;
      }

      const availableOrders = orders.slice(0, settings.batch_processing_size);
      let processedAmount = 0;
      let processedCount = 0;

      for (const order of availableOrders) {
        if (processedAmount >= remainingDaily) break;
        if (fundBalance < order.requested_price) break;

        const paymentAmount = Math.min(
          order.requested_price - (order.total_payments_made || 0),
          settings.auto_approval_limit,
          remainingDaily - processedAmount
        );

        if (paymentAmount > 0) {
          // Process the payment via existing buyback table
          const { error: updateError } = await supabase
            .from('share_buyback_orders')
            .update({
              status: paymentAmount >= order.requested_price ? 'approved' : 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateError) throw updateError;

          // Update fund balance
          const { error: fundError } = await supabase
            .from('admin_sub_wallets')
            .update({ 
              balance: fundBalance - paymentAmount,
              updated_at: new Date().toISOString() 
            })
            .eq('wallet_type', 'share_buyback')
            .eq('currency', shareData.currency);

          if (fundError) throw fundError;

          processedAmount += paymentAmount;
          processedCount++;
        }
      }

      toast.success(`Processed ${processedCount} orders for ${shareData.currency} ${processedAmount.toLocaleString()}`);
      
      // Reload data
      loadOrders();
      loadFundBalance();
      loadDailyStats();
      
    } catch (error: any) {
      console.error('Error processing batch:', error);
      toast.error(error.message || 'Failed to process batch');
    } finally {
      setProcessing(false);
    }
  };

  const getAlgorithmDescription = (type: string) => {
    switch (type) {
      case 'fifo': return 'First In, First Out - processes oldest orders first';
      case 'price_weighted': return 'Prioritizes orders by price efficiency';
      case 'time_weighted': return 'Balances order age with other factors';
      default: return 'Standard processing algorithm';
    }
  };

  const canProcess = fundBalance >= settings.min_fund_threshold && 
                    dailyProcessed < settings.max_daily_amount && 
                    orders.length > 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="processor" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="processor" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Smart Processor
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Algorithm Settings
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Processing Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="processor" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fund Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shareData.currency} {fundBalance.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Threshold: {settings.min_fund_threshold.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Daily Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shareData.currency} {dailyProcessed.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Limit: {settings.max_daily_amount.toLocaleString()}
                </div>
                <Progress 
                  value={(dailyProcessed / settings.max_daily_amount) * 100} 
                  className="mt-2" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pending Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orders.length}</div>
                <div className="text-sm text-muted-foreground">
                  In processing queue
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {settings.is_enabled ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <Play className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Pause className="h-3 w-3 mr-1" />
                      Paused
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Smart Processing Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enable-processing"
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    is_enabled: checked 
                  }))}
                />
                <Label htmlFor="enable-processing">
                  Enable Automated Processing
                </Label>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium mb-2">Current Algorithm: {settings.algorithm_type.toUpperCase()}</div>
                <div className="text-sm text-muted-foreground">
                  {getAlgorithmDescription(settings.algorithm_type)}
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={processNextBatch}
                  disabled={!canProcess || processing}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {processing ? 'Processing...' : 'Process Next Batch'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleSettingsUpdate}
                >
                  Save Settings
                </Button>
              </div>

              {!canProcess && (
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  {fundBalance < settings.min_fund_threshold && 'Insufficient funds in buyback wallet. '}
                  {dailyProcessed >= settings.max_daily_amount && 'Daily processing limit reached. '}
                  {orders.length === 0 && 'No pending orders to process.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Processing Algorithm</Label>
                  <Select 
                    onValueChange={(value: any) => setSettings(prev => ({ 
                      ...prev, 
                      algorithm_type: value 
                    }))}
                    value={settings.algorithm_type}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fifo">FIFO (First In, First Out)</SelectItem>
                      <SelectItem value="price_weighted">Price Weighted</SelectItem>
                      <SelectItem value="time_weighted">Time Weighted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Processing Frequency</Label>
                  <Select 
                    onValueChange={(value: any) => setSettings(prev => ({ 
                      ...prev, 
                      processing_frequency: value 
                    }))}
                    value={settings.processing_frequency}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Max Daily Amount ({shareData.currency})</Label>
                  <Input
                    type="number"
                    value={settings.max_daily_amount}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      max_daily_amount: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
                
                <div>
                  <Label>Minimum Fund Threshold ({shareData.currency})</Label>
                  <Input
                    type="number"
                    value={settings.min_fund_threshold}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      min_fund_threshold: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Auto Approval Limit ({shareData.currency})</Label>
                  <Input
                    type="number"
                    value={settings.auto_approval_limit}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      auto_approval_limit: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
                
                <div>
                  <Label>Batch Size (orders)</Label>
                  <Input
                    type="number"
                    value={settings.batch_processing_size}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      batch_processing_size: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
                
                <div>
                  <Label>Market Price Factor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.market_price_factor}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      market_price_factor: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Queue ({orders.length} orders)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {orders.slice(0, 10).map((order, index) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <div className="font-medium">
                          {order.profiles?.full_name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.quantity} shares @ {shareData.currency} {order.requested_price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {((order.total_payments_made || 0) / order.requested_price * 100).toFixed(1)}% paid
                      </div>
                      <Progress 
                        value={(order.total_payments_made || 0) / order.requested_price * 100} 
                        className="w-20" 
                      />
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders in processing queue
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartBuybackProcessor;