
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Calculator, TrendingUp } from 'lucide-react';

interface SharePoolCreationProps {
  onSuccess: () => void;
}

const SharePoolCreation: React.FC<SharePoolCreationProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_shares: '',
    price_per_share: '',
    currency: 'UGX',
    start_date: '',
    price_calculation_mode: 'manual',
    buy_back_mode: 'manual'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.total_shares || !formData.price_per_share) {
      toast.error('Please fill in all required fields');
      return;
    }

    const totalShares = parseInt(formData.total_shares);
    const pricePerShare = parseFloat(formData.price_per_share);

    if (totalShares <= 0 || pricePerShare <= 0) {
      toast.error('Total shares and price per share must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const shareData = {
        name: formData.name,
        description: formData.description,
        total_shares: totalShares,
        available_shares: totalShares,
        price_per_share: pricePerShare,
        currency: formData.currency,
        start_date: formData.start_date || null,
        initial_price: pricePerShare,
        reserved_shares: 0,
        reserved_issued: 0,
        buy_back_limit: 0,
        buy_back_fund: 0,
        buy_back_mode: formData.buy_back_mode,
        price_calculation_mode: formData.price_calculation_mode
      };

      console.log('Creating share pool with data:', shareData);

      const { data, error } = await supabase
        .from('shares')
        .insert(shareData)
        .select()
        .single();

      if (error) {
        console.error('Error creating share pool:', error);
        throw error;
      }

      console.log('Share pool created successfully:', data);

      // Create initial price history record
      await supabase
        .from('share_price_history')
        .insert({
          price_per_share: pricePerShare,
          currency: formData.currency,
          calculation_method: 'manual'
        });

      toast.success('Share pool created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        total_shares: '',
        price_per_share: '',
        currency: 'UGX',
        start_date: '',
        price_calculation_mode: 'manual',
        buy_back_mode: 'manual'
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error(error.message || 'Failed to create share pool');
    } finally {
      setLoading(false);
    }
  };

  const totalValue = formData.total_shares && formData.price_per_share ? 
    parseInt(formData.total_shares) * parseFloat(formData.price_per_share) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Share Pool
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div>
              <Label htmlFor="name">Pool Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter share pool name"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter pool description"
                rows={3}
              />
            </div>
          </div>

          {/* Share Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Share Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total_shares">Total Shares *</Label>
                <Input
                  id="total_shares"
                  type="number"
                  min="1"
                  value={formData.total_shares}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_shares: e.target.value }))}
                  placeholder="Enter total number of shares"
                  required
                />
              </div>
              <div>
                <Label htmlFor="price_per_share">Price Per Share ({formData.currency}) *</Label>
                <Input
                  id="price_per_share"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.price_per_share}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_per_share: e.target.value }))}
                  placeholder="Enter price per share"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
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
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Trading Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Trading Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Price Calculation Mode</Label>
                <Select
                  value={formData.price_calculation_mode}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, price_calculation_mode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Automatic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Buyback Mode</Label>
                <Select
                  value={formData.buy_back_mode}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, buy_back_mode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto">Automatic</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pool Summary */}
          {totalValue > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center mb-2">
                <Calculator className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-800 dark:text-blue-200">Pool Summary</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-blue-600 dark:text-blue-400">Total Shares</div>
                  <div className="font-medium text-blue-800 dark:text-blue-200">
                    {parseInt(formData.total_shares).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-blue-600 dark:text-blue-400">Price Per Share</div>
                  <div className="font-medium text-blue-800 dark:text-blue-200">
                    {formData.currency} {parseFloat(formData.price_per_share).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-blue-600 dark:text-blue-400">Total Pool Value</div>
                  <div className="font-medium text-blue-800 dark:text-blue-200">
                    {formData.currency} {totalValue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating Pool...' : 'Create Share Pool'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SharePoolCreation;
