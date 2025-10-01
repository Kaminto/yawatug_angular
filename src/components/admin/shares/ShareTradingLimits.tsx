import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save } from 'lucide-react';

interface TradingLimits {
  id?: string;
  min_buy_amount: number;
  max_buy_amount: number;
  daily_sell_limit: number;
  weekly_sell_limit: number;
  monthly_sell_limit: number;
  transfer_fee_percentage: number;
  transfer_flat_fee: number;
}

const ShareTradingLimits: React.FC = () => {
  const [limits, setLimits] = useState<TradingLimits>({
    min_buy_amount: 1,
    max_buy_amount: 10000,
    daily_sell_limit: 1000,
    weekly_sell_limit: 5000,
    monthly_sell_limit: 20000,
    transfer_fee_percentage: 2.5,
    transfer_flat_fee: 5000
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('share_trading_limits')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setLimits(data);
      }
    } catch (error) {
      console.error('Error loading trading limits:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (limits.id) {
        const { error } = await supabase
          .from('share_trading_limits')
          .update({
            min_buy_amount: limits.min_buy_amount,
            max_buy_amount: limits.max_buy_amount,
            daily_sell_limit: limits.daily_sell_limit,
            weekly_sell_limit: limits.weekly_sell_limit,
            monthly_sell_limit: limits.monthly_sell_limit,
            transfer_fee_percentage: limits.transfer_fee_percentage,
            transfer_flat_fee: limits.transfer_flat_fee,
            updated_at: new Date().toISOString()
          })
          .eq('id', limits.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('share_trading_limits')
          .insert({
            min_buy_amount: limits.min_buy_amount,
            max_buy_amount: limits.max_buy_amount,
            daily_sell_limit: limits.daily_sell_limit,
            weekly_sell_limit: limits.weekly_sell_limit,
            monthly_sell_limit: limits.monthly_sell_limit,
            transfer_fee_percentage: limits.transfer_fee_percentage,
            transfer_flat_fee: limits.transfer_flat_fee
          });

        if (error) throw error;
      }

      toast.success('Trading limits updated successfully');
      loadLimits();
    } catch (error: any) {
      console.error('Error saving trading limits:', error);
      toast.error(error.message || 'Failed to save trading limits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Share Trading Limits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Minimum Buy Amount</Label>
              <Input
                type="number"
                value={limits.min_buy_amount}
                onChange={(e) => setLimits({...limits, min_buy_amount: Number(e.target.value)})}
                required
              />
            </div>

            <div>
              <Label>Maximum Buy Amount</Label>
              <Input
                type="number"
                value={limits.max_buy_amount}
                onChange={(e) => setLimits({...limits, max_buy_amount: Number(e.target.value)})}
                required
              />
            </div>

            <div>
              <Label>Daily Sell Limit</Label>
              <Input
                type="number"
                value={limits.daily_sell_limit}
                onChange={(e) => setLimits({...limits, daily_sell_limit: Number(e.target.value)})}
                required
              />
            </div>

            <div>
              <Label>Weekly Sell Limit</Label>
              <Input
                type="number"
                value={limits.weekly_sell_limit}
                onChange={(e) => setLimits({...limits, weekly_sell_limit: Number(e.target.value)})}
                required
              />
            </div>

            <div>
              <Label>Monthly Sell Limit</Label>
              <Input
                type="number"
                value={limits.monthly_sell_limit}
                onChange={(e) => setLimits({...limits, monthly_sell_limit: Number(e.target.value)})}
                required
              />
            </div>

            <div>
              <Label>Transfer Fee Percentage (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={limits.transfer_fee_percentage}
                onChange={(e) => setLimits({...limits, transfer_fee_percentage: Number(e.target.value)})}
                required
              />
            </div>

            <div>
              <Label>Transfer Flat Fee</Label>
              <Input
                type="number"
                value={limits.transfer_flat_fee}
                onChange={(e) => setLimits({...limits, transfer_flat_fee: Number(e.target.value)})}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Trading Limits'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ShareTradingLimits;