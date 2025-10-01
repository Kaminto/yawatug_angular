
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TradingRule {
  id?: string;
  rule_type: string;
  condition: string;
  threshold: number;
  action: string;
  is_active: boolean;
  created_at?: string;
}

const AdvancedTradingLimits: React.FC = () => {
  const [tradingRules, setTradingRules] = useState<TradingRule[]>([]);
  const [newRule, setNewRule] = useState<TradingRule>({
    rule_type: 'daily_volume',
    condition: 'exceeds',
    threshold: 1000,
    action: 'pause_trading',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTradingRules();
  }, []);

  const loadTradingRules = async () => {
    try {
      // For now, we'll simulate trading rules since the table might not exist
      // In a real implementation, you'd load from a trading_rules table
      const mockRules: TradingRule[] = [
        {
          id: '1',
          rule_type: 'daily_volume',
          condition: 'exceeds',
          threshold: 10000,
          action: 'notify_admin',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          rule_type: 'price_volatility',
          condition: 'exceeds',
          threshold: 15,
          action: 'pause_trading',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
      setTradingRules(mockRules);
    } catch (error) {
      console.error('Error loading trading rules:', error);
    }
  };

  const handleSaveRule = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you'd save to database
      const ruleWithId = {
        ...newRule,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      };
      
      setTradingRules(prev => [ruleWithId, ...prev]);
      
      setNewRule({
        rule_type: 'daily_volume',
        condition: 'exceeds',
        threshold: 1000,
        action: 'pause_trading',
        is_active: true
      });
      
      toast.success('Trading rule created successfully');
    } catch (error) {
      console.error('Error saving trading rule:', error);
      toast.error('Failed to create trading rule');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      setTradingRules(prev => 
        prev.map(rule => 
          rule.id === ruleId 
            ? { ...rule, is_active: !rule.is_active }
            : rule
        )
      );
      toast.success('Trading rule updated');
    } catch (error) {
      console.error('Error updating trading rule:', error);
      toast.error('Failed to update trading rule');
    }
  };

  const getRuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily_volume: 'Daily Volume',
      price_volatility: 'Price Volatility',
      buy_sell_ratio: 'Buy/Sell Ratio',
      consecutive_trades: 'Consecutive Trades'
    };
    return labels[type] || type;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      pause_trading: 'Pause Trading',
      notify_admin: 'Notify Admin',
      adjust_limits: 'Adjust Limits',
      require_approval: 'Require Approval'
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Create Trading Rule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Rule Type</Label>
              <Select
                value={newRule.rule_type}
                onValueChange={(value) => setNewRule(prev => ({ ...prev, rule_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily_volume">Daily Volume</SelectItem>
                  <SelectItem value="price_volatility">Price Volatility (%)</SelectItem>
                  <SelectItem value="buy_sell_ratio">Buy/Sell Ratio</SelectItem>
                  <SelectItem value="consecutive_trades">Consecutive Trades</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Condition</Label>
              <Select
                value={newRule.condition}
                onValueChange={(value) => setNewRule(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exceeds">Exceeds</SelectItem>
                  <SelectItem value="below">Below</SelectItem>
                  <SelectItem value="equals">Equals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Threshold</Label>
              <Input
                type="number"
                value={newRule.threshold}
                onChange={(e) => setNewRule(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                placeholder="Enter threshold value"
              />
            </div>

            <div>
              <Label>Action</Label>
              <Select
                value={newRule.action}
                onValueChange={(value) => setNewRule(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pause_trading">Pause Trading</SelectItem>
                  <SelectItem value="notify_admin">Notify Admin</SelectItem>
                  <SelectItem value="adjust_limits">Adjust Limits</SelectItem>
                  <SelectItem value="require_approval">Require Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={newRule.is_active}
              onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, is_active: checked }))}
            />
            <Label>Active</Label>
          </div>

          <Button onClick={handleSaveRule} disabled={loading} className="w-full">
            {loading ? 'Creating Rule...' : 'Create Trading Rule'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Trading Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tradingRules.length === 0 ? (
              <p className="text-center text-muted-foreground">No trading rules configured</p>
            ) : (
              tradingRules.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{getRuleTypeLabel(rule.rule_type)}</h4>
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        When {rule.rule_type} {rule.condition} {rule.threshold}, {getActionLabel(rule.action)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => rule.id && handleToggleRule(rule.id)}
                      />
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedTradingLimits;
