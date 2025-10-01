import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Save, Plus, Edit, Trash2 } from 'lucide-react';

interface FeeSettings {
  id?: string;
  transaction_type: string;
  percentage_fee: number;
  flat_fee: number;
  minimum_fee: number;
  maximum_fee: number;
  fee_type: string;
  is_active: boolean;
  currency?: string;
}

// Function to display user-friendly transaction type names
const getTransactionTypeDisplay = (type: string, currency?: string) => {
  // Handle old database values with currency context
  if (currency) {
    const currencySymbol = currency === 'USD' ? '$' : currency;
    switch (type) {
      case 'currency_exchange':
        return `Exchange (${currencySymbol})`;
      case 'withdraw':
        return `Withdraw (${currencySymbol})`;
      case 'funds_transfer':
        return `Funds Transfer (${currencySymbol})`;
      case 'deposit':
        return `Deposit (${currencySymbol})`;
      case 'share_purchase':
        return `Share Purchase (${currencySymbol})`;
      case 'share_sell':
        return `Share Sell (${currencySymbol})`;
      case 'share_transfer':
        return `Share Transfer (${currencySymbol})`;
    }
  }
  
  // Handle new naming convention
  const typeMap: { [key: string]: string } = {
    'exchange_usd': 'Exchange ($)',
    'exchange_ugx': 'Exchange (UGX)',
    'withdraw_usd': 'Withdraw ($)',
    'withdraw_ugx': 'Withdraw (UGX)',
    'funds_transfer_usd': 'Funds Transfer ($)',
    'funds_transfer_ugx': 'Funds Transfer (UGX)',
    'deposit_usd': 'Deposit ($)',
    'deposit_ugx': 'Deposit (UGX)',
    'share_purchase_ugx': 'Share Purchase (UGX)',
    'share_sell_ugx': 'Share Sell (UGX)',
    'share_transfer_ugx': 'Share Transfer (UGX)'
  };
  return typeMap[type] || type.replace('_', ' ').toUpperCase();
};

const EditableTransactionFeesManager = () => {
  const [feeSettings, setFeeSettings] = useState<FeeSettings[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeSettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const transactionTypes = [
    'exchange_usd',
    'exchange_ugx', 
    'withdraw_usd',
    'withdraw_ugx',
    'funds_transfer_usd',
    'funds_transfer_ugx',
    'deposit_usd',
    'deposit_ugx',
    'share_purchase_ugx',
    'share_sell_ugx',
    'share_transfer_ugx'
  ];

  const feeTypes = [
    'percentage',
    'flat',
    'combined'
  ];

  useEffect(() => {
    loadFeeSettings();
  }, []);

  const loadFeeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('transaction_fee_settings')
        .select('*')
        .order('transaction_type', { ascending: true });

      if (error) throw error;
      
      // Force refresh by clearing cache and setting new data
      setFeeSettings([]);
      setTimeout(() => {
        setFeeSettings((data || []).map((item: any) => ({
          ...item,
          is_active: item.is_active ?? true
        })));
      }, 10);
    } catch (error) {
      console.error('Error loading fee settings:', error);
      toast.error('Failed to load fee settings');
    }
  };

  const handleSaveFee = async () => {
    if (!editingFee) return;

    try {
      setLoading(true);

      if (editingFee.id) {
        // Update existing
        const { error } = await supabase
          .from('transaction_fee_settings')
          .update({
            percentage_fee: editingFee.percentage_fee,
            flat_fee: editingFee.flat_fee,
            minimum_fee: editingFee.minimum_fee,
            maximum_fee: editingFee.maximum_fee,
            fee_type: editingFee.fee_type,
            is_active: editingFee.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFee.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('transaction_fee_settings')
          .insert({
            transaction_type: editingFee.transaction_type,
            percentage_fee: editingFee.percentage_fee,
            flat_fee: editingFee.flat_fee,
            minimum_fee: editingFee.minimum_fee,
            maximum_fee: editingFee.maximum_fee,
            fee_type: editingFee.fee_type,
            is_active: editingFee.is_active
          });

        if (error) throw error;
      }

      toast.success('Fee settings saved successfully');
      setIsEditing(false);
      setEditingFee(null);
      loadFeeSettings();
    } catch (error: any) {
      console.error('Error saving fee settings:', error);
      toast.error(error.message || 'Failed to save fee settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transaction_fee_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Fee setting deleted successfully');
      loadFeeSettings();
    } catch (error: any) {
      console.error('Error deleting fee setting:', error);
      toast.error(error.message || 'Failed to delete fee setting');
    }
  };

  const startEditing = (fee?: FeeSettings) => {
    setEditingFee(fee || {
      transaction_type: 'deposit_ugx',
      percentage_fee: 0,
      flat_fee: 0,
      minimum_fee: 0,
      maximum_fee: 0,
      fee_type: 'percentage',
      is_active: true
    });
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Transaction Fee Settings
            </div>
            <Button onClick={() => startEditing()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Rule
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Existing Fee Settings */}
          <div className="space-y-4">
            {feeSettings.map((fee) => (
              <div key={fee.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{getTransactionTypeDisplay(fee.transaction_type, fee.currency)}</h3>
                    <div className="text-sm text-muted-foreground mt-1">
                      {fee.fee_type === 'percentage' && `${fee.percentage_fee}% fee`}
                      {fee.fee_type === 'flat' && `${fee.flat_fee} flat fee`}
                      {fee.fee_type === 'combined' && `${fee.percentage_fee}% + ${fee.flat_fee} fee`}
                      {fee.minimum_fee > 0 && ` (min: ${fee.minimum_fee})`}
                      {fee.maximum_fee > 0 && ` (max: ${fee.maximum_fee})`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={fee.is_active} disabled />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(fee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fee.id && handleDeleteFee(fee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Form */}
          {isEditing && editingFee && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-4">
                {editingFee.id ? 'Edit Fee Setting' : 'Add New Fee Setting'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Transaction Type</Label>
                  <Select
                    value={editingFee.transaction_type}
                    onValueChange={(value) => setEditingFee({...editingFee, transaction_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {getTransactionTypeDisplay(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fee Type</Label>
                  <Select
                    value={editingFee.fee_type}
                    onValueChange={(value) => setEditingFee({...editingFee, fee_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {feeTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Percentage Fee (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingFee.percentage_fee}
                    onChange={(e) => setEditingFee({...editingFee, percentage_fee: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Flat Fee</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingFee.flat_fee}
                    onChange={(e) => setEditingFee({...editingFee, flat_fee: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Minimum Fee</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingFee.minimum_fee}
                    onChange={(e) => setEditingFee({...editingFee, minimum_fee: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Maximum Fee</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingFee.maximum_fee}
                    onChange={(e) => setEditingFee({...editingFee, maximum_fee: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Switch
                  checked={editingFee.is_active}
                  onCheckedChange={(checked) => setEditingFee({...editingFee, is_active: checked})}
                />
                <Label>Active</Label>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSaveFee} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EditableTransactionFeesManager;
