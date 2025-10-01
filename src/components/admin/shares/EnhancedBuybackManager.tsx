
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Settings, Eye } from 'lucide-react';
import { ShareData } from '@/types/custom';

interface EnhancedBuybackManagerProps {
  shareData: ShareData;
  onUpdate: () => Promise<void>;
}

const EnhancedBuybackManager: React.FC<EnhancedBuybackManagerProps> = ({ shareData, onUpdate }) => {
  const [buybackOrders, setBuybackOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    mode: 'manual',
    buyback_fund: 0,
    daily_limit: 0,
    weekly_limit: 0,
    monthly_limit: 0,
    min_payment_percentage: 25
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBuybackOrders();
    loadBuybackSettings();
  }, []);

  const loadBuybackOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('share_buyback_orders')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBuybackOrders(data || []);
    } catch (error) {
      console.error('Error loading buyback orders:', error);
    }
  };

  const loadBuybackSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('share_buyback_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSettings({
          mode: data.mode || 'manual',
          buyback_fund: data.buyback_fund || 0,
          daily_limit: data.daily_limit || 0,
          weekly_limit: data.weekly_limit || 0,
          monthly_limit: data.monthly_limit || 0,
          min_payment_percentage: data.min_payment_percentage || 25
        });
      }
    } catch (error) {
      console.error('Error loading buyback settings:', error);
    }
  };

  const handleSettingsUpdate = async () => {
    setLoading(true);
    try {
      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('share_buyback_settings')
        .select('id')
        .single();

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('share_buyback_settings')
          .update(settings)
          .eq('id', existingSettings.id);
        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('share_buyback_settings')
          .insert(settings);
        if (error) throw error;
      }

      // Also update the shares table
      const { error: shareError } = await supabase
        .from('shares')
        .update({
          buy_back_mode: settings.mode,
          buy_back_fund: settings.buyback_fund,
          updated_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      if (shareError) throw shareError;

      toast.success('Buyback settings updated successfully');
      await onUpdate();
    } catch (error: any) {
      console.error('Error updating buyback settings:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAction = async (orderId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase
        .from('share_buyback_orders')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success(`Order ${action}d successfully`);
      loadBuybackOrders();
    } catch (error: any) {
      console.error(`Error ${action}ing order:`, error);
      toast.error(error.message || `Failed to ${action} order`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      pending: "outline",
      approved: "default",
      rejected: "destructive",
      completed: "secondary"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Buyback Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Buyback Mode</Label>
              <Select 
                onValueChange={(value) => setSettings(prev => ({ ...prev, mode: value }))}
                value={settings.mode}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buyback Fund ({shareData.currency})</Label>
              <Input
                type="number"
                value={settings.buyback_fund}
                onChange={(e) => setSettings(prev => ({ ...prev, buyback_fund: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Daily Limit (shares)</Label>
              <Input
                type="number"
                value={settings.daily_limit}
                onChange={(e) => setSettings(prev => ({ ...prev, daily_limit: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Weekly Limit (shares)</Label>
              <Input
                type="number"
                value={settings.weekly_limit}
                onChange={(e) => setSettings(prev => ({ ...prev, weekly_limit: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Monthly Limit (shares)</Label>
              <Input
                type="number"
                value={settings.monthly_limit}
                onChange={(e) => setSettings(prev => ({ ...prev, monthly_limit: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div>
            <Label>Minimum Payment Percentage (%)</Label>
            <Input
              type="number"
              min="1"
              max="100"
              value={settings.min_payment_percentage}
              onChange={(e) => setSettings(prev => ({ ...prev, min_payment_percentage: parseInt(e.target.value) || 25 }))}
            />
          </div>

          <Button onClick={handleSettingsUpdate} disabled={loading}>
            {loading ? 'Updating...' : 'Update Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Buyback Orders Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" />
            Recent Buyback Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Requested Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buybackOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    {order.profiles?.full_name || 'Unknown User'}
                  </TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>{shareData.currency} {order.requested_price.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleOrderAction(order.id, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleOrderAction(order.id, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {buybackOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No buyback orders found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedBuybackManager;
