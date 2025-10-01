
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calculator } from 'lucide-react';

interface TransactionFee {
  id: string;
  transaction_type: string;
  currency: string;
  percentage_fee: number;
  flat_fee: number;
  created_at: string;
  updated_at: string;
}

const TransactionFeesManager = () => {
  const [fees, setFees] = useState<TransactionFee[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingFee, setEditingFee] = useState<TransactionFee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [transactionType, setTransactionType] = useState('');
  const [currency, setCurrency] = useState('UGX');
  const [percentageFee, setPercentageFee] = useState('');
  const [flatFee, setFlatFee] = useState('');

  // Preview calculation state
  const [previewAmount, setPreviewAmount] = useState('1000');

  useEffect(() => {
    loadTransactionFees();
  }, []);

  const loadTransactionFees = async () => {
    try {
      const { data, error } = await supabase
        .from('transaction_fee_settings')
        .select('*')
        .order('transaction_type', { ascending: true });

      if (error) throw error;
      setFees(data || []);
    } catch (error) {
      console.error('Error loading transaction fees:', error);
      toast.error('Failed to load transaction fees');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFee = () => {
    setEditingFee(null);
    setTransactionType('');
    setCurrency('UGX');
    setPercentageFee('');
    setFlatFee('');
    setShowEditDialog(true);
  };

  const handleEditFee = (fee: TransactionFee) => {
    setEditingFee(fee);
    setTransactionType(fee.transaction_type);
    setCurrency(fee.currency);
    setPercentageFee(fee.percentage_fee.toString());
    setFlatFee(fee.flat_fee.toString());
    setShowEditDialog(true);
  };

  const handleSaveFee = async () => {
    if (!transactionType || !currency) {
      toast.error('Please fill in all required fields');
      return;
    }

    const percentageValue = parseFloat(percentageFee) || 0;
    const flatValue = parseFloat(flatFee) || 0;

    if (percentageValue < 0 || flatValue < 0) {
      toast.error('Fee values cannot be negative');
      return;
    }

    setSaving(true);
    try {
      const feeData = {
        transaction_type: transactionType,
        currency,
        percentage_fee: percentageValue,
        flat_fee: flatValue,
      };

      if (editingFee) {
        // Update existing fee
        const { error } = await supabase
          .from('transaction_fee_settings')
          .update(feeData)
          .eq('id', editingFee.id);

        if (error) throw error;
        toast.success('Transaction fee updated successfully');
      } else {
        // Create new fee
        const { error } = await supabase
          .from('transaction_fee_settings')
          .insert(feeData);

        if (error) throw error;
        toast.success('Transaction fee created successfully');
      }

      setShowEditDialog(false);
      loadTransactionFees();
    } catch (error: any) {
      console.error('Error saving transaction fee:', error);
      toast.error(error.message || 'Failed to save transaction fee');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFee = async (feeId: string) => {
    if (!confirm('Are you sure you want to delete this transaction fee?')) return;

    try {
      const { error } = await supabase
        .from('transaction_fee_settings')
        .delete()
        .eq('id', feeId);

      if (error) throw error;
      toast.success('Transaction fee deleted successfully');
      loadTransactionFees();
    } catch (error: any) {
      console.error('Error deleting transaction fee:', error);
      toast.error(error.message || 'Failed to delete transaction fee');
    }
  };

  const calculateFee = (amount: number, fee: TransactionFee) => {
    const percentageFeeAmount = (amount * fee.percentage_fee) / 100;
    const totalFee = percentageFeeAmount + fee.flat_fee;
    return totalFee;
  };

  const previewFeeCalculation = () => {
    const amount = parseFloat(previewAmount) || 0;
    const percentageValue = parseFloat(percentageFee) || 0;
    const flatValue = parseFloat(flatFee) || 0;
    
    const percentageFeeAmount = (amount * percentageValue) / 100;
    const totalFee = percentageFeeAmount + flatValue;
    const netAmount = amount - totalFee;
    
    return { amount, percentageFeeAmount, flatValue, totalFee, netAmount };
  };

  const transactionTypes = [
    { value: 'exchange_usd', label: 'Exchange ($)' },
    { value: 'exchange_ugx', label: 'Exchange (UGX)' },
    { value: 'withdraw_usd', label: 'Withdraw ($)' },
    { value: 'withdraw_ugx', label: 'Withdraw (UGX)' },
    { value: 'funds_transfer_usd', label: 'Funds Transfer ($)' },
    { value: 'funds_transfer_ugx', label: 'Funds Transfer (UGX)' },
    { value: 'deposit_usd', label: 'Deposit ($)' },
    { value: 'deposit_ugx', label: 'Deposit (UGX)' },
    { value: 'share_purchase_ugx', label: 'Share Purchase (UGX)' },
    { value: 'share_sell_ugx', label: 'Share Sell (UGX)' },
    { value: 'share_transfer_ugx', label: 'Share Transfer (UGX)' }
  ];

  const currencies = [
    { value: 'UGX', label: 'UGX' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
  ];

  if (loading) {
    return <div className="animate-pulse">Loading transaction fees...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transaction Fees Management</CardTitle>
          <Button onClick={handleCreateFee}>
            <Plus className="h-4 w-4 mr-2" />
            Add Fee Setting
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction Type</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Percentage Fee (%)</TableHead>
                <TableHead>Flat Fee</TableHead>
                <TableHead>Preview (1000)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => {
                const previewFeeAmount = calculateFee(1000, fee);
                return (
                  <TableRow key={fee.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {fee.transaction_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{fee.currency}</TableCell>
                    <TableCell>{fee.percentage_fee}%</TableCell>
                    <TableCell>{fee.flat_fee}</TableCell>
                    <TableCell className="font-medium">
                      {previewFeeAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditFee(fee)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteFee(fee.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {fees.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No transaction fees configured</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Fee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFee ? 'Edit Transaction Fee' : 'Add Transaction Fee'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Transaction Type</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Percentage Fee (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={percentageFee}
                  onChange={(e) => setPercentageFee(e.target.value)}
                />
              </div>
              <div>
                <Label>Flat Fee</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={flatFee}
                  onChange={(e) => setFlatFee(e.target.value)}
                />
              </div>
            </div>

            {/* Fee Calculator Preview */}
            <Card className="bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Fee Calculator Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-xs">Test Amount</Label>
                  <Input
                    type="number"
                    value={previewAmount}
                    onChange={(e) => setPreviewAmount(e.target.value)}
                    className="h-8"
                  />
                </div>
                {(() => {
                  const preview = previewFeeCalculation();
                  return (
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span>{currency} {preview.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Percentage Fee ({percentageFee || 0}%):</span>
                        <span>{currency} {preview.percentageFeeAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Flat Fee:</span>
                        <span>{currency} {preview.flatValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Total Fee:</span>
                        <span>{currency} {preview.totalFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Net Amount:</span>
                        <span>{currency} {preview.netAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFee} disabled={saving}>
              {saving ? 'Saving...' : (editingFee ? 'Update Fee' : 'Create Fee')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionFeesManager;
