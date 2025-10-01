import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar as CalendarIcon,
  Target,
  Gift,
  TrendingUp,
  Users,
  Eye,
  EyeOff,
  Save,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/dateFormatter';

interface Promotion {
  id: string;
  name: string;
  title: string;
  description: string;
  offer_details: any;
  target_audience: string;
  promotion_type: string;
  value_amount?: number;
  value_currency: string;
  value_percentage?: number;
  is_active: boolean;
  priority: number;
  starts_at?: string;
  expires_at?: string;
  max_uses?: number;
  current_uses: number;
  terms_and_conditions?: string;
  promo_code?: string;
  created_at: string;
  updated_at: string;
}

const PromotionManagement: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    offer_details: '{}',
    target_audience: 'all',
    promotion_type: 'bonus_shares',
    value_amount: '',
    value_currency: 'UGX',
    value_percentage: '',
    is_active: true,
    priority: 1,
    starts_at: null as Date | null,
    expires_at: null as Date | null,
    max_uses: '',
    terms_and_conditions: '',
    promo_code: ''
  });

  const { toast } = useToast();

  const targetAudiences = [
    { value: 'all', label: '🌍 All Users', icon: Users },
    { value: 'first_time', label: '🆕 First-Time Visitors', icon: Gift },
    { value: 'returning', label: '🔄 Returning Investors', icon: TrendingUp },
    { value: 'premium', label: '💎 Premium Investors', icon: Target }
  ];

  const promotionTypes = [
    { value: 'bonus_shares', label: '🎁 Bonus Shares' },
    { value: 'discount', label: '💰 Discount' },
    { value: 'cashback', label: '💵 Cashback' },
    { value: 'referral_bonus', label: '👥 Referral Bonus' }
  ];

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      toast({
        title: "Error",
        description: "Failed to load promotions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const promotionData = {
        name: formData.name,
        title: formData.title,
        description: formData.description,
        offer_details: JSON.parse(formData.offer_details || '{}'),
        target_audience: formData.target_audience,
        promotion_type: formData.promotion_type,
        value_amount: formData.value_amount ? parseFloat(formData.value_amount) : null,
        value_currency: formData.value_currency,
        value_percentage: formData.value_percentage ? parseFloat(formData.value_percentage) : null,
        is_active: formData.is_active,
        priority: formData.priority,
        starts_at: formData.starts_at?.toISOString(),
        expires_at: formData.expires_at?.toISOString(),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        terms_and_conditions: formData.terms_and_conditions,
        promo_code: formData.promo_code || null,
        created_by: null // Handle this properly in production
      };

      let result;
      if (editingPromotion) {
        result = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id);
      } else {
        result = await supabase
          .from('promotions')
          .insert(promotionData);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Promotion ${editingPromotion ? 'updated' : 'created'} successfully!`,
      });

      resetForm();
      fetchPromotions();
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingPromotion ? 'update' : 'create'} promotion`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      description: '',
      offer_details: '{}',
      target_audience: 'all',
      promotion_type: 'bonus_shares',
      value_amount: '',
      value_currency: 'UGX',
      value_percentage: '',
      is_active: true,
      priority: 1,
      starts_at: null,
      expires_at: null,
      max_uses: '',
      terms_and_conditions: '',
      promo_code: ''
    });
    setIsCreating(false);
    setEditingPromotion(null);
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      title: promotion.title,
      description: promotion.description,
      offer_details: JSON.stringify(promotion.offer_details, null, 2),
      target_audience: promotion.target_audience,
      promotion_type: promotion.promotion_type,
      value_amount: promotion.value_amount?.toString() || '',
      value_currency: promotion.value_currency,
      value_percentage: promotion.value_percentage?.toString() || '',
      is_active: promotion.is_active,
      priority: promotion.priority,
      starts_at: promotion.starts_at ? new Date(promotion.starts_at) : null,
      expires_at: promotion.expires_at ? new Date(promotion.expires_at) : null,
      max_uses: promotion.max_uses?.toString() || '',
      terms_and_conditions: promotion.terms_and_conditions || '',
      promo_code: promotion.promo_code || ''
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promotion deleted successfully!",
      });

      fetchPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast({
        title: "Error",
        description: "Failed to delete promotion",
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (promotion: Promotion) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !promotion.is_active })
        .eq('id', promotion.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Promotion ${!promotion.is_active ? 'activated' : 'deactivated'}!`,
      });

      fetchPromotions();
    } catch (error) {
      console.error('Error updating promotion status:', error);
      toast({
        title: "Error",
        description: "Failed to update promotion status",
        variant: "destructive",
      });
    }
  };

  const getAudienceIcon = (audience: string) => {
    const audienceInfo = targetAudiences.find(a => a.value === audience);
    return audienceInfo ? audienceInfo.label : audience;
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading promotions...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Promotion Management</h1>
          <p className="text-gray-600">Create and manage promotional offers for the AI chatbot to present to users</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Promotion
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Promotion Name (Internal)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., first-time-bonus"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="title">Display Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., First-Time Investor Bonus"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the promotion offer..."
                  required
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Select value={formData.target_audience} onValueChange={(value) => setFormData({ ...formData, target_audience: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetAudiences.map((audience) => (
                        <SelectItem key={audience.value} value={audience.value}>
                          {audience.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="promotion_type">Promotion Type</Label>
                  <Select value={formData.promotion_type} onValueChange={(value) => setFormData({ ...formData, promotion_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {promotionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="value_percentage">Percentage Value</Label>
                  <Input
                    id="value_percentage"
                    type="number"
                    value={formData.value_percentage}
                    onChange={(e) => setFormData({ ...formData, value_percentage: e.target.value })}
                    placeholder="e.g., 15"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label htmlFor="value_amount">Fixed Amount</Label>
                  <Input
                    id="value_amount"
                    type="number"
                    value={formData.value_amount}
                    onChange={(e) => setFormData({ ...formData, value_amount: e.target.value })}
                    placeholder="e.g., 50000"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority (1-10)</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="offer_details">Offer Details (JSON)</Label>
                <Textarea
                  id="offer_details"
                  value={formData.offer_details}
                  onChange={(e) => setFormData({ ...formData, offer_details: e.target.value })}
                  placeholder='{"bonus_percentage": 15, "free_consultation": true}'
                  rows={4}
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="terms_and_conditions">Terms & Conditions</Label>
                <Textarea
                  id="terms_and_conditions"
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                  placeholder="• Valid for new investors only..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.starts_at ? format(formData.starts_at, "PPP") : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.starts_at}
                        onSelect={(date) => setFormData({ ...formData, starts_at: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expires_at ? format(formData.expires_at, "PPP") : "Select expiry date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.expires_at}
                        onSelect={(date) => setFormData({ ...formData, expires_at: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_uses">Max Uses (optional)</Label>
                  <Input
                    id="max_uses"
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    placeholder="Leave empty for unlimited"
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="promo_code">Promo Code (optional)</Label>
                  <Input
                    id="promo_code"
                    value={formData.promo_code}
                    onChange={(e) => setFormData({ ...formData, promo_code: e.target.value })}
                    placeholder="e.g., WELCOME15"
                  />
                </div>
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
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  {editingPromotion ? 'Update' : 'Create'} Promotion
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {promotions.map((promotion) => (
          <Card key={promotion.id} className={`${!promotion.is_active ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {promotion.title}
                    <Badge variant={promotion.is_active ? "default" : "secondary"}>
                      {promotion.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">
                      {getAudienceIcon(promotion.target_audience)}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {promotion.promotion_type.replace('_', ' ')}
                    </Badge>
                  </CardTitle>
                  <p className="text-gray-600 mt-1">{promotion.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleStatus(promotion)}
                  >
                    {promotion.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(promotion)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(promotion.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Value:</strong> {promotion.value_percentage ? `${promotion.value_percentage}%` : ''} 
                  {promotion.value_amount ? ` ${promotion.value_amount} ${promotion.value_currency}` : ''}
                </div>
                <div>
                  <strong>Priority:</strong> {promotion.priority}
                </div>
                <div>
                  <strong>Uses:</strong> {promotion.current_uses}{promotion.max_uses ? `/${promotion.max_uses}` : ' (unlimited)'}
                </div>
              </div>
              {promotion.expires_at && (
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Expires:</strong> {formatDate(promotion.expires_at)}
                </div>
              )}
              {promotion.terms_and_conditions && (
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Terms:</strong> {promotion.terms_and_conditions}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {promotions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Gift className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Promotions Yet</h3>
            <p className="text-gray-600 mb-4">Create your first promotion to start offering deals to your investors!</p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Promotion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PromotionManagement;