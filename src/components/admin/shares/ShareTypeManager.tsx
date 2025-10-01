import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Settings, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShareTypeConfig {
  id: string;
  share_type: string;
  share_category: string;
  display_name: string;
  description?: string;
  default_voting_rights: boolean;
  default_dividend_eligible: boolean;
  default_transfer_restrictions: any;
  minimum_investment_multiplier: number;
  maximum_holding_multiplier?: number;
  priority_order: number;
  is_active: boolean;
}

interface ShareData {
  id: string;
  name: string;
  share_type: string;
  share_category: string;
  minimum_investment: number;
  maximum_individual_holding?: number;
  voting_rights: boolean;
  dividend_eligible: boolean;
  transfer_restrictions: any;
  total_shares?: number;
  available_shares?: number;
  currency?: string;
  price_per_share?: number;
}

interface ShareTypeManagerProps {
  shareData?: ShareData;
  onUpdate: () => void;
}

const ShareTypeManager: React.FC<ShareTypeManagerProps> = ({ shareData, onUpdate }) => {
  const [shareTypes, setShareTypes] = useState<ShareTypeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('configure');
  const [editingType, setEditingType] = useState<ShareTypeConfig | null>(null);
  const [newTypeForm, setNewTypeForm] = useState({
    share_type: '',
    share_category: '',
    display_name: '',
    description: '',
    default_voting_rights: true,
    default_dividend_eligible: true,
    minimum_investment_multiplier: 1.0,
    maximum_holding_multiplier: null as number | null,
    priority_order: 0
  });
  
  const [shareSettingsForm, setShareSettingsForm] = useState({
    share_type: '',
    share_category: '',
    minimum_investment: 0,
    maximum_individual_holding: null as number | null,
    voting_rights: true,
    dividend_eligible: true,
    transfer_restrictions: {}
  });

  useEffect(() => {
    loadShareTypes();
    if (shareData) {
      setShareSettingsForm({
        share_type: shareData.share_type || 'common',
        share_category: shareData.share_category || 'general',
        minimum_investment: shareData.minimum_investment || 0,
        maximum_individual_holding: shareData.maximum_individual_holding || null,
        voting_rights: shareData.voting_rights ?? true,
        dividend_eligible: shareData.dividend_eligible ?? true,
        transfer_restrictions: shareData.transfer_restrictions || {}
      });
    }
  }, [shareData]);

  const loadShareTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('share_type_configurations')
        .select('*')
        .order('priority_order', { ascending: true });

      if (error) throw error;
      setShareTypes(data || []);
    } catch (error) {
      console.error('Error loading share types:', error);
      toast.error('Failed to load share types');
    }
  };

  const handleCreateShareType = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('share_type_configurations')
        .insert([newTypeForm]);

      if (error) throw error;
      
      toast.success('Share type created successfully');
      setNewTypeForm({
        share_type: '',
        share_category: '',
        display_name: '',
        description: '',
        default_voting_rights: true,
        default_dividend_eligible: true,
        minimum_investment_multiplier: 1.0,
        maximum_holding_multiplier: null,
        priority_order: 0
      });
      loadShareTypes();
    } catch (error) {
      console.error('Error creating share type:', error);
      toast.error('Failed to create share type');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShareType = async (typeConfig: ShareTypeConfig) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('share_type_configurations')
        .update(typeConfig)
        .eq('id', typeConfig.id);

      if (error) throw error;
      
      toast.success('Share type updated successfully');
      setEditingType(null);
      loadShareTypes();
    } catch (error) {
      console.error('Error updating share type:', error);
      toast.error('Failed to update share type');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShareSettings = async () => {
    if (!shareData) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('shares')
        .update({
          share_type: shareSettingsForm.share_type,
          share_category: shareSettingsForm.share_category,
          minimum_investment: shareSettingsForm.minimum_investment,
          maximum_individual_holding: shareSettingsForm.maximum_individual_holding,
          voting_rights: shareSettingsForm.voting_rights,
          dividend_eligible: shareSettingsForm.dividend_eligible,
          transfer_restrictions: shareSettingsForm.transfer_restrictions,
          updated_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      if (error) throw error;
      
      toast.success('Share settings updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Error updating share settings:', error);
      toast.error('Failed to update share settings');
    } finally {
      setLoading(false);
    }
  };

  const shareTypeOptions = ['common', 'preferred', 'restricted', 'bonus', 'rights'];
  const shareCategoryOptions = ['general', 'vip', 'club', 'institutional', 'employee'];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configure">Type Configurations</TabsTrigger>
          <TabsTrigger value="assign">Assign to Share Pool</TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Share Type Configurations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Create New Type Form */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Create New Share Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Share Type</Label>
                      <Select 
                        value={newTypeForm.share_type} 
                        onValueChange={(value) => setNewTypeForm(prev => ({ ...prev, share_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {shareTypeOptions.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Share Category</Label>
                      <Select 
                        value={newTypeForm.share_category} 
                        onValueChange={(value) => setNewTypeForm(prev => ({ ...prev, share_category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {shareCategoryOptions.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Display Name</Label>
                      <Input
                        value={newTypeForm.display_name}
                        onChange={(e) => setNewTypeForm(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="e.g., Premium Common Shares"
                      />
                    </div>
                    
                    <div>
                      <Label>Priority Order</Label>
                      <Input
                        type="number"
                        value={newTypeForm.priority_order}
                        onChange={(e) => setNewTypeForm(prev => ({ ...prev, priority_order: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newTypeForm.description}
                        onChange={(e) => setNewTypeForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe this share type..."
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newTypeForm.default_voting_rights}
                        onCheckedChange={(checked) => setNewTypeForm(prev => ({ ...prev, default_voting_rights: checked }))}
                      />
                      <Label>Default Voting Rights</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newTypeForm.default_dividend_eligible}
                        onCheckedChange={(checked) => setNewTypeForm(prev => ({ ...prev, default_dividend_eligible: checked }))}
                      />
                      <Label>Default Dividend Eligible</Label>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleCreateShareType} 
                    disabled={loading || !newTypeForm.share_type || !newTypeForm.share_category || !newTypeForm.display_name}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Share Type
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Types List */}
              <div className="space-y-4">
                {shareTypes.map((typeConfig) => (
                  <Card key={typeConfig.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      {editingType?.id === typeConfig.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Display Name</Label>
                              <Input
                                value={editingType.display_name}
                                onChange={(e) => setEditingType(prev => prev ? ({ ...prev, display_name: e.target.value }) : null)}
                              />
                            </div>
                            <div>
                              <Label>Priority Order</Label>
                              <Input
                                type="number"
                                value={editingType.priority_order}
                                onChange={(e) => setEditingType(prev => prev ? ({ ...prev, priority_order: parseInt(e.target.value) || 0 }) : null)}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateShareType(editingType)}>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingType(null)}>
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{typeConfig.display_name}</h3>
                              <Badge variant={typeConfig.is_active ? 'default' : 'secondary'}>
                                {typeConfig.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">{typeConfig.share_type}</span> • 
                              <span className="ml-1">{typeConfig.share_category}</span>
                            </div>
                            {typeConfig.description && (
                              <p className="text-sm text-muted-foreground">{typeConfig.description}</p>
                            )}
                            <div className="flex gap-4 text-sm">
                              <span className={typeConfig.default_voting_rights ? 'text-green-600' : 'text-red-600'}>
                                Voting: {typeConfig.default_voting_rights ? 'Yes' : 'No'}
                              </span>
                              <span className={typeConfig.default_dividend_eligible ? 'text-green-600' : 'text-red-600'}>
                                Dividends: {typeConfig.default_dividend_eligible ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingType(typeConfig)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assign" className="space-y-4">
          {/* Pool Quantity Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary">{shareData?.name}</Badge>
                Share Pool Quantities & Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shareData ? (
                <div className="space-y-6">
                  {/* Current Pool Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {shareData.total_shares?.toLocaleString() || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Shares</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {shareData.available_shares?.toLocaleString() || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Available</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {((shareData.total_shares - shareData.available_shares) || 0).toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Sold/Reserved</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {shareData.currency} {shareData.price_per_share?.toLocaleString() || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Current Price</p>
                    </div>
                  </div>

                  {/* Share Type & Category Assignment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Share Type</Label>
                      <Select 
                        value={shareSettingsForm.share_type} 
                        onValueChange={(value) => setShareSettingsForm(prev => ({ ...prev, share_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {shareTypeOptions.map(type => (
                            <SelectItem key={type} value={type}>
                              <div className="flex items-center gap-2">
                                <span>{type}</span>
                                <Badge variant="outline" className="text-xs">{type}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Share Category</Label>
                      <Select 
                        value={shareSettingsForm.share_category} 
                        onValueChange={(value) => setShareSettingsForm(prev => ({ ...prev, share_category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {shareCategoryOptions.map(category => (
                            <SelectItem key={category} value={category}>
                              <div className="flex items-center gap-2">
                                <span>{category}</span>
                                <Badge variant="secondary" className="text-xs">{category}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Investment Limits */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Minimum Investment ({shareData.currency})</Label>
                      <Input
                        type="number"
                        value={shareSettingsForm.minimum_investment}
                        onChange={(e) => setShareSettingsForm(prev => ({ ...prev, minimum_investment: parseFloat(e.target.value) || 0 }))}
                        placeholder="Minimum investment amount"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Minimum amount required to purchase this share type
                      </p>
                    </div>
                    
                    <div>
                      <Label>Maximum Individual Holding (shares)</Label>
                      <Input
                        type="number"
                        value={shareSettingsForm.maximum_individual_holding || ''}
                        onChange={(e) => setShareSettingsForm(prev => ({ 
                          ...prev, 
                          maximum_individual_holding: e.target.value ? parseFloat(e.target.value) : null 
                        }))}
                        placeholder="Maximum shares per person (optional)"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Maximum number of shares one person can own (leave empty for no limit)
                      </p>
                    </div>
                  </div>
                  
                  {/* Rights & Privileges */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Share Rights & Privileges</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={shareSettingsForm.voting_rights}
                          onCheckedChange={(checked) => setShareSettingsForm(prev => ({ ...prev, voting_rights: checked }))}
                        />
                        <div>
                          <Label>Voting Rights</Label>
                          <p className="text-xs text-muted-foreground">Can vote in company decisions</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={shareSettingsForm.dividend_eligible}
                          onCheckedChange={(checked) => setShareSettingsForm(prev => ({ ...prev, dividend_eligible: checked }))}
                        />
                        <div>
                          <Label>Dividend Eligible</Label>
                          <p className="text-xs text-muted-foreground">Receives dividend distributions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleUpdateShareSettings} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Update Share Settings
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">No share data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShareTypeManager;
