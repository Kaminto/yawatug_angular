
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, Settings, Calculator, History } from 'lucide-react';

const SharePricingManager: React.FC = () => {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [autoPricingSettings, setAutoPricingSettings] = useState<any>(null);
  const [manualPriceForm, setManualPriceForm] = useState({
    new_price: '',
    mining_profit: '',
    dividend_paid: '',
    market_activity_adjustment: '',
    admin_notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrentPrice();
    loadPriceHistory();
    loadAutoPricingSettings();
  }, []);

  const loadCurrentPrice = async () => {
    try {
      const { data, error } = await supabase
        .from('shares')
        .select('price_per_share')
        .single();

      if (error) throw error;
      setCurrentPrice(data.price_per_share || 0);
    } catch (error) {
      console.error('Error loading current price:', error);
    }
  };

  const loadPriceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('enhanced_share_price_calculations')
        .select('*')
        .order('calculation_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPriceHistory(data || []);
    } catch (error) {
      console.error('Error loading price history:', error);
    }
  };

  const loadAutoPricingSettings = async () => {
    try {
    const { data: autoPricingData, error: autoPricingError } = await supabase
      .from('admin_dynamic_pricing_settings')
        .select('*')
        .single();

    if (autoPricingError && autoPricingError.code !== 'PGRST116') throw autoPricingError;
    setAutoPricingSettings(autoPricingData);
    } catch (error) {
      console.error('Error loading auto pricing settings:', error);
    }
  };

  const handleManualPriceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Record price calculation
      const { error: calculationError } = await supabase
        .from('enhanced_share_price_calculations')
        .insert({
          share_id: (await supabase.from('shares').select('id').single()).data?.id,
          previous_price: currentPrice,
          calculated_price: parseFloat(manualPriceForm.new_price),
          calculation_method: 'manual',
          admin_notes: manualPriceForm.admin_notes,
          mining_profit_factor: parseFloat(manualPriceForm.mining_profit) || 0,
          dividend_impact_factor: parseFloat(manualPriceForm.dividend_paid) || 0,
          market_activity_factor: parseFloat(manualPriceForm.market_activity_adjustment) || 0
        });

      if (calculationError) throw calculationError;

      // Update share price
      const { error: updateError } = await supabase
        .from('shares')
        .update({ 
          price_per_share: parseFloat(manualPriceForm.new_price),
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.from('shares').select('id').single()).data?.id);

      if (updateError) throw updateError;

      toast.success('Share price updated successfully');
      setManualPriceForm({
        new_price: '',
        mining_profit: '',
        dividend_paid: '',
        market_activity_adjustment: '',
        admin_notes: ''
      });
      loadCurrentPrice();
      loadPriceHistory();
    } catch (error: any) {
      console.error('Error updating price:', error);
      toast.error(`Failed to update price: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoPricingUpdate = async (settings: any) => {
    try {
    const { error: updateError } = await supabase
      .from('admin_dynamic_pricing_settings')
        .upsert(settings);

    if (updateError) throw updateError;
      toast.success('Auto-pricing settings updated');
      loadAutoPricingSettings();
    } catch (error: any) {
      console.error('Error updating auto-pricing:', error);
      toast.error(`Failed to update settings: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Price Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Current Share Price
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">UGX {currentPrice.toLocaleString()}</p>
            <p className="text-muted-foreground">per share</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Price Update */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Manual Price Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualPriceUpdate} className="space-y-4">
              <div>
                <Label>New Price (UGX)</Label>
                <Input
                  type="number"
                  placeholder="Enter new price"
                  value={manualPriceForm.new_price}
                  onChange={(e) => setManualPriceForm(prev => ({ ...prev, new_price: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Mining Profit Impact (UGX)</Label>
                <Input
                  type="number"
                  placeholder="Enter mining profit impact"
                  value={manualPriceForm.mining_profit}
                  onChange={(e) => setManualPriceForm(prev => ({ ...prev, mining_profit: e.target.value }))}
                />
              </div>

              <div>
                <Label>Dividend Paid (UGX)</Label>
                <Input
                  type="number"
                  placeholder="Enter dividend paid"
                  value={manualPriceForm.dividend_paid}
                  onChange={(e) => setManualPriceForm(prev => ({ ...prev, dividend_paid: e.target.value }))}
                />
              </div>

              <div>
                <Label>Market Activity Adjustment (UGX)</Label>
                <Input
                  type="number"
                  placeholder="Enter market adjustment"
                  value={manualPriceForm.market_activity_adjustment}
                  onChange={(e) => setManualPriceForm(prev => ({ ...prev, market_activity_adjustment: e.target.value }))}
                />
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Enter notes for this price change"
                  value={manualPriceForm.admin_notes}
                  onChange={(e) => setManualPriceForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Updating...' : 'Update Price'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Auto-Pricing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Auto-Pricing Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Auto-Pricing</Label>
                <Switch
                  checked={autoPricingSettings?.is_enabled || false}
                  onCheckedChange={(checked) => 
                    handleAutoPricingUpdate({ ...autoPricingSettings, is_enabled: checked })
                  }
                />
              </div>

              <div>
                <Label>Update Frequency</Label>
                <Select 
                  value={autoPricingSettings?.update_frequency || 'monthly'}
                  onValueChange={(value) => 
                    handleAutoPricingUpdate({ ...autoPricingSettings, update_frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mining Profit Weight</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={autoPricingSettings?.mining_profit_weight || 1.0}
                  onChange={(e) => 
                    handleAutoPricingUpdate({ 
                      ...autoPricingSettings, 
                      mining_profit_weight: parseFloat(e.target.value) 
                    })
                  }
                />
              </div>

              <div>
                <Label>Maximum Price Increase (%)</Label>
                <Input
                  type="number"
                  value={autoPricingSettings?.max_price_increase_percent || 10}
                  onChange={(e) => 
                    handleAutoPricingUpdate({ 
                      ...autoPricingSettings, 
                      max_price_increase_percent: parseFloat(e.target.value) 
                    })
                  }
                />
              </div>

              <div>
                <Label>Minimum Price Floor (UGX)</Label>
                <Input
                  type="number"
                  value={autoPricingSettings?.minimum_price_floor || 20000}
                  onChange={(e) => 
                    handleAutoPricingUpdate({ 
                      ...autoPricingSettings, 
                      minimum_price_floor: parseFloat(e.target.value) 
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Price History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Previous Price</TableHead>
                <TableHead>New Price</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceHistory.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {new Date(record.calculation_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>UGX {record.previous_price.toLocaleString()}</TableCell>
                  <TableCell>UGX {record.calculated_price?.toLocaleString() || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={record.calculation_method === 'manual' ? 'default' : 'secondary'}>
                      {record.calculation_method}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {record.admin_notes || 'No notes'}
                  </TableCell>
                </TableRow>
              ))}
              {priceHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No price history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SharePricingManager;
