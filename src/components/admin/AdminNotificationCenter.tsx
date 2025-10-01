import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Mail, 
  Phone, 
  Settings, 
  Users, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  TrendingUp,
  Database,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationRule {
  id: string;
  notification_type: string;
  enabled: boolean;
  threshold_value?: number;
  email_enabled: boolean;
  push_enabled: boolean;
}

interface SystemAlert {
  id: string;
  type: 'user_pending' | 'verification_needed' | 'system_health' | 'bulk_operation';
  title: string;
  message: string;
  count?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action_url?: string;
}

const AdminNotificationCenter = () => {
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotificationData();
    setupRealTimeAlerts();
  }, []);

  const loadNotificationData = async () => {
    try {
      setLoading(true);
      
      // Load notification preferences
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rules, error: rulesError } = await supabase
        .from('admin_notification_preferences')
        .select('*')
        .eq('admin_id', user.id);

      if (rulesError) throw rulesError;

      // Create default rules if none exist
      if (!rules || rules.length === 0) {
        await createDefaultNotificationRules(user.id);
        loadNotificationData();
        return;
      }

      setNotificationRules(rules);

      // Load current system alerts
      await loadSystemAlerts();
    } catch (error) {
      console.error('Error loading notification data:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultNotificationRules = async (adminId: string) => {
    const defaultRules = [
      {
        admin_id: adminId,
        notification_type: 'pending_verifications',
        threshold_value: 5,
        enabled: true,
        email_enabled: true,
        push_enabled: true
      },
      {
        admin_id: adminId,
        notification_type: 'pending_transactions',
        threshold_value: 10,
        enabled: true,
        email_enabled: true,
        push_enabled: false
      },
      {
        admin_id: adminId,
        notification_type: 'new_registrations',
        threshold_value: 20,
        enabled: true,
        email_enabled: false,
        push_enabled: true
      },
      {
        admin_id: adminId,
        notification_type: 'system_health',
        threshold_value: 95,
        enabled: true,
        email_enabled: true,
        push_enabled: true
      }
    ];

    const { error } = await supabase
      .from('admin_notification_preferences')
      .insert(defaultRules);

    if (error) throw error;
  };

  const loadSystemAlerts = async () => {
    try {
      // Load various system metrics to generate alerts
      const [
        pendingVerifications,
        pendingTransactions,
        newRegistrations,
        systemHealth
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'pending_verification'),
        supabase.from('transactions').select('id', { count: 'exact' }).eq('approval_status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        // System health would come from actual monitoring - using placeholder
        Promise.resolve({ data: null, count: 98 })
      ]);

      const alerts: SystemAlert[] = [];

      // Check against notification thresholds
      const pendingVerificationThreshold = notificationRules.find(r => r.notification_type === 'pending_verifications')?.threshold_value || 5;
      if ((pendingVerifications.count || 0) >= pendingVerificationThreshold) {
        alerts.push({
          id: 'pending_verifications',
          type: 'verification_needed',
          title: 'High Volume of Pending Verifications',
          message: `${pendingVerifications.count} users are waiting for verification`,
          count: pendingVerifications.count || 0,
          severity: (pendingVerifications.count || 0) > 20 ? 'high' : 'medium',
          action_url: '/admin/users?tab=verification'
        });
      }

      const pendingTransactionThreshold = notificationRules.find(r => r.notification_type === 'pending_transactions')?.threshold_value || 10;
      if ((pendingTransactions.count || 0) >= pendingTransactionThreshold) {
        alerts.push({
          id: 'pending_transactions',
          type: 'user_pending',
          title: 'Pending Transaction Approvals',
          message: `${pendingTransactions.count} transactions require approval`,
          count: pendingTransactions.count || 0,
          severity: (pendingTransactions.count || 0) > 50 ? 'high' : 'medium',
          action_url: '/admin/wallet-approvals'
        });
      }

      const newRegistrationThreshold = notificationRules.find(r => r.notification_type === 'new_registrations')?.threshold_value || 20;
      if ((newRegistrations.count || 0) >= newRegistrationThreshold) {
        alerts.push({
          id: 'new_registrations',
          type: 'user_pending',
          title: 'High Registration Volume',
          message: `${newRegistrations.count} new users registered in the last 24 hours`,
          count: newRegistrations.count || 0,
          severity: 'low',
          action_url: '/admin/users'
        });
      }

      const systemHealthThreshold = notificationRules.find(r => r.notification_type === 'system_health')?.threshold_value || 95;
      if ((systemHealth.count || 100) < systemHealthThreshold) {
        alerts.push({
          id: 'system_health',
          type: 'system_health',
          title: 'System Health Warning',
          message: `System health is at ${systemHealth.count}%, below threshold of ${systemHealthThreshold}%`,
          severity: (systemHealth.count || 100) < 90 ? 'critical' : 'high',
          action_url: '/admin/system-health'
        });
      }

      setSystemAlerts(alerts);
    } catch (error) {
      console.error('Error loading system alerts:', error);
    }
  };

  const setupRealTimeAlerts = () => {
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        loadSystemAlerts();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions'
      }, () => {
        loadSystemAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateNotificationRule = async (ruleId: string, updates: Partial<NotificationRule>) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('admin_notification_preferences')
        .update(updates)
        .eq('id', ruleId);

      if (error) throw error;

      setNotificationRules(prev => 
        prev.map(rule => 
          rule.id === ruleId ? { ...rule, ...updates } : rule
        )
      );

      toast.success('Notification settings updated');
      loadSystemAlerts(); // Refresh alerts with new thresholds
    } catch (error) {
      console.error('Error updating notification rule:', error);
      toast.error('Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <TrendingUp className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse">Loading notification center...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Active System Alerts ({systemAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemAlerts.length > 0 ? (
            <div className="space-y-3">
              {systemAlerts.map((alert) => (
                <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm mt-1">{alert.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alert.count && (
                        <Badge variant="outline">{alert.count}</Badge>
                      )}
                      {alert.action_url && (
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p>No active alerts - all systems normal</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rules" className="space-y-4">
            <TabsList>
              <TabsTrigger value="rules">Notification Rules</TabsTrigger>
              <TabsTrigger value="channels">Delivery Channels</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="space-y-4">
              {notificationRules.map((rule) => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium capitalize">
                        {rule.notification_type.replace('_', ' ')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified when thresholds are exceeded
                      </p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) => 
                        updateNotificationRule(rule.id, { enabled })
                      }
                      disabled={saving}
                    />
                  </div>

                  {rule.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Threshold</Label>
                        <Input
                          type="number"
                          value={rule.threshold_value || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            updateNotificationRule(rule.id, { 
                              threshold_value: isNaN(value) ? undefined : value 
                            });
                          }}
                          placeholder="Enter threshold"
                          disabled={saving}
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={rule.email_enabled}
                            onCheckedChange={(email_enabled) => 
                              updateNotificationRule(rule.id, { email_enabled })
                            }
                            disabled={saving}
                          />
                          <Label className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            Email
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={rule.push_enabled}
                            onCheckedChange={(push_enabled) => 
                              updateNotificationRule(rule.id, { push_enabled })
                            }
                            disabled={saving}
                          />
                          <Label className="flex items-center gap-1">
                            <Bell className="h-4 w-4" />
                            Push
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="channels" className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Notification delivery channels can be configured in your account settings.
                  Email notifications require a verified email address.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium">Email Notifications</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Receive detailed notifications via email
                  </p>
                  <Button variant="outline" size="sm">
                    Configure Email Settings
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium">SMS Notifications</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Critical alerts via SMS (premium feature)
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">
                {systemAlerts.find(a => a.id === 'pending_verifications')?.count || 0}
              </p>
              <p className="text-sm text-muted-foreground">Pending Verifications</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">
                {systemAlerts.find(a => a.id === 'pending_transactions')?.count || 0}
              </p>
              <p className="text-sm text-muted-foreground">Pending Approvals</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">
                {systemAlerts.find(a => a.id === 'new_registrations')?.count || 0}
              </p>
              <p className="text-sm text-muted-foreground">New Users (24h)</p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Shield className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">98%</p>
              <p className="text-sm text-muted-foreground">System Health</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotificationCenter;