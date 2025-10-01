import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Save, X, Building2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code?: string;
  swift_code?: string;
  currency: string;
  account_type: string;
  is_active: boolean;
  is_primary: boolean;
  description?: string;
  created_at: string;
  approval_status?: string;
}

export const BankAccountsManager = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    bank_code: '',
    swift_code: '',
    currency: 'UGX',
    account_type: 'business',
    description: '',
    is_active: true,
    is_primary: false
  });

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_bank_accounts')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // If setting as primary, unset other primary accounts
      if (formData.is_primary) {
        await supabase
          .from('admin_bank_accounts')
          .update({ is_primary: false })
          .eq('currency', formData.currency);
      }

      if (editingId) {
        const { error } = await supabase
          .from('admin_bank_accounts')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Bank account updated successfully');
      } else {
        const { error } = await supabase
          .from('admin_bank_accounts')
          .insert([formData]);

        if (error) throw error;
        toast.success('Bank account created successfully');
      }

      resetForm();
      loadBankAccounts();
    } catch (error) {
      console.error('Error saving bank account:', error);
      toast.error('Failed to save bank account');
    }
  };

  const handleEdit = (account: BankAccount) => {
    setFormData({
      account_name: account.account_name,
      account_number: account.account_number,
      bank_name: account.bank_name,
      bank_code: account.bank_code || '',
      swift_code: account.swift_code || '',
      currency: account.currency,
      account_type: account.account_type,
      description: account.description || '',
      is_active: account.is_active,
      is_primary: account.is_primary
    });
    setEditingId(account.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;

    try {
      const { error } = await supabase
        .from('admin_bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Bank account deleted successfully');
      loadBankAccounts();
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toast.error('Failed to delete bank account');
    }
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('admin_bank_accounts')
        .update({ approval_status: status })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Bank account ${status} successfully`);
      loadBankAccounts();
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast.error('Failed to update approval status');
    }
  };

  const resetForm = () => {
    setFormData({
      account_name: '',
      account_number: '',
      bank_name: '',
      bank_code: '',
      swift_code: '',
      currency: 'UGX',
      account_type: 'business',
      description: '',
      is_active: true,
      is_primary: false
    });
    setEditingId(null);
  };

  if (loading) {
    return <div className="text-center py-8">Loading bank accounts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {editingId ? 'Edit Bank Account' : 'Add New Bank Account'}
          </CardTitle>
          <CardDescription>
            Configure bank accounts for receiving payments and managing funds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name *</Label>
                <Input
                  id="account_name"
                  placeholder="e.g., Yawatu Business Account"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  placeholder="Enter account number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name *</Label>
                <Input
                  id="bank_name"
                  placeholder="e.g., Stanbic Bank Uganda"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_code">Bank Code</Label>
                <Input
                  id="bank_code"
                  placeholder="e.g., STCBUGKX"
                  value={formData.bank_code}
                  onChange={(e) => setFormData({ ...formData, bank_code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="swift_code">SWIFT Code</Label>
                <Input
                  id="swift_code"
                  placeholder="e.g., STCBUGKXXXX"
                  value={formData.swift_code}
                  onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UGX">UGX</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_type">Account Type</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="escrow">Escrow</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional notes about this bank account"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
                />
                <Label htmlFor="is_primary">Primary Account</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? 'Update' : 'Create'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Bank Accounts</CardTitle>
          <CardDescription>
            Manage your bank accounts for different currencies and purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bank accounts configured yet
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                         <h4 className="font-medium">{account.account_name}</h4>
                         <Badge variant={account.is_active ? "default" : "secondary"}>
                           {account.is_active ? 'Active' : 'Inactive'}
                         </Badge>
                         {account.is_primary && (
                           <Badge variant="outline">Primary</Badge>
                         )}
                         <Badge variant="outline">{account.account_type}</Badge>
                         {account.approval_status && (
                           <Badge 
                             variant={account.approval_status === 'approved' ? 'default' : 
                                    account.approval_status === 'rejected' ? 'destructive' : 'outline'}
                           >
                             {account.approval_status === 'approved' ? 'Approved' :
                              account.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                           </Badge>
                         )}
                       </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Bank: {account.bank_name}</p>
                        <p>Account: {account.account_number} | Currency: {account.currency}</p>
                        {account.swift_code && (
                          <p>SWIFT: {account.swift_code}</p>
                        )}
                      </div>
                      {account.description && (
                        <p className="text-sm text-muted-foreground">{account.description}</p>
                      )}
                    </div>
                     <div className="flex gap-2">
                       {account.approval_status === 'pending' && (
                         <>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleApproval(account.id, 'approved')}
                             className="text-green-600 hover:bg-green-50"
                           >
                             <CheckCircle className="w-4 h-4" />
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleApproval(account.id, 'rejected')}
                             className="text-red-600 hover:bg-red-50"
                           >
                             <XCircle className="w-4 h-4" />
                           </Button>
                         </>
                       )}
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleEdit(account)}
                       >
                         <Edit2 className="w-4 h-4" />
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleDelete(account.id)}
                       >
                         <Trash2 className="w-4 h-4" />
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