import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecuritySettings {
  auto_approval_enabled: boolean;
  auto_approval_threshold: number;
  require_mfa_for_large_transactions: boolean;
  large_transaction_threshold: number;
  max_daily_auto_approvals: number;
  suspicious_activity_monitoring: boolean;
  ip_whitelist_enabled: boolean;
  session_timeout_minutes: number;
}

const SecuritySettings: React.FC = () => {
  const [settings, setSettings] = useState<SecuritySettings>({
    auto_approval_enabled: false,
    auto_approval_threshold: 100000,
    require_mfa_for_large_transactions: true,
    large_transaction_threshold: 500000,
    max_daily_auto_approvals: 50,
    suspicious_activity_monitoring: true,
    ip_whitelist_enabled: false,
    session_timeout_minutes: 60
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_global_settings')
        .select('*')
        .in('setting_key', [
          'auto_approval_enabled',
          'auto_approval_threshold',
          'require_mfa_for_large_transactions',
          'large_transaction_threshold',
          'max_daily_auto_approvals',
          'suspicious_activity_monitoring',
          'ip_whitelist_enabled',
          'session_timeout_minutes'
        ]);

      if (error) throw error;

      const settingsMap = data?.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as any) || {};

      setSettings({
        auto_approval_enabled: settingsMap.auto_approval_enabled === 'true',
        auto_approval_threshold: parseInt(settingsMap.auto_approval_threshold || '100000'),
        require_mfa_for_large_transactions: settingsMap.require_mfa_for_large_transactions !== 'false',
        large_transaction_threshold: parseInt(settingsMap.large_transaction_threshold || '500000'),
        max_daily_auto_approvals: parseInt(settingsMap.max_daily_auto_approvals || '50'),
        suspicious_activity_monitoring: settingsMap.suspicious_activity_monitoring !== 'false',
        ip_whitelist_enabled: settingsMap.ip_whitelist_enabled === 'true',
        session_timeout_minutes: parseInt(settingsMap.session_timeout_minutes || '60')
      });
    } catch (error: any) {
      console.error('Error loading security settings:', error);
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSecuritySettings = async () => {
    setSaving(true);
    try {
      const settingsToUpdate = [
        { setting_key: 'auto_approval_enabled', setting_value: settings.auto_approval_enabled.toString() },
        { setting_key: 'auto_approval_threshold', setting_value: settings.auto_approval_threshold.toString() },
        { setting_key: 'require_mfa_for_large_transactions', setting_value: settings.require_mfa_for_large_transactions.toString() },
        { setting_key: 'large_transaction_threshold', setting_value: settings.large_transaction_threshold.toString() },
        { setting_key: 'max_daily_auto_approvals', setting_value: settings.max_daily_auto_approvals.toString() },
        { setting_key: 'suspicious_activity_monitoring', setting_value: settings.suspicious_activity_monitoring.toString() },
        { setting_key: 'ip_whitelist_enabled', setting_value: settings.ip_whitelist_enabled.toString() },
        { setting_key: 'session_timeout_minutes', setting_value: settings.session_timeout_minutes.toString() }
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('wallet_global_settings')
          .upsert(setting, { onConflict: 'setting_key' });
        
        if (error) throw error;
      }

      toast.success('Security settings updated successfully');
    } catch (error: any) {
      console.error('Error saving security settings:', error);
      toast.error('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SecuritySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Security Settings
          </h2>
          <p className="text-muted-foreground">
            Configure security policies and authentication requirements
          </p>
        </div>
        <Button onClick={saveSecuritySettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Transaction Approval Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transaction Approval Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-approval">Enable Auto-Approval</Label>
              <p className="text-sm text-muted-foreground">
                Automatically approve transactions below threshold
              </p>
            </div>
            <Switch
              id="auto-approval"
              checked={settings.auto_approval_enabled}
              onCheckedChange={(checked) => updateSetting('auto_approval_enabled', checked)}
            />
          </div>

          {settings.auto_approval_enabled && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="auto-threshold">Auto-Approval Threshold (UGX)</Label>
                  <Input
                    id="auto-threshold"
                    type="number"
                    value={settings.auto_approval_threshold}
                    onChange={(e) => updateSetting('auto_approval_threshold', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="daily-limit">Max Daily Auto-Approvals</Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    value={settings.max_daily_auto_approvals}
                    onChange={(e) => updateSetting('max_daily_auto_approvals', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Transactions above the threshold will require manual admin approval
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Multi-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Multi-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="mfa-large">Require MFA for Large Transactions</Label>
              <p className="text-sm text-muted-foreground">
                Additional verification for high-value transactions
              </p>
            </div>
            <Switch
              id="mfa-large"
              checked={settings.require_mfa_for_large_transactions}
              onCheckedChange={(checked) => updateSetting('require_mfa_for_large_transactions', checked)}
            />
          </div>

          {settings.require_mfa_for_large_transactions && (
            <>
              <Separator />
              <div>
                <Label htmlFor="large-threshold">Large Transaction Threshold (UGX)</Label>
                <Input
                  id="large-threshold"
                  type="number"
                  value={settings.large_transaction_threshold}
                  onChange={(e) => updateSetting('large_transaction_threshold', parseInt(e.target.value) || 0)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="suspicious-monitoring">Suspicious Activity Monitoring</Label>
              <p className="text-sm text-muted-foreground">
                Monitor and flag potentially fraudulent transactions
              </p>
            </div>
            <Switch
              id="suspicious-monitoring"
              checked={settings.suspicious_activity_monitoring}
              onCheckedChange={(checked) => updateSetting('suspicious_activity_monitoring', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ip-whitelist">IP Whitelist Protection</Label>
              <p className="text-sm text-muted-foreground">
                Restrict admin access to approved IP addresses
              </p>
            </div>
            <Switch
              id="ip-whitelist"
              checked={settings.ip_whitelist_enabled}
              onCheckedChange={(checked) => updateSetting('ip_whitelist_enabled', checked)}
            />
          </div>

          <div>
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input
              id="session-timeout"
              type="number"
              value={settings.session_timeout_minutes}
              onChange={(e) => updateSetting('session_timeout_minutes', parseInt(e.target.value) || 60)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Security Status */}
      <Card>
        <CardHeader>
          <CardTitle>Security Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant={settings.auto_approval_enabled ? "default" : "secondary"}>
                Auto-Approval
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {settings.auto_approval_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="text-center">
              <Badge variant={settings.require_mfa_for_large_transactions ? "default" : "secondary"}>
                MFA Required
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Large Transactions
              </p>
            </div>
            <div className="text-center">
              <Badge variant={settings.suspicious_activity_monitoring ? "default" : "secondary"}>
                Monitoring
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Activity Tracking
              </p>
            </div>
            <div className="text-center">
              <Badge variant={settings.ip_whitelist_enabled ? "default" : "secondary"}>
                IP Protection
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Access Control
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;