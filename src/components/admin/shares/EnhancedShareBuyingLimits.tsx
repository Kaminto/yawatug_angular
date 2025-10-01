
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Edit, Plus } from 'lucide-react';

const EnhancedShareBuyingLimits: React.FC = () => {
  const [limits, setLimits] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    account_type: '',
    min_buy_amount: '',
    max_buy_amount: '',
    required_down_payment_percentage: '100',
    credit_period_days: '0'
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
        .from('share_buying_limits')
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
    if (!editingId) return;
    
    setLoading(true);

    try {
      const limitData = {
        account_type: formData.account_type,
        min_buy_amount: parseInt(formData.min_buy_amount),
        max_buy_amount: parseInt(formData.max_buy_amount),
        required_down_payment_percentage: parseInt(formData.required_down_payment_percentage),
        credit_period_days: parseInt(formData.credit_period_days)
      };

      const { error } = await supabase
        .from('share_buying_limits')
        .update(limitData)
        .eq('id', editingId);

      if (error) throw error;
      toast.success('Buying limit updated successfully');
      
      setEditingId(null);
      setShowEditForm(false);
      setFormData({
        account_type: '',
        min_buy_amount: '',
        max_buy_amount: '',
        required_down_payment_percentage: '100',
        credit_period_days: '0'
      });
      loadLimits();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save buying limit');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (limit: any) => {
    setFormData({
      account_type: limit.account_type,
      min_buy_amount: limit.min_buy_amount.toString(),
      max_buy_amount: limit.max_buy_amount.toString(),
      required_down_payment_percentage: limit.required_down_payment_percentage.toString(),
      credit_period_days: limit.credit_period_days.toString()
    });
    setEditingId(limit.id);
    setShowEditForm(true);
  };

  const isInstallmentPlan = parseInt(formData.required_down_payment_percentage) < 100;

  return (
    <div className="space-y-6">
      {showEditForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Edit Buying Limits
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
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="organisation">Organisation</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minimum Buy Amount</Label>
                <Input
                  type="number"
                  value={formData.min_buy_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_buy_amount: e.target.value }))}
                  placeholder="Minimum shares"
                  required
                />
              </div>
              <div>
                <Label>Maximum Buy Amount</Label>
                <Input
                  type="number"
                  value={formData.max_buy_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_buy_amount: e.target.value }))}
                  placeholder="Maximum shares"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Required Down Payment (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.required_down_payment_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, required_down_payment_percentage: e.target.value }))}
                placeholder="Percentage required upfront"
              />
              <p className="text-sm text-muted-foreground mt-1">
                100% = Full payment required, &lt;100% = Installment plan available
              </p>
            </div>

            {isInstallmentPlan && (
              <div>
                <Label>Credit Period (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.credit_period_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, credit_period_days: e.target.value }))}
                  placeholder="Days to complete payment"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Only applies to installment plans (down payment &lt; 100%)
                </p>
              </div>
            )}

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
                      min_buy_amount: '',
                      max_buy_amount: '',
                      required_down_payment_percentage: '100',
                      credit_period_days: '0'
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
          <CardTitle>Account Type Buying Limits</CardTitle>
        </CardHeader>
        <CardContent>
          {limits.length === 0 ? (
            <p className="text-muted-foreground">No buying limits set</p>
          ) : (
            <div className="space-y-4">
              {limits.map((limit) => (
                <div key={limit.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="font-semibold capitalize">{limit.account_type}</div>
                      <div className="text-sm text-muted-foreground">
                        Range: {limit.min_buy_amount} - {limit.max_buy_amount} shares
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Down Payment: {limit.required_down_payment_percentage}%
                        {limit.credit_period_days > 0 && ` | Credit: ${limit.credit_period_days} days`}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(limit)}
                      className="flex items-center"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
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

export default EnhancedShareBuyingLimits;
