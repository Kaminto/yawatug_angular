import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, AlertCircle, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProgramSettings {
  id: string;
  name: string;
  description: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  commission_rate: number;
}

const UnifiedProgramSettings = () => {
  const [settings, setSettings] = useState<ProgramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Yawatu Referral Program',
    description: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
    commission_rate: 5
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referral_programs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
        setFormData({
          name: data.name,
          description: data.description || '',
          valid_from: data.valid_from?.split('T')[0] || '',
          valid_until: data.valid_until?.split('T')[0] || '',
          is_active: data.is_active,
          commission_rate: (typeof data.commission_rate === 'string' ? parseFloat(data.commission_rate) : data.commission_rate) * 100
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load program settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate dates
      if (formData.valid_until && new Date(formData.valid_until) <= new Date(formData.valid_from)) {
        toast.error('End date must be after start date');
        return;
      }

      // Deactivate all existing programs
      await supabase
        .from('referral_programs')
        .update({ is_active: false })
        .eq('is_active', true);

      // Create or update the program
      const programData = {
        name: formData.name,
        description: formData.description,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        is_active: formData.is_active,
        commission_rate: formData.commission_rate / 100,
        currency: 'UGX'
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('referral_programs')
          .update(programData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('referral_programs')
          .insert([programData]);

        if (error) throw error;
      }

      toast.success('Program settings updated successfully');
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save program settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Referral Program Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure the global referral program. All users will be eligible for commissions 
            only during the specified time period. Commission rates apply to Level 1 direct referrals.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Program Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="E.g., Yawatu Referral Program 2025"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Program details and terms"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Program Start Date</Label>
              <Input
                id="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Users can start earning from this date
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Program End Date (Optional)</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                min={formData.valid_from}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no end date
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission_rate">Level 1 Commission Rate (%)</Label>
            <Input
              id="commission_rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.commission_rate}
              onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Commission rate for direct (Level 1) referrals
            </p>
          </div>

          <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <div className="flex-1">
              <Label htmlFor="is_active" className="cursor-pointer">Program is Active</Label>
              <p className="text-xs text-muted-foreground">
                {formData.is_active ? 'Users can earn commissions' : 'Program is paused - no new commissions'}
              </p>
            </div>
          </div>
        </div>

        {settings && (
          <div className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg">
            <strong>Current Program:</strong> {settings.name}
            <br />
            <strong>Status:</strong> {settings.is_active ? 'Active' : 'Inactive'}
            <br />
            <strong>Period:</strong> {new Date(settings.valid_from).toLocaleDateString()} 
            {settings.valid_until ? ` - ${new Date(settings.valid_until).toLocaleDateString()}` : ' (No end date)'}
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Program Settings'}
        </Button>

        <div className="space-y-2 text-sm text-muted-foreground border-t pt-4">
          <p className="font-semibold">How This Works:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Users can only earn commissions during the active program period</li>
            <li>Level 1 direct referrals earn cash commissions at the set rate</li>
            <li>Levels 2-5 network referrals earn credits (configured in Credit Settings)</li>
            <li>If program is inactive, no new commissions are generated</li>
            <li>Users see countdown timers showing when the program expires</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedProgramSettings;
