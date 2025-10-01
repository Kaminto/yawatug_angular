import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Save, X, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MerchantCode {
  id: string;
  provider_name: string;
  merchant_code: string;
  currency: string;
  is_active: boolean;
  environment: string;
  api_endpoint?: string;
  webhook_url?: string;
  description?: string;
  created_at: string;
  approval_status?: string;
}

export const MerchantCodesManager = () => {
  const [codes, setCodes] = useState<MerchantCode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    provider_name: '',
    merchant_code: '',
    currency: 'UGX',
    environment: 'production',
    api_endpoint: '',
    webhook_url: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadMerchantCodes();
  }, []);

  const loadMerchantCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_merchant_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error loading merchant codes:', error);
      toast.error('Failed to load merchant codes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from('admin_merchant_codes')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Merchant code updated successfully');
      } else {
        const { error } = await supabase
          .from('admin_merchant_codes')
          .insert([formData]);

        if (error) throw error;
        toast.success('Merchant code created successfully');
      }

      resetForm();
      loadMerchantCodes();
    } catch (error) {
      console.error('Error saving merchant code:', error);
      toast.error('Failed to save merchant code');
    }
  };

  const handleEdit = (code: MerchantCode) => {
    setFormData({
      provider_name: code.provider_name,
      merchant_code: code.merchant_code,
      currency: code.currency,
      environment: code.environment,
      api_endpoint: code.api_endpoint || '',
      webhook_url: code.webhook_url || '',
      description: code.description || '',
      is_active: code.is_active
    });
    setEditingId(code.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this merchant code?')) return;

    try {
      const { error } = await supabase
        .from('admin_merchant_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Merchant code deleted successfully');
      loadMerchantCodes();
    } catch (error) {
      console.error('Error deleting merchant code:', error);
      toast.error('Failed to delete merchant code');
    }
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('admin_merchant_codes')
        .update({ approval_status: status })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Merchant code ${status} successfully`);
      loadMerchantCodes();
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast.error('Failed to update approval status');
    }
  };

  const resetForm = () => {
    setFormData({
      provider_name: '',
      merchant_code: '',
      currency: 'UGX',
      environment: 'production',
      api_endpoint: '',
      webhook_url: '',
      description: '',
      is_active: true
    });
    setEditingId(null);
  };

  if (loading) {
    return <div className="text-center py-8">Loading merchant codes...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingId ? 'Edit Merchant Code' : 'Add New Merchant Code'}
          </CardTitle>
          <CardDescription>
            Configure payment gateway merchant codes for different providers and currencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider_name">Network/Provider *</Label>
                <Select
                  value={formData.provider_name}
                  onValueChange={(value) => setFormData({ ...formData, provider_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                    <SelectItem value="Airtel">Airtel Money</SelectItem>
                    <SelectItem value="PayTota">PayTota</SelectItem>
                    <SelectItem value="ClickPesa">ClickPesa</SelectItem>
                    <SelectItem value="Selcom">Selcom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchant_code">Merchant Code *</Label>
                <Input
                  id="merchant_code"
                  placeholder="Enter merchant code"
                  value={formData.merchant_code}
                  onChange={(e) => setFormData({ ...formData, merchant_code: e.target.value })}
                  required
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="environment">Status</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value) => setFormData({ ...formData, environment: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Active</SelectItem>
                    <SelectItem value="sandbox">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Notes</Label>
              <Input
                id="description"
                placeholder="Optional notes about this merchant code"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
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
          <CardTitle>Configured Merchant Codes</CardTitle>
          <CardDescription>
            Manage your payment gateway merchant codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No merchant codes configured yet
            </div>
          ) : (
            <div className="space-y-4">
              {codes.map((code) => (
                <div key={code.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                         <h4 className="font-medium">{code.provider_name}</h4>
                         <Badge variant={code.is_active ? "default" : "secondary"}>
                           {code.is_active ? 'Active' : 'Inactive'}
                         </Badge>
                         <Badge variant="outline">{code.environment === 'production' ? 'Active' : 'Testing'}</Badge>
                         {code.approval_status && (
                           <Badge 
                             variant={code.approval_status === 'approved' ? 'default' : 
                                    code.approval_status === 'rejected' ? 'destructive' : 'outline'}
                           >
                             {code.approval_status === 'approved' ? 'Approved' :
                              code.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                           </Badge>
                         )}
                       </div>
                      <p className="text-sm text-muted-foreground">
                        Code: {code.merchant_code} | Currency: {code.currency}
                      </p>
                      {code.description && (
                        <p className="text-sm text-muted-foreground">{code.description}</p>
                      )}
                    </div>
                     <div className="flex gap-2">
                       {code.approval_status === 'pending' && (
                         <>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleApproval(code.id, 'approved')}
                             className="text-green-600 hover:bg-green-50"
                           >
                             <CheckCircle className="w-4 h-4" />
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleApproval(code.id, 'rejected')}
                             className="text-red-600 hover:bg-red-50"
                           >
                             <XCircle className="w-4 h-4" />
                           </Button>
                         </>
                       )}
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleEdit(code)}
                       >
                         <Edit2 className="w-4 h-4" />
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleDelete(code.id)}
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