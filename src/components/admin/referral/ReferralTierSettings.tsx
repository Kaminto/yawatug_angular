import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Award } from 'lucide-react';

interface TierSetting {
  id: string;
  level: number;
  level_name: string;
  reward_type: 'cash_commission' | 'credits';
  commission_percentage?: number;
  shares_per_credit_trigger?: number;
  credits_per_trigger?: number;
  kyc_completion_required: number;
  eligibility_days?: number;
  is_active: boolean;
}

const ReferralTierSettings = () => {
  const [tierSettings, setTierSettings] = useState<TierSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTierSettings();
  }, []);

  const loadTierSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_tier_settings')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      setTierSettings((data || []) as TierSetting[]);
    } catch (error: any) {
      console.error('Error loading tier settings:', error);
      toast.error('Failed to load tier settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (tier: TierSetting) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('referral_tier_settings')
        .update({
          level_name: tier.level_name,
          commission_percentage: tier.commission_percentage,
          shares_per_credit_trigger: tier.shares_per_credit_trigger,
          credits_per_trigger: tier.credits_per_trigger,
          kyc_completion_required: tier.kyc_completion_required,
          eligibility_days: tier.eligibility_days,
          is_active: tier.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tier.id);

      if (error) throw error;
      toast.success('Tier settings updated successfully');
      loadTierSettings();
    } catch (error: any) {
      console.error('Error updating tier:', error);
      toast.error('Failed to update tier settings');
    } finally {
      setSaving(false);
    }
  };

  const updateTierField = (id: string, field: string, value: any) => {
    setTierSettings(prev =>
      prev.map(tier =>
        tier.id === id ? { ...tier, [field]: value } : tier
      )
    );
  };

  if (loading) {
    return <div className="animate-pulse">Loading tier settings...</div>;
  }

  return (
    <div className="space-y-6">
      {tierSettings.map((tier) => (
        <Card key={tier.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Level {tier.level}: {tier.level_name}
              </CardTitle>
              <Switch
                checked={tier.is_active}
                onCheckedChange={(checked) => updateTierField(tier.id, 'is_active', checked)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tier Name</Label>
                <Input
                  value={tier.level_name}
                  onChange={(e) => updateTierField(tier.id, 'level_name', e.target.value)}
                  placeholder="e.g., Direct Referral Commission"
                />
              </div>

              {tier.reward_type === 'cash_commission' ? (
                <div className="space-y-2">
                  <Label>Commission Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={tier.commission_percentage || 0}
                    onChange={(e) => updateTierField(tier.id, 'commission_percentage', parseFloat(e.target.value))}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Shares per Credit Trigger</Label>
                    <Input
                      type="number"
                      value={tier.shares_per_credit_trigger || 0}
                      onChange={(e) => updateTierField(tier.id, 'shares_per_credit_trigger', parseInt(e.target.value))}
                      placeholder="e.g., 10 shares"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Credits per Trigger</Label>
                    <Input
                      type="number"
                      value={tier.credits_per_trigger || 0}
                      onChange={(e) => updateTierField(tier.id, 'credits_per_trigger', parseInt(e.target.value))}
                      placeholder="e.g., 1 credit"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>KYC Completion Required (%)</Label>
                <Input
                  type="number"
                  value={tier.kyc_completion_required}
                  onChange={(e) => updateTierField(tier.id, 'kyc_completion_required', parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Eligibility Period (Days)</Label>
                <Input
                  type="number"
                  value={tier.eligibility_days || ''}
                  onChange={(e) => updateTierField(tier.id, 'eligibility_days', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <Button onClick={() => handleUpdate(tier)} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReferralTierSettings;
