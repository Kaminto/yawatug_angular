import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Users, DollarSign, Calendar, Edit, Plus } from 'lucide-react';
import { ShareSellingRules } from '@/types/shares';

const ShareSellingRulesManager: React.FC = () => {
  const [rules, setRules] = useState<ShareSellingRules[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<Partial<ShareSellingRules> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSellingRules();
  }, []);

  const loadSellingRules = async () => {
    try {
      const { data, error } = await supabase
        .from('share_selling_rules')
        .select('*')
        .order('account_type');

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading selling rules:', error);
      toast.error('Failed to load share selling rules');
    } finally {
      setLoading(false);
    }
  };

  const saveRule = async () => {
    if (!editingRule) return;

    if (!editingRule.account_type) {
      toast.error('Account type is required');
      return;
    }

    setSaving(true);
    try {
      if (editingRule.id) {
        // Update existing rule
        const { error } = await supabase
          .from('share_selling_rules')
          .update(editingRule)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast.success('Selling rule updated successfully');
      } else {
        // Create new rule
        const { error } = await supabase
          .from('share_selling_rules')
          .insert(editingRule as any);

        if (error) throw error;
        toast.success('Selling rule created successfully');
      }

      setEditingRule(null);
      loadSellingRules();
    } catch (error) {
      console.error('Error saving selling rule:', error);
      toast.error('Failed to save selling rule');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (rule?: ShareSellingRules) => {
    if (rule) {
      setEditingRule({ ...rule });
    } else {
      setEditingRule({
        account_type: '',
        daily_sell_limit: 100000,
        weekly_sell_limit: 500000,
        monthly_sell_limit: 2000000,
        min_sell_amount: 1,
        max_sell_amount: 0,
        installment_allowed: true,
        min_installment_period_days: 30,
        max_installment_period_days: 365,
        min_down_payment_percent: 20,
        is_active: true
      });
    }
  };

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('share_selling_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;
      
      toast.success(`Rule ${isActive ? 'activated' : 'deactivated'}`);
      loadSellingRules();
    } catch (error) {
      console.error('Error toggling rule status:', error);
      toast.error('Failed to update rule status');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rules Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Share Selling Rules
            </CardTitle>
            <Button onClick={() => startEditing()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Type</TableHead>
                <TableHead>Daily Limit</TableHead>
                <TableHead>Weekly Limit</TableHead>
                <TableHead>Monthly Limit</TableHead>
                <TableHead>Installments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="capitalize font-medium">
                    {rule.account_type}
                  </TableCell>
                  <TableCell>UGX {rule.daily_sell_limit.toLocaleString()}</TableCell>
                  <TableCell>UGX {rule.weekly_sell_limit.toLocaleString()}</TableCell>
                  <TableCell>UGX {rule.monthly_sell_limit.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={rule.installment_allowed ? "default" : "secondary"}>
                      {rule.installment_allowed ? 'Allowed' : 'Not Allowed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleRuleStatus(rule.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No selling rules configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Rule Form */}
      {editingRule && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRule.id ? 'Edit Selling Rule' : 'Create New Selling Rule'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Account Type</Label>
                <Select
                  value={editingRule.account_type}
                  onValueChange={(value) => setEditingRule(prev => ({ ...prev, account_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="organisation">Organisation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingRule.is_active ?? true}
                  onCheckedChange={(checked) => setEditingRule(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active Rule</Label>
              </div>
            </div>

            {/* Selling Limits */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Selling Limits (UGX)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Daily Limit</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingRule.daily_sell_limit || ''}
                    onChange={(e) => setEditingRule(prev => ({ 
                      ...prev, 
                      daily_sell_limit: Number(e.target.value) 
                    }))}
                  />
                </div>
                <div>
                  <Label>Weekly Limit</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingRule.weekly_sell_limit || ''}
                    onChange={(e) => setEditingRule(prev => ({ 
                      ...prev, 
                      weekly_sell_limit: Number(e.target.value) 
                    }))}
                  />
                </div>
                <div>
                  <Label>Monthly Limit</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingRule.monthly_sell_limit || ''}
                    onChange={(e) => setEditingRule(prev => ({ 
                      ...prev, 
                      monthly_sell_limit: Number(e.target.value) 
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Sell Amount</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingRule.min_sell_amount || ''}
                    onChange={(e) => setEditingRule(prev => ({ 
                      ...prev, 
                      min_sell_amount: Number(e.target.value) 
                    }))}
                  />
                </div>
                <div>
                  <Label>Maximum Sell Amount (0 = unlimited)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingRule.max_sell_amount || ''}
                    onChange={(e) => setEditingRule(prev => ({ 
                      ...prev, 
                      max_sell_amount: Number(e.target.value) 
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Installment Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingRule.installment_allowed ?? true}
                  onCheckedChange={(checked) => setEditingRule(prev => ({ 
                    ...prev, 
                    installment_allowed: checked 
                  }))}
                />
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Allow Installment Payments
                </Label>
              </div>

              {editingRule.installment_allowed && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
                  <div>
                    <Label>Min Period (days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editingRule.min_installment_period_days || ''}
                      onChange={(e) => setEditingRule(prev => ({ 
                        ...prev, 
                        min_installment_period_days: Number(e.target.value) 
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Max Period (days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editingRule.max_installment_period_days || ''}
                      onChange={(e) => setEditingRule(prev => ({ 
                        ...prev, 
                        max_installment_period_days: Number(e.target.value) 
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Min Down Payment (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editingRule.min_down_payment_percent || ''}
                      onChange={(e) => setEditingRule(prev => ({ 
                        ...prev, 
                        min_down_payment_percent: Number(e.target.value) 
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={saveRule} disabled={saving}>
                {saving ? 'Saving...' : 'Save Rule'}
              </Button>
              <Button variant="outline" onClick={() => setEditingRule(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShareSellingRulesManager;