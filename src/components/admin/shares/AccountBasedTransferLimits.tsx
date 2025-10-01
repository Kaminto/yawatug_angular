import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRightLeft, Edit } from 'lucide-react';

const accountTypes = [
  { value: 'individual', label: 'Individual' },
  { value: 'business', label: 'Business' },
  { value: 'organisation', label: 'Organisation' }
];

const AccountBasedTransferLimits: React.FC = () => {
  const [limits, setLimits] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    account_type: '',
    daily_limit_shares: '',
    weekly_limit_shares: '',
    monthly_limit_shares: '',
    minimum_transfer_value: '',
    is_active: true
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('share_transfer_limits_by_account')
        .select('*')
        .order('account_type', { ascending: true });

      if (error) throw error;
      setLimits(data || []);
    } catch (error) {
      console.error('Error loading limits:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    
    setLoading(true);

    try {
      const limitData = {
        account_type: formData.account_type,
        daily_limit_shares: parseFloat(formData.daily_limit_shares),
        weekly_limit_shares: parseFloat(formData.weekly_limit_shares),
        monthly_limit_shares: parseFloat(formData.monthly_limit_shares),
        minimum_transfer_value: parseFloat(formData.minimum_transfer_value),
        is_active: formData.is_active
      };

      const { error } = await supabase
        .from('share_transfer_limits_by_account')
        .update(limitData)
        .eq('id', editingId);

      if (error) throw error;
      toast.success('Transfer limit updated successfully');
      
      setEditingId(null);
      setShowEditForm(false);
      setFormData({
        account_type: '',
        daily_limit_shares: '',
        weekly_limit_shares: '',
        monthly_limit_shares: '',
        minimum_transfer_value: '',
        is_active: true
      });
      loadLimits();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save transfer limit');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (limit: any) => {
    setFormData({
      account_type: limit.account_type,
      daily_limit_shares: limit.daily_limit_shares.toString(),
      weekly_limit_shares: limit.weekly_limit_shares.toString(),
      monthly_limit_shares: limit.monthly_limit_shares.toString(),
      minimum_transfer_value: limit.minimum_transfer_value.toString(),
      is_active: limit.is_active
    });
    setEditingId(limit.id);
    setShowEditForm(true);
  };

  const handleToggleStatus = async (limitId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('share_transfer_limits_by_account')
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
      {showEditForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowRightLeft className="mr-2 h-5 w-5" />
              Edit Account-Based Transfer Limits
            </CardTitle>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Account Type</Label>
              <Select 
                onValueChange={(value) => setFormData(prev => ({ ...prev, account_type: value }))}
                value={formData.account_type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Daily Limit (Shares)</Label>
                <Input
                  type="number"
                  value={formData.daily_limit_shares}
                  onChange={(e) => setFormData(prev => ({ ...prev, daily_limit_shares: e.target.value }))}
                  placeholder="Daily share limit"
                  required
                />
              </div>
              <div>
                <Label>Weekly Limit (Shares)</Label>
                <Input
                  type="number"
                  value={formData.weekly_limit_shares}
                  onChange={(e) => setFormData(prev => ({ ...prev, weekly_limit_shares: e.target.value }))}
                  placeholder="Weekly share limit"
                  required
                />
              </div>
              <div>
                <Label>Monthly Limit (Shares)</Label>
                <Input
                  type="number"
                  value={formData.monthly_limit_shares}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_limit_shares: e.target.value }))}
                  placeholder="Monthly share limit"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Minimum Transfer Value (UGX)</Label>
              <Input
                type="number"
                value={formData.minimum_transfer_value}
                onChange={(e) => setFormData(prev => ({ ...prev, minimum_transfer_value: e.target.value }))}
                placeholder="Minimum value required"
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
                {loading ? 'Saving...' : 'Update Limit'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setEditingId(null);
                  setShowEditForm(false);
                  setFormData({
                    account_type: '',
                    daily_limit_shares: '',
                    weekly_limit_shares: '',
                    monthly_limit_shares: '',
                    minimum_transfer_value: '',
                    is_active: true
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account-Based Transfer Limits</CardTitle>
        </CardHeader>
        <CardContent>
          {limits.length === 0 ? (
            <p className="text-muted-foreground">No transfer limits set</p>
          ) : (
            <div className="space-y-4">
              {limits.map((limit) => (
                <div key={limit.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="font-semibold capitalize">
                        {limit.account_type} Account
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Daily: {limit.daily_limit_shares.toLocaleString()} shares</div>
                        <div>Weekly: {limit.weekly_limit_shares.toLocaleString()} shares</div>
                        <div>Monthly: {limit.monthly_limit_shares.toLocaleString()} shares</div>
                        <div>Min Value: UGX {limit.minimum_transfer_value.toLocaleString()}</div>
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

export default AccountBasedTransferLimits;