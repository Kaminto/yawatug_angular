import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Plus, Trophy, Play, Calendar, Zap } from 'lucide-react';

interface DrawSettings {
  id: string;
  draw_frequency: 'daily' | 'weekly' | 'monthly';
  minimum_stake: number;
  maximum_stake?: number;
  auto_trigger_enabled: boolean;
  first_prize_percentage: number;
  second_prize_percentage: number;
  third_prize_percentage: number;
  is_active: boolean;
}

interface GrandDraw {
  id: string;
  draw_name: string;
  draw_type: string;
  draw_date: string;
  status: string;
  total_staked_credits: number;
  total_entries: number;
}

const DrawManagement = () => {
  const [settings, setSettings] = useState<DrawSettings | null>(null);
  const [draws, setDraws] = useState<GrandDraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDraw, setShowCreateDraw] = useState(false);
  const [newDrawName, setNewDrawName] = useState('');
  const [newDrawType, setNewDrawType] = useState<'daily' | 'weekly' | 'monthly' | 'special'>('weekly');
  const [newDrawDate, setNewDrawDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('draw_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      setSettings(settingsData as DrawSettings);

      // Load draws
      const { data: drawsData, error: drawsError } = await supabase
        .from('grand_draws')
        .select('*')
        .order('draw_date', { ascending: false })
        .limit(10);

      if (drawsError) throw drawsError;
      setDraws(drawsData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load draw data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await supabase
        .from('draw_settings')
        .update({ is_active: false })
        .eq('is_active', true);

      const { error } = await supabase
        .from('draw_settings')
        .insert({
          draw_frequency: settings.draw_frequency,
          minimum_stake: settings.minimum_stake,
          maximum_stake: settings.maximum_stake,
          auto_trigger_enabled: settings.auto_trigger_enabled,
          first_prize_percentage: settings.first_prize_percentage,
          second_prize_percentage: settings.second_prize_percentage,
          third_prize_percentage: settings.third_prize_percentage,
          is_active: true,
        });

      if (error) throw error;
      toast.success('Draw settings updated successfully');
      loadData();
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update draw settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDraw = async () => {
    if (!newDrawName || !newDrawDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('grand_draws')
        .insert({
          draw_name: newDrawName,
          draw_type: newDrawType,
          draw_date: newDrawDate,
          status: 'open',
          first_prize_percentage: settings?.first_prize_percentage || 50,
          second_prize_percentage: settings?.second_prize_percentage || 30,
          third_prize_percentage: settings?.third_prize_percentage || 20,
        });

      if (error) throw error;
      toast.success('Draw created successfully');
      setShowCreateDraw(false);
      setNewDrawName('');
      setNewDrawDate('');
      loadData();
    } catch (error: any) {
      console.error('Error creating draw:', error);
      toast.error('Failed to create draw');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerDraw = async (drawId: string) => {
    if (!confirm('Are you sure you want to trigger this draw? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-grand-draw', {
        body: { draw_id: drawId }
      });

      if (error) throw error;
      toast.success('Draw triggered successfully! Winners have been selected.');
      loadData();
    } catch (error: any) {
      console.error('Error triggering draw:', error);
      toast.error(error.message || 'Failed to trigger draw');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading draw management...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Draw Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Grand Draw Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Draw Frequency</Label>
              <Select
                value={settings?.draw_frequency || 'weekly'}
                onValueChange={(value: any) => setSettings(prev => prev ? { ...prev, draw_frequency: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Minimum Stake (Credits)</Label>
              <Input
                type="number"
                value={settings?.minimum_stake || 1}
                onChange={(e) => setSettings(prev => prev ? { ...prev, minimum_stake: parseInt(e.target.value) } : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Maximum Stake (Optional)</Label>
              <Input
                type="number"
                value={settings?.maximum_stake || ''}
                onChange={(e) => setSettings(prev => prev ? { ...prev, maximum_stake: e.target.value ? parseInt(e.target.value) : undefined } : null)}
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>1st Prize (%)</Label>
              <Input
                type="number"
                value={settings?.first_prize_percentage || 50}
                onChange={(e) => setSettings(prev => prev ? { ...prev, first_prize_percentage: parseFloat(e.target.value) } : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>2nd Prize (%)</Label>
              <Input
                type="number"
                value={settings?.second_prize_percentage || 30}
                onChange={(e) => setSettings(prev => prev ? { ...prev, second_prize_percentage: parseFloat(e.target.value) } : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>3rd Prize (%)</Label>
              <Input
                type="number"
                value={settings?.third_prize_percentage || 20}
                onChange={(e) => setSettings(prev => prev ? { ...prev, third_prize_percentage: parseFloat(e.target.value) } : null)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings?.auto_trigger_enabled || false}
                  onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, auto_trigger_enabled: checked } : null)}
                />
                <Label>Auto-trigger Draws</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings?.is_active || false}
                  onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, is_active: checked } : null)}
                />
                <Label>Enable Draw System</Label>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={saving || !settings}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create New Draw */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Manage Draws
            </CardTitle>
            <Button onClick={() => setShowCreateDraw(!showCreateDraw)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Draw
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCreateDraw && (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Draw Name</Label>
                  <Input
                    value={newDrawName}
                    onChange={(e) => setNewDrawName(e.target.value)}
                    placeholder="e.g., Weekly Draw #1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Draw Type</Label>
                  <Select value={newDrawType} onValueChange={(value: any) => setNewDrawType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Draw Date</Label>
                  <Input
                    type="datetime-local"
                    value={newDrawDate}
                    onChange={(e) => setNewDrawDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateDraw} disabled={saving}>
                  <Play className="h-4 w-4 mr-2" />
                  Create Draw
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDraw(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing Draws */}
          <div className="space-y-2">
            <h3 className="font-semibold">Recent Draws</h3>
            {draws.length === 0 ? (
              <p className="text-sm text-muted-foreground">No draws created yet</p>
            ) : (
              <div className="space-y-2">
                {draws.map((draw) => (
                  <div key={draw.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{draw.draw_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(draw.draw_date).toLocaleString()} • {draw.total_entries} entries • {draw.total_staked_credits} credits
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        draw.status === 'open' ? 'default' : 
                        draw.status === 'closed' ? 'secondary' : 
                        draw.status === 'drawn' ? 'outline' : 'destructive'
                      }>
                        {draw.status}
                      </Badge>
                      {(draw.status === 'open' || draw.status === 'closed') && (
                        <Button 
                          size="sm" 
                          onClick={() => handleTriggerDraw(draw.id)}
                          disabled={saving}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Trigger
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DrawManagement;
