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
import { Users, ShoppingCart, TrendingUp, Shield, Clock } from 'lucide-react';
import { P2PShareTrade } from '@/types/shares';

interface P2PShareMarketplaceProps {
  shareData: any;
  onUpdate: () => Promise<void>;
}

const P2PShareMarketplace: React.FC<P2PShareMarketplaceProps> = ({ shareData, onUpdate }) => {
  const [trades, setTrades] = useState<P2PShareTrade[]>([]);
  const [settings, setSettings] = useState({
    enabled: true,
    min_trade_amount: 1,
    max_trade_amount: 1000,
    escrow_percentage: 5,
    trade_fee_percentage: 2,
    auto_match_orders: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrades();
    loadSettings();
  }, []);

  const loadTrades = async () => {
    try {
      // Since p2p_share_trades table may not exist in types yet, we'll simulate with transactions
      const { data, error } = await supabase
        .from('share_transactions')
        .select(`
          *,
          profiles:user_id(full_name, email)
        `)
        .eq('transaction_type', 'p2p_trade')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error && error.code !== 'PGRST116') {
        // Fallback to empty array if table doesn't exist
        setTrades([]);
        return;
      }
      
      // Transform to P2P format
      const transformedTrades = data?.map(tx => ({
        id: tx.id,
        seller_id: tx.user_id,
        buyer_id: null,
        share_id: tx.share_id || '',
        quantity: tx.quantity || 0,
        price_per_share: tx.price_per_share || 0,
        total_amount: tx.total_amount || 0,
        escrow_amount: 0,
        status: tx.status === 'completed' ? 'completed' : 'open',
        trade_type: 'direct',
        created_at: tx.created_at,
        updated_at: tx.updated_at || tx.created_at,
        seller: tx.profiles,
        buyer: null
      })) || [];
      
      setTrades(transformedTrades as any);
    } catch (error) {
      console.error('Error loading P2P trades:', error);
      setTrades([]);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_payment_settings')
        .select('*')
        .eq('setting_name', 'p2p_marketplace_config')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSettings(JSON.parse(data.setting_value));
      }
    } catch (error) {
      console.error('Error loading P2P settings:', error);
    }
  };

  const handleSettingsUpdate = async () => {
    setLoading(true);
    try {
      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('admin_payment_settings')
        .select('id')
        .eq('setting_name', 'p2p_marketplace_config')
        .single();

      const settingsData = {
        setting_name: 'p2p_marketplace_config',
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

      toast.success('P2P marketplace settings updated successfully');
    } catch (error: any) {
      console.error('Error updating P2P settings:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTradeAction = async (tradeId: string, action: 'approve' | 'reject' | 'cancel') => {
    try {
      const status = action === 'approve' ? 'completed' : 'cancelled';

      // Update via share_transactions table for now
      const { error } = await supabase
        .from('share_transactions')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', tradeId);

      if (error) throw error;
      toast.success(`Trade ${action}d successfully`);
      loadTrades();
    } catch (error: any) {
      console.error(`Error ${action}ing trade:`, error);
      toast.error(error.message || `Failed to ${action} trade`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      open: "outline",
      pending: "secondary",
      completed: "default",
      cancelled: "destructive",
      expired: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getTradeTypeBadge = (type: string) => {
    const colors = {
      direct: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      auction: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      bid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    };
    return <Badge className={colors[type] || colors.direct}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="trades" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trades" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Active Trades
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                P2P Share Trading
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{trade.seller?.full_name || 'Unknown'}</TableCell>
                      <TableCell>{trade.buyer?.full_name || 'Open'}</TableCell>
                      <TableCell>{trade.quantity}</TableCell>
                      <TableCell>{shareData.currency} {trade.price_per_share.toLocaleString()}</TableCell>
                      <TableCell>{shareData.currency} {trade.total_amount.toLocaleString()}</TableCell>
                      <TableCell>{getTradeTypeBadge(trade.trade_type)}</TableCell>
                      <TableCell>{getStatusBadge(trade.status)}</TableCell>
                      <TableCell>{new Date(trade.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {trade.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleTradeAction(trade.id, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleTradeAction(trade.id, 'reject')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {trade.status === 'open' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleTradeAction(trade.id, 'cancel')}
                          >
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {trades.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">No P2P trades found</TableCell>
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
              <CardTitle>P2P Marketplace Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_trade">Minimum Trade Amount (shares)</Label>
                  <Input
                    id="min_trade"
                    type="number"
                    value={settings.min_trade_amount}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      min_trade_amount: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="max_trade">Maximum Trade Amount (shares)</Label>
                  <Input
                    id="max_trade"
                    type="number"
                    value={settings.max_trade_amount}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      max_trade_amount: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="escrow_fee">Escrow Percentage (%)</Label>
                  <Input
                    id="escrow_fee"
                    type="number"
                    step="0.1"
                    value={settings.escrow_percentage}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      escrow_percentage: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="trade_fee">Trading Fee (%)</Label>
                  <Input
                    id="trade_fee"
                    type="number"
                    step="0.1"
                    value={settings.trade_fee_percentage}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      trade_fee_percentage: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>

              <Button onClick={handleSettingsUpdate} disabled={loading}>
                {loading ? 'Updating...' : 'Update Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trades.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {trades.filter(t => t.status === 'open').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Completed Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {trades.filter(t => 
                    t.status === 'completed' && 
                    new Date(t.created_at).toDateString() === new Date().toDateString()
                  ).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default P2PShareMarketplace;