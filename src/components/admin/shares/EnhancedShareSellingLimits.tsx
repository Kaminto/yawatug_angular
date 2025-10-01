
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingDown, Edit, Plus } from 'lucide-react';

const periodTypes = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
];

const limitTypes = [
  { value: 'quantity', label: 'Quantity Limit' },
  { value: 'percentage', label: 'Percentage Limit' }
];

const EnhancedShareSellingLimits: React.FC = () => {
  const [limits, setLimits] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    limit_type: '',
    period_type: '',
    limit_value: '',
    is_active: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('share_selling_limits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLimits(data || []);
    } catch (error) {
      console.error('Error loading limits:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const limitData = {
        limit_type: formData.limit_type,
        period_type: formData.period_type,
        limit_value: parseFloat(formData.limit_value),
        is_active: formData.is_active
      };

      if (
        !limitTypes.some(l => l.value === limitData.limit_type) ||
        !periodTypes.some(p => p.value === limitData.period_type)
      ) {
        toast.error('Please select valid limit and period types.');
        setLoading(false);
        return;
      }

      if (editingId) {
        // Update existing limit
        const { error } = await supabase
          .from('share_selling_limits')
          .update(limitData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Selling limit updated successfully');
        setEditingId(null);
      } else {
        // Create new limit
        const { error } = await supabase
          .from('share_selling_limits')
          .insert(limitData);

        if (error) throw error;
        toast.success('New selling limit created');
      }

      setFormData({
        limit_type: '',
        period_type: '',
        limit_value: '',
        is_active: true
      });
      loadLimits();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save selling limit');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (limit: any) => {
    setFormData({
      limit_type: limit.limit_type,
      period_type: limit.period_type,
      limit_value: limit.limit_value.toString(),
      is_active: limit.is_active
    });
    setEditingId(limit.id);
  };

  const handleToggleStatus = async (limitId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('share_selling_limits')
        .update({ is_active: !currentStatus })
        .eq('id', limitId);

      if (error) throw error;
      toast.success(`Limit ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadLimits();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update limit status');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingDown className="mr-2 h-5 w-5" />
            {editingId ? 'Edit' : 'Create'} Selling Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Limit Type</Label>
                <Select 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, limit_type: value }))}
                  value={formData.limit_type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select limit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {limitTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Period Type</Label>
                <Select 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, period_type: value }))}
                  value={formData.period_type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodTypes.map(period => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Limit Value</Label>
              <Input
                type="number"
                value={formData.limit_value}
                onChange={(e) => setFormData(prev => ({ ...prev, limit_value: e.target.value }))}
                placeholder="Enter limit value"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch 
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (editingId ? 'Update Limit' : 'Create Limit')}
              </Button>
              {editingId && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      limit_type: '',
                      period_type: '',
                      limit_value: '',
                      is_active: true
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Selling Limits</CardTitle>
        </CardHeader>
        <CardContent>
          {limits.length === 0 ? (
            <p className="text-muted-foreground">No selling limits set</p>
          ) : (
            <div className="space-y-4">
              {limits.map((limit) => (
                <div key={limit.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="font-semibold capitalize">
                        {limit.limit_type} - {limit.period_type}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Limit: {limit.limit_value.toLocaleString()} 
                        {limit.limit_type === 'quantity' ? ' shares' : limit.limit_type === 'percentage' ? '%' : ''}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          limit.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {limit.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(limit)}
                        className="flex items-center"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleStatus(limit.id, limit.is_active)}
                      >
                        {limit.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedShareSellingLimits;
