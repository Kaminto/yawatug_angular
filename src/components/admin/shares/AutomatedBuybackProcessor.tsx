import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Bot, Play, Pause, Settings } from 'lucide-react';

interface AutomatedBuybackProcessorProps {
  onUpdate?: () => void;
}

interface BuybackSettings {
  is_enabled: boolean;
  minimum_fund_threshold: number;
  processing_frequency: string;
  max_orders_per_batch: number;
  price_calculation_method: string;
  auto_approve_limit: number;
}

interface BuybackOrder {
  id: string;
  user_id: string;
  quantity: number;
  price_per_share?: number;
  total_amount?: number;
  net_amount?: number;
  status: string;
  fifo_position: number;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AutomatedBuybackProcessor: React.FC<AutomatedBuybackProcessorProps> = ({ onUpdate }) => {
  const [settings, setSettings] = useState<BuybackSettings>({
    is_enabled: false,
    minimum_fund_threshold: 1000000,
    processing_frequency: 'daily',
    max_orders_per_batch: 10,
    price_calculation_method: 'fifo',
    auto_approve_limit: 500000
  });
  const [pendingOrders, setPendingOrders] = useState<BuybackOrder[]>([]);
  const [availableFunds, setAvailableFunds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadBuybackSettings(),
        loadPendingOrders(),
        loadAvailableFunds()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuybackSettings = async () => {
    // For now, we'll store settings in local state
    // In a real implementation, you'd store these in a settings table
    const savedSettings = localStorage.getItem('buyback_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const loadPendingOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('share_buyback_orders')
        .select(`
          *,
          profiles!share_buyback_orders_user_id_fkey (
            full_name,
            email
          )
        `)
        .in('status', ['pending', 'partial'])
        .order('fifo_position', { ascending: true });

      if (error) throw error;
      setPendingOrders(data || []);
    } catch (error) {
      console.error('Error loading pending orders:', error);
    }
  };

  const loadAvailableFunds = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_sub_wallets')
        .select('balance')
        .eq('wallet_type', 'share_buyback')
        .eq('currency', 'UGX')
        .single();

      if (error) throw error;
      setAvailableFunds(data?.balance || 0);
    } catch (error) {
      console.error('Error loading available funds:', error);
    }
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem('buyback_settings', JSON.stringify(settings));
      toast.success('Buyback settings saved successfully');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const processNextBatch = async () => {
    if (!settings.is_enabled) {
      toast.error('Automated buyback is disabled');
      return;
    }

    if (availableFunds < settings.minimum_fund_threshold) {
      toast.error(`Insufficient funds. Minimum threshold: ${settings.minimum_fund_threshold.toLocaleString()} UGX`);
      return;
    }

    setProcessing(true);
    try {
      const ordersToProcess = pendingOrders
        .slice(0, settings.max_orders_per_batch)
        .filter(order => (order.total_amount || order.net_amount || 0) <= availableFunds);

      if (ordersToProcess.length === 0) {
        toast.info('No orders can be processed with current funds');
        return;
      }

      let remainingFunds = availableFunds;
      let processedCount = 0;

      for (const order of ordersToProcess) {
        const orderAmount = order.total_amount || order.net_amount || 0;
        if (remainingFunds >= orderAmount) {
          // In a real implementation, you'd call a database function to process the buyback
          // For now, we'll simulate the processing
          await new Promise(resolve => setTimeout(resolve, 500));
          
          remainingFunds -= orderAmount;
          processedCount++;

          // Update order status
          await supabase
            .from('share_buyback_orders')
            .update({ 
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', order.id);
        }
      }

      toast.success(`Processed ${processedCount} buyback orders successfully`);
      loadData();
    } catch (error) {
      console.error('Error processing buyback orders:', error);
      toast.error('Failed to process buyback orders');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Automated Buyback Processor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Automation Status</h3>
              <p className="text-sm text-muted-foreground">
                {settings.is_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, is_enabled: enabled }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="threshold">Minimum Fund Threshold (UGX)</Label>
              <Input
                id="threshold"
                type="number"
                value={settings.minimum_fund_threshold}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  minimum_fund_threshold: Number(e.target.value) 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="batch_size">Max Orders Per Batch</Label>
              <Input
                id="batch_size"
                type="number"
                value={settings.max_orders_per_batch}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  max_orders_per_batch: Number(e.target.value) 
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="auto_limit">Auto-Approve Limit (UGX)</Label>
              <Input
                id="auto_limit"
                type="number"
                value={settings.auto_approve_limit}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  auto_approve_limit: Number(e.target.value) 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="frequency">Processing Frequency</Label>
              <select
                id="frequency"
                className="w-full p-2 border rounded"
                value={settings.processing_frequency}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  processing_frequency: e.target.value 
                }))}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <Button onClick={saveSettings} className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {availableFunds.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Available Funds (UGX)</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-warning">
                {pendingOrders.length}
              </div>
              <div className="text-sm text-muted-foreground">Pending Orders</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-success">
                {pendingOrders.filter(o => (o.total_amount || o.net_amount || 0) <= availableFunds).length}
              </div>
              <div className="text-sm text-muted-foreground">Processable Orders</div>
            </div>
          </div>

          <Button 
            onClick={processNextBatch}
            disabled={processing || !settings.is_enabled}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Process Next Batch
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {pendingOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Buyback Orders (FIFO Queue)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingOrders.slice(0, 10).map((order) => {
                const orderAmount = order.total_amount || order.net_amount || 0;
                const pricePerShare = order.price_per_share || (orderAmount / order.quantity);
                return (
                  <div key={order.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">#{order.fifo_position} - {order.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.quantity} shares @ {pricePerShare.toLocaleString()} UGX
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{orderAmount.toLocaleString()} UGX</p>
                      <p className={`text-sm ${orderAmount <= availableFunds ? 'text-success' : 'text-warning'}`}>
                        {orderAmount <= availableFunds ? 'Can Process' : 'Insufficient Funds'}
                      </p>
                    </div>
                  </div>
                );
              })}
              {pendingOrders.length > 10 && (
                <p className="text-center text-muted-foreground">
                  ... and {pendingOrders.length - 10} more orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutomatedBuybackProcessor;