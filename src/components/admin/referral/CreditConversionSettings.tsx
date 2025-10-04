import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Repeat } from 'lucide-react';

interface ConversionSettings {
  id: string;
  shares_per_credit: number;
  minimum_conversion_amount: number;
  is_active: boolean;
}

const CreditConversionSettings = () => {
  const [settings, setSettings] = useState<ConversionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_conversion_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSettings(data);
    } catch (error: any) {
      console.error('Error loading conversion settings:', error);
      toast.error('Failed to load conversion settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      // Deactivate all existing settings
      await supabase
        .from('credit_conversion_settings')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new settings
      const { error } = await supabase
        .from('credit_conversion_settings')
        .insert({
          shares_per_credit: settings.shares_per_credit,
          minimum_conversion_amount: settings.minimum_conversion_amount,
          is_active: true,
        });

      if (error) throw error;
      toast.success('Conversion settings updated successfully');
      loadSettings();
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update conversion settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading conversion settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Credit to Share Conversion Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Shares per Credit</Label>
            <Input
              type="number"
              value={settings?.shares_per_credit || 1}
              onChange={(e) => setSettings(prev => prev ? { ...prev, shares_per_credit: parseInt(e.target.value) } : null)}
            />
            <p className="text-xs text-muted-foreground">
              How many shares equals 1 credit when converting
            </p>
          </div>

          <div className="space-y-2">
            <Label>Minimum Conversion Amount</Label>
            <Input
              type="number"
              value={settings?.minimum_conversion_amount || 10}
              onChange={(e) => setSettings(prev => prev ? { ...prev, minimum_conversion_amount: parseInt(e.target.value) } : null)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum credits required to convert to shares
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings?.is_active || false}
              onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, is_active: checked } : null)}
            />
            <Label>Enable Conversions</Label>
          </div>

          <Button onClick={handleSave} disabled={saving || !settings}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditConversionSettings;
