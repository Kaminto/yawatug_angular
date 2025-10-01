import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TrendingDown, Save, Plus, Edit, Trash2 } from 'lucide-react';

interface SellingLimit {
  id?: string;
  limit_type: string;
  limit_value: number;
  period_type: string;
  is_active: boolean;
}

const ShareSellingLimits: React.FC = () => {
  const [limits, setLimits] = useState<SellingLimit[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingLimit, setEditingLimit] = useState<SellingLimit | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const limitTypes = ['max_sell_amount', 'daily_sell_limit', 'weekly_sell_limit', 'monthly_sell_limit'];
  const periodTypes = ['daily', 'weekly', 'monthly', 'per_transaction'];

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('share_selling_limits')
        .select('*')
        .order('limit_type');

      if (error) throw error;
      setLimits(data || []);
    } catch (error) {
      console.error('Error loading selling limits:', error);
      toast.error('Failed to load selling limits');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLimit) return;

    try {
      setLoading(true);
      
      if (editingLimit.id) {
        const { error } = await supabase
          .from('share_selling_limits')
          .update({
            limit_value: editingLimit.limit_value,
            period_type: editingLimit.period_type,
            is_active: editingLimit.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLimit.id);

        if (error) throw error;
        toast.success('Selling limit updated successfully');
      } else {
        const { error } = await supabase
          .from('share_selling_limits')
          .insert({
            limit_type: editingLimit.limit_type,
            limit_value: editingLimit.limit_value,
            period_type: editingLimit.period_type,
            is_active: editingLimit.is_active
          });

        if (error) throw error;
        toast.success('Selling limit created successfully');
      }

      setIsEditing(false);
      setEditingLimit(null);
      loadLimits();
    } catch (error: any) {
      console.error('Error saving selling limit:', error);
      toast.error(error.message || 'Failed to save selling limit');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (limit: SellingLimit) => {
    setEditingLimit(limit);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('share_selling_limits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Selling limit deleted successfully');
      loadLimits();
    } catch (error: any) {
      console.error('Error deleting selling limit:', error);
      toast.error(error.message || 'Failed to delete selling limit');
    }
  };

  const startEditing = () => {
    setEditingLimit({
      limit_type: 'max_sell_amount',
      limit_value: 0,
      period_type: 'per_transaction',
      is_active: true
    });
    setIsEditing(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Share Selling Limits
          </div>
          <Button onClick={startEditing} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Selling Limit
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Existing Limits */}
        <div className="space-y-4 mb-6">
          {limits.map((limit) => (
            <div key={limit.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{limit.limit_type.replace('_', ' ').toUpperCase()}</h3>
                  <p className="text-sm text-muted-foreground">
                    {limit.limit_value.toLocaleString()} per {limit.period_type}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={limit.is_active} disabled />
                  <Button variant="outline" size="sm" onClick={() => handleEdit(limit)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => limit.id && handleDelete(limit.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Form */}
        {isEditing && editingLimit && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted">
            <h3 className="font-semibold">
              {editingLimit.id ? 'Edit Selling Limit' : 'Add New Selling Limit'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Limit Type</Label>
                <Select
                  value={editingLimit.limit_type}
                  onValueChange={(value) => setEditingLimit({...editingLimit, limit_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {limitTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Period Type</Label>
                <Select
                  value={editingLimit.period_type}
                  onValueChange={(value) => setEditingLimit({...editingLimit, period_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Limit Value</Label>
                <Input
                  type="number"
                  value={editingLimit.limit_value}
                  onChange={(e) => setEditingLimit({...editingLimit, limit_value: Number(e.target.value)})}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingLimit.is_active}
                  onCheckedChange={(checked) => setEditingLimit({...editingLimit, is_active: checked})}
                />
                <Label>Active</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default ShareSellingLimits;
