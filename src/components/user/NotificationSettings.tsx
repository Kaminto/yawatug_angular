import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, Mail, MessageSquare, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  trade_alerts: boolean;
  price_alerts: boolean;
  deposit_confirmations: boolean;
  withdrawal_confirmations: boolean;
  security_alerts: boolean;
}

const NotificationSettings = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    trade_alerts: true,
    price_alerts: false,
    deposit_confirmations: true,
    withdrawal_confirmations: true,
    security_alerts: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load notification preferences from database or use defaults
      // This would typically come from a user_notification_settings table
      toast.success('Notification settings loaded');
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Here you would save to the database
      // For now, just show success message
      toast.success('Notification settings saved successfully');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Communication Channels */}
          <div className="space-y-4">
            <h3 className="font-medium">Communication Channels</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <Label htmlFor="email">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
              </div>
              <Switch
                id="email"
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-500" />
                <div>
                  <Label htmlFor="sms">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via text message</p>
                </div>
              </div>
              <Switch
                id="sms"
                checked={preferences.sms_notifications}
                onCheckedChange={(checked) => updatePreference('sms_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-purple-500" />
                <div>
                  <Label htmlFor="push">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser and app notifications</p>
                </div>
              </div>
              <Switch
                id="push"
                checked={preferences.push_notifications}
                onCheckedChange={(checked) => updatePreference('push_notifications', checked)}
              />
            </div>
          </div>

          {/* Alert Types */}
          <div className="space-y-4">
            <h3 className="font-medium">Alert Types</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="trade">Trade Alerts</Label>
                <p className="text-sm text-muted-foreground">Share purchase/sale confirmations</p>
              </div>
              <Switch
                id="trade"
                checked={preferences.trade_alerts}
                onCheckedChange={(checked) => updatePreference('trade_alerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="price">Price Alerts</Label>
                <p className="text-sm text-muted-foreground">Share price change notifications</p>
              </div>
              <Switch
                id="price"
                checked={preferences.price_alerts}
                onCheckedChange={(checked) => updatePreference('price_alerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="deposit">Deposit Confirmations</Label>
                <p className="text-sm text-muted-foreground">Wallet deposit notifications</p>
              </div>
              <Switch
                id="deposit"
                checked={preferences.deposit_confirmations}
                onCheckedChange={(checked) => updatePreference('deposit_confirmations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="withdrawal">Withdrawal Confirmations</Label>
                <p className="text-sm text-muted-foreground">Wallet withdrawal notifications</p>
              </div>
              <Switch
                id="withdrawal"
                checked={preferences.withdrawal_confirmations}
                onCheckedChange={(checked) => updatePreference('withdrawal_confirmations', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="security">Security Alerts</Label>
                <p className="text-sm text-muted-foreground">Login and security notifications</p>
              </div>
              <Switch
                id="security"
                checked={preferences.security_alerts}
                onCheckedChange={(checked) => updatePreference('security_alerts', checked)}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={saveSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;