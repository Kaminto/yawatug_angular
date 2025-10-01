import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Settings, Save } from 'lucide-react';

interface ShareFundAllocationManagerProps {
  onUpdate?: () => void;
}

interface AllocationRule {
  id: string;
  project_funding_percent: number;
  expenses_percent: number;
  buyback_percent: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ShareFundAllocationManager: React.FC<ShareFundAllocationManagerProps> = ({ onUpdate }) => {
  const [allocationRules, setAllocationRules] = useState<AllocationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<AllocationRule> | null>(null);

  useEffect(() => {
    loadAllocationRules();
  }, []);

  const loadAllocationRules = async () => {
    try {
      const { data, error } = await supabase
        .from('allocation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllocationRules(data || []);
    } catch (error) {
      console.error('Error loading allocation rules:', error);
      toast.error('Failed to load allocation rules');
    } finally {
      setLoading(false);
    }
  };

  const saveAllocationRule = async () => {
    if (!editingRule) return;

    const total = (editingRule.project_funding_percent || 0) + 
                  (editingRule.expenses_percent || 0) + 
                  (editingRule.buyback_percent || 0);

    if (total !== 100) {
      toast.error('Allocation percentages must total 100%');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('create_or_update_allocation_rules_v2', {
        p_project_funding_percent: editingRule.project_funding_percent,
        p_expenses_percent: editingRule.expenses_percent,
        p_buyback_percent: editingRule.buyback_percent,
        p_currency: editingRule.currency || 'UGX'
      });

      if (error) throw error;

      toast.success('Allocation rules updated successfully');
      
      // Notify other settings tabs of the update
      const event = new CustomEvent('settingsUpdate', { detail: { source: 'fund-allocation' } });
      window.dispatchEvent(event);
      
      setEditingRule(null);
      loadAllocationRules();
      onUpdate?.();
    } catch (error) {
      console.error('Error saving allocation rules:', error);
      toast.error('Failed to save allocation rules');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (rule?: AllocationRule) => {
    if (rule) {
      setEditingRule({ ...rule });
    } else {
      setEditingRule({
        project_funding_percent: 40,
        expenses_percent: 30,
        buyback_percent: 30,
        currency: 'UGX'
      });
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
            <Settings className="h-5 w-5" />
            Share Fund Allocation Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {allocationRules.map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">Currency: {rule.currency}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>Project Funding: {rule.project_funding_percent}%</div>
                      <div>Expenses: {rule.expenses_percent}%</div>
                      <div>Buyback: {rule.buyback_percent}%</div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Status: {rule.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(rule)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={() => startEditing()} variant="outline" className="w-full">
            Add New Allocation Rule
          </Button>
        </CardContent>
      </Card>

      {editingRule && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRule.id ? 'Edit Allocation Rule' : 'New Allocation Rule'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={editingRule.currency || ''}
                  onChange={(e) => setEditingRule(prev => ({ ...prev, currency: e.target.value }))}
                  placeholder="e.g., UGX, USD"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="project_funding">Project Funding (%)</Label>
                <Input
                  id="project_funding"
                  type="number"
                  min="0"
                  max="100"
                  value={editingRule.project_funding_percent || ''}
                  onChange={(e) => setEditingRule(prev => ({ 
                    ...prev, 
                    project_funding_percent: Number(e.target.value) 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="expenses">Admin Expenses (%)</Label>
                <Input
                  id="expenses"
                  type="number"
                  min="0"
                  max="100"
                  value={editingRule.expenses_percent || ''}
                  onChange={(e) => setEditingRule(prev => ({ 
                    ...prev, 
                    expenses_percent: Number(e.target.value) 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="buyback">Share Buyback (%)</Label>
                <Input
                  id="buyback"
                  type="number"
                  min="0"
                  max="100"
                  value={editingRule.buyback_percent || ''}
                  onChange={(e) => setEditingRule(prev => ({ 
                    ...prev, 
                    buyback_percent: Number(e.target.value) 
                  }))}
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Total: {((editingRule.project_funding_percent || 0) + 
                      (editingRule.expenses_percent || 0) + 
                      (editingRule.buyback_percent || 0))}% (must equal 100%)
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={saveAllocationRule} 
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditingRule(null)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShareFundAllocationManager;