import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, AlertTriangle, Calendar } from 'lucide-react';

interface TierEligibility {
  id: string;
  level: number;
  level_name: string;
  reward_type: string;
  eligibility_days: number | null;
  is_active: boolean;
}

const ProgramEligibilitySettings = () => {
  const [tiers, setTiers] = useState<TierEligibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load tier settings
      const { data: tierData, error: tierError } = await supabase
        .from('referral_tier_settings')
        .select('id, level, level_name, reward_type, eligibility_days, is_active')
        .order('level', { ascending: true });

      if (tierError) throw tierError;
      setTiers((tierData || []) as TierEligibility[]);

      // Count active users who are earning commissions
      const { count } = await supabase
        .from('referral_commissions')
        .select('referrer_id', { count: 'exact', head: true })
        .eq('status', 'pending');

      setActiveUsers(count || 0);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load eligibility settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTier = async (tierId: string, eligibilityDays: number | null) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('referral_tier_settings')
        .update({
          eligibility_days: eligibilityDays,
          updated_at: new Date().toISOString()
        })
        .eq('id', tierId);

      if (error) throw error;
      
      toast.success('Eligibility period updated successfully');
      loadData();
    } catch (error: any) {
      console.error('Error updating tier:', error);
      toast.error('Failed to update eligibility period');
    } finally {
      setSaving(false);
    }
  };

  const updateTierField = (id: string, days: string) => {
    setTiers(prev =>
      prev.map(tier =>
        tier.id === id 
          ? { ...tier, eligibility_days: days === '' ? null : parseInt(days) } 
          : tier
      )
    );
  };

  const getMaxEligibilityDays = () => {
    const activeDays = tiers
      .filter(t => t.is_active && t.eligibility_days !== null)
      .map(t => t.eligibility_days || 0);
    
    return activeDays.length > 0 ? Math.max(...activeDays) : null;
  };

  const maxDays = getMaxEligibilityDays();

  if (loading) {
    return <div className="animate-pulse">Loading eligibility settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950">
        <Calendar className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <div className="space-y-1">
            <strong>Program Eligibility Control:</strong>
            <div className="text-sm mt-2">
              Set time limits for how long users can earn commissions and credits from their referral network.
              Leave empty for unlimited eligibility.
            </div>
            {maxDays !== null && (
              <div className="text-sm mt-2 font-semibold">
                Current Maximum: {maxDays} days from user enrollment
              </div>
            )}
            <div className="text-sm mt-2">
              Active networkers: <strong>{activeUsers}</strong> users
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Setting or reducing eligibility periods will affect all users. 
          Users will see countdown timers on their referral dashboards showing when their commission eligibility expires.
          After expiry, they can no longer earn NEW commissions, but existing pending commissions will still be paid.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {tiers.map((tier) => (
          <Card key={tier.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {tier.level_name} (Level {tier.level})
              </CardTitle>
              <CardDescription>
                {tier.reward_type === 'cash_commission' 
                  ? 'Direct referral cash commission' 
                  : 'Network credit rewards'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Eligibility Period (Days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={tier.eligibility_days ?? ''}
                    onChange={(e) => updateTierField(tier.id, e.target.value)}
                    placeholder="Leave empty for unlimited"
                    disabled={!tier.is_active}
                  />
                  <p className="text-xs text-muted-foreground">
                    {tier.eligibility_days 
                      ? `Users can earn for ${tier.eligibility_days} days from enrollment`
                      : 'Unlimited - users can earn indefinitely'}
                  </p>
                </div>
                
                <Button 
                  onClick={() => handleUpdateTier(tier.id, tier.eligibility_days)} 
                  disabled={saving || !tier.is_active}
                  size="default"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Eligibility Period:</strong> The number of days from user enrollment during which they can earn commissions/credits
          </p>
          <p>
            • <strong>Countdown Timer:</strong> Users see real-time countdown on their referral dashboard
          </p>
          <p>
            • <strong>After Expiry:</strong> Users cannot earn NEW commissions, but existing pending/expected commissions will still be paid
          </p>
          <p>
            • <strong>Multiple Tiers:</strong> The longest eligibility period applies to the user's overall eligibility
          </p>
          <p>
            • <strong>Unlimited Option:</strong> Leave empty to allow users to earn indefinitely
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramEligibilitySettings;
