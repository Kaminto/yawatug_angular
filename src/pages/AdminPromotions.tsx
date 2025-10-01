import React, { useState, useEffect } from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Megaphone, Users, TrendingUp, Calendar, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PromotionalCampaign {
  id: string;
  name: string;
  title: string;
  description: string;
  campaign_type: string;
  discount_percentage?: number;
  discount_amount?: number;
  bonus_shares_quantity?: number;
  bonus_amount?: number;
  royalty_percentage?: number;
  target_audience: string;
  budget_amount?: number;
  status: string;
  starts_at?: string;
  ends_at?: string;
  max_uses?: number;
  current_uses: number;
  terms_and_conditions?: string;
  promo_code?: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

const AdminPromotions = () => {
  const [campaigns, setCampaigns] = useState<PromotionalCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PromotionalCampaign | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    campaign_type: 'discount',
    discount_percentage: '',
    discount_amount: '',
    bonus_shares_quantity: '',
    bonus_amount: '',
    royalty_percentage: '',
    target_audience: 'all',
    budget_amount: '',
    terms_and_conditions: '',
    promo_code: '',
    starts_at: '',
    ends_at: '',
    max_uses: '',
    priority: '1'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('promotional_campaigns')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const campaignData = {
        name: formData.name,
        title: formData.title,
        description: formData.description,
        campaign_type: formData.campaign_type,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
        bonus_shares_quantity: formData.bonus_shares_quantity ? parseInt(formData.bonus_shares_quantity) : null,
        bonus_amount: formData.bonus_amount ? parseFloat(formData.bonus_amount) : null,
        royalty_percentage: formData.royalty_percentage ? parseFloat(formData.royalty_percentage) : null,
        target_audience: formData.target_audience,
        budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : null,
        terms_and_conditions: formData.terms_and_conditions,
        promo_code: formData.promo_code || null,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        priority: parseInt(formData.priority),
        status: 'draft',
        is_active: false
      };

      if (editingCampaign) {
        // Update existing campaign
        const { error } = await supabase
          .from('promotional_campaigns')
          .update(campaignData)
          .eq('id', editingCampaign.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Campaign updated successfully!",
        });
      } else {
        // Create new campaign
        const { error } = await supabase
          .from('promotional_campaigns')
          .insert(campaignData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Campaign created successfully!",
        });
      }

      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingCampaign ? 'update' : 'create'} campaign`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      description: '',
      campaign_type: 'discount',
      discount_percentage: '',
      discount_amount: '',
      bonus_shares_quantity: '',
      bonus_amount: '',
      royalty_percentage: '',
      target_audience: 'all',
      budget_amount: '',
      terms_and_conditions: '',
      promo_code: '',
      starts_at: '',
      ends_at: '',
      max_uses: '',
      priority: '1'
    });
    setIsCreating(false);
    setEditingCampaign(null);
  };

  const handleEdit = (campaign: PromotionalCampaign) => {
    setFormData({
      name: campaign.name,
      title: campaign.title,
      description: campaign.description,
      campaign_type: campaign.campaign_type,
      discount_percentage: campaign.discount_percentage?.toString() || '',
      discount_amount: campaign.discount_amount?.toString() || '',
      bonus_shares_quantity: campaign.bonus_shares_quantity?.toString() || '',
      bonus_amount: campaign.bonus_amount?.toString() || '',
      royalty_percentage: campaign.royalty_percentage?.toString() || '',
      target_audience: campaign.target_audience,
      budget_amount: campaign.budget_amount?.toString() || '',
      terms_and_conditions: campaign.terms_and_conditions || '',
      promo_code: campaign.promo_code || '',
      starts_at: campaign.starts_at ? new Date(campaign.starts_at).toISOString().split('T')[0] : '',
      ends_at: campaign.ends_at ? new Date(campaign.ends_at).toISOString().split('T')[0] : '',
      max_uses: campaign.max_uses?.toString() || '',
      priority: campaign.priority.toString()
    });
    setEditingCampaign(campaign);
    setIsCreating(true);
    setActiveTab('create');
  };

  const handleNewCampaign = () => {
    resetForm();
    setIsCreating(true);
    setActiveTab('create');
  };

  const toggleStatus = async (campaign: PromotionalCampaign) => {
    try {
      const { error } = await supabase
        .from('promotional_campaigns')
        .update({ is_active: !campaign.is_active })
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Campaign ${!campaign.is_active ? 'activated' : 'deactivated'}!`,
      });

      fetchCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign",
        variant: "destructive",
      });
    }
  };

  const activeCampaigns = campaigns.filter(c => c.is_active && c.status === 'active');
  const totalReach = campaigns.reduce((sum, c) => sum + c.current_uses, 0);

  return (
    <UnifiedLayout title="Promotions Management">
      <div className="space-y-8">
        <div>
          <p className="text-muted-foreground">
            Create and manage marketing campaigns and promotions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="active">
              <span className="hidden sm:inline">Active Campaigns</span>
              <span className="sm:hidden">Active</span>
            </TabsTrigger>
            <TabsTrigger value="create">
              <span className="hidden sm:inline">Create Campaign</span>
              <span className="sm:hidden">Create</span>
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="settings">
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeCampaigns.length}</div>
                  <p className="text-xs text-muted-foreground">Currently running</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalReach.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total uses</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12.4%</div>
                  <p className="text-xs text-muted-foreground">+2.3% from last month</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{campaigns.filter(c => c.status === 'draft').length}</div>
                  <p className="text-xs text-muted-foreground">Draft campaigns</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Campaign Management</CardTitle>
                  <Button onClick={handleNewCampaign}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Campaign
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value/Benefit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Loading campaigns...</TableCell>
                      </TableRow>
                    ) : campaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No campaigns found</TableCell>
                      </TableRow>
                    ) : (
                      campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{campaign.campaign_type.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell>
                            {campaign.discount_percentage && `${campaign.discount_percentage}% off`}
                            {campaign.discount_amount && `UGX ${campaign.discount_amount.toLocaleString()} off`}
                            {campaign.bonus_shares_quantity && `${campaign.bonus_shares_quantity} bonus shares`}
                            {campaign.bonus_amount && `UGX ${campaign.bonus_amount.toLocaleString()} bonus`}
                            {campaign.royalty_percentage && `${campaign.royalty_percentage}% royalty`}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={campaign.is_active && campaign.status === 'active' ? 'default' : 'secondary'}
                            >
                              {campaign.is_active ? campaign.status : 'inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {campaign.current_uses}
                            {campaign.max_uses && ` / ${campaign.max_uses}`}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => toggleStatus(campaign)}
                              >
                                {campaign.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(campaign)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</CardTitle>
                  {(isCreating || editingCampaign) && (
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Campaign Name (Internal)</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., new-user-discount"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="title">Display Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., New User Welcome Offer"
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
                      placeholder="Describe the campaign benefits..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="campaign_type">Campaign Type</Label>
                      <Select value={formData.campaign_type} onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discount">Discount</SelectItem>
                          <SelectItem value="bonus_shares">Bonus Shares</SelectItem>
                          <SelectItem value="cashback">Cashback</SelectItem>
                          <SelectItem value="referral_bonus">Referral Bonus</SelectItem>
                          <SelectItem value="early_bird">Early Bird</SelectItem>
                          <SelectItem value="loyalty_reward">Loyalty Reward</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="target_audience">Target Audience</Label>
                      <Select value={formData.target_audience} onValueChange={(value) => setFormData({ ...formData, target_audience: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="new_users">New Users</SelectItem>
                          <SelectItem value="existing_users">Existing Users</SelectItem>
                          <SelectItem value="premium_users">Premium Users</SelectItem>
                          <SelectItem value="inactive_users">Inactive Users</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Campaign Benefits Section */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-medium">Campaign Benefits</h3>
                    
                    {formData.campaign_type === 'discount' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="discount_percentage">Discount Percentage (%)</Label>
                          <Input
                            id="discount_percentage"
                            type="number"
                            value={formData.discount_percentage}
                            onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                            placeholder="e.g., 10"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="discount_amount">Or Fixed Discount Amount (UGX)</Label>
                          <Input
                            id="discount_amount"
                            type="number"
                            value={formData.discount_amount}
                            onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                            placeholder="e.g., 50000"
                            min="0"
                          />
                        </div>
                      </div>
                    )}

                    {formData.campaign_type === 'bonus_shares' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="bonus_shares_quantity">Bonus Shares Quantity</Label>
                          <Input
                            id="bonus_shares_quantity"
                            type="number"
                            value={formData.bonus_shares_quantity}
                            onChange={(e) => setFormData({ ...formData, bonus_shares_quantity: e.target.value })}
                            placeholder="e.g., 5"
                            min="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="royalty_percentage">Royalty Percentage (%)</Label>
                          <Input
                            id="royalty_percentage"
                            type="number"
                            value={formData.royalty_percentage}
                            onChange={(e) => setFormData({ ...formData, royalty_percentage: e.target.value })}
                            placeholder="e.g., 2.5"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                        </div>
                      </div>
                    )}

                    {(formData.campaign_type === 'cashback' || formData.campaign_type === 'referral_bonus') && (
                      <div>
                        <Label htmlFor="bonus_amount">Bonus Amount (UGX)</Label>
                        <Input
                          id="bonus_amount"
                          type="number"
                          value={formData.bonus_amount}
                          onChange={(e) => setFormData({ ...formData, bonus_amount: e.target.value })}
                          placeholder="e.g., 75000"
                          min="0"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="starts_at">Start Date</Label>
                      <Input
                        id="starts_at"
                        type="datetime-local"
                        value={formData.starts_at}
                        onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ends_at">End Date</Label>
                      <Input
                        id="ends_at"
                        type="datetime-local"
                        value={formData.ends_at}
                        onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="budget_amount">Budget (UGX)</Label>
                      <Input
                        id="budget_amount"
                        type="number"
                        value={formData.budget_amount}
                        onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_uses">Max Uses (optional)</Label>
                      <Input
                        id="max_uses"
                        type="number"
                        value={formData.max_uses}
                        onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                        placeholder="Unlimited"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority (1-10)</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        min="1"
                        max="10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="promo_code">Promo Code (optional)</Label>
                    <Input
                      id="promo_code"
                      value={formData.promo_code}
                      onChange={(e) => setFormData({ ...formData, promo_code: e.target.value })}
                      placeholder="e.g., WELCOME10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="terms_and_conditions">Terms & Conditions</Label>
                    <Textarea
                      id="terms_and_conditions"
                      value={formData.terms_and_conditions}
                      onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                      placeholder="Enter specific terms, conditions, and eligibility criteria..."
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">{editingCampaign ? 'Update Campaign' : 'Create Campaign'}</Button>
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>New User Bonus</span>
                      <span className="font-bold">1,245 users</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Share Purchase Discount</span>
                      <span className="font-bold">876 users</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '52%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Early Investor Rewards</span>
                      <span className="font-bold">224 users</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversion Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Click-through Rate</span>
                      <span className="font-bold">24.7%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Conversion Rate</span>
                      <span className="font-bold">12.4%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cost per Acquisition</span>
                      <span className="font-bold">UGX 5,200</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Return on Investment</span>
                      <span className="font-bold text-green-600">+215%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Promotion Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Default Campaign Duration (days)</label>
                  <Input type="number" defaultValue="30" />
                </div>
                <div>
                  <label className="text-sm font-medium">Notification Settings</label>
                  <div className="flex items-center space-x-2 mt-2">
                    <input type="checkbox" id="email-notifications" defaultChecked />
                    <label htmlFor="email-notifications" className="text-sm">Email notifications</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="sms-notifications" />
                    <label htmlFor="sms-notifications" className="text-sm">SMS notifications</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="app-notifications" defaultChecked />
                    <label htmlFor="app-notifications" className="text-sm">In-app notifications</label>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Approval Workflow</label>
                  <Select defaultValue="single">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Approver</SelectItem>
                      <SelectItem value="multi">Multiple Approvers</SelectItem>
                      <SelectItem value="none">No Approval Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UnifiedLayout>
  );
};

export default AdminPromotions;