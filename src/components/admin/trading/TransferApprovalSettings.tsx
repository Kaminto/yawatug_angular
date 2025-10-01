import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface TransferApprovalSettingsProps {
  settings: {
    id: string;
    is_enabled: boolean;
    auto_approve_under_amount: number;
    auto_approve_family_transfers: boolean;
    auto_approve_verified_users: boolean;
    require_manual_review_over_amount: number;
    max_daily_auto_approvals_per_user: number;
    cooling_period_between_transfers_hours: number;
  };
  onUpdate: (settings: any) => Promise<void>;
}

export const TransferApprovalSettings: React.FC<TransferApprovalSettingsProps> = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate(formData);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Switch
            checked={formData.is_enabled}
            onCheckedChange={(checked) => updateField('is_enabled', checked)}
          />
          <div>
            <Label className="text-base font-medium">Enable Auto-Approval</Label>
            <p className="text-sm text-muted-foreground">
              Automatically approve transfers based on predefined rules
            </p>
          </div>
        </div>
        <Badge variant={formData.is_enabled ? "default" : "secondary"}>
          {formData.is_enabled ? "Active" : "Inactive"}
        </Badge>
      </div>

      {formData.is_enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Auto-approval reduces processing time but requires careful configuration to maintain security. All auto-approved transfers are still logged and auditable.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Amount-Based Rules</CardTitle>
                <CardDescription>Auto-approval based on transfer amounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Auto-Approve Under (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.auto_approve_under_amount}
                    onChange={(e) => updateField('auto_approve_under_amount', Number(e.target.value))}
                    min="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Transfers below this amount are automatically approved
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Manual Review Over (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.require_manual_review_over_amount}
                    onChange={(e) => updateField('require_manual_review_over_amount', Number(e.target.value))}
                    min="100000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Transfers above this amount always require manual review
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User-Based Rules</CardTitle>
                <CardDescription>Auto-approval based on user characteristics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Family Transfers</Label>
                    <p className="text-xs text-muted-foreground">
                      Auto-approve transfers between family members
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_approve_family_transfers}
                    onCheckedChange={(checked) => updateField('auto_approve_family_transfers', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Verified Users</Label>
                    <p className="text-xs text-muted-foreground">
                      Auto-approve for fully verified users
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_approve_verified_users}
                    onCheckedChange={(checked) => updateField('auto_approve_verified_users', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Rate Limiting</CardTitle>
                <CardDescription>Prevent abuse with usage limits</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Daily Auto-Approvals per User</Label>
                  <Input
                    type="number"
                    value={formData.max_daily_auto_approvals_per_user}
                    onChange={(e) => updateField('max_daily_auto_approvals_per_user', Number(e.target.value))}
                    min="1"
                    max="20"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum auto-approved transfers per user per day
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Cooling Period (Hours)</Label>
                  <Input
                    type="number"
                    value={formData.cooling_period_between_transfers_hours}
                    onChange={(e) => updateField('cooling_period_between_transfers_hours', Number(e.target.value))}
                    min="1"
                    max="168"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum time between transfers for the same user
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};