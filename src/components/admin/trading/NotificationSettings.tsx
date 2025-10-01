import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';

interface NotificationSettingsProps {
  settings: {
    id: string;
    email_notifications_enabled: boolean;
    sms_notifications_enabled: boolean;
    push_notifications_enabled: boolean;
    realtime_updates_enabled: boolean;
    queue_position_updates: boolean;
    price_change_notifications: boolean;
    transaction_completion_notifications: boolean;
    daily_summary_emails: boolean;
  };
  onUpdate: (settings: any) => Promise<void>;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ settings, onUpdate }) => {
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

  const notificationChannels = [
    {
      key: 'email_notifications_enabled',
      label: 'Email Notifications',
      description: 'Send notifications via email',
      icon: Mail
    },
    {
      key: 'sms_notifications_enabled',
      label: 'SMS Notifications',
      description: 'Send notifications via SMS',
      icon: MessageSquare
    },
    {
      key: 'push_notifications_enabled',
      label: 'Push Notifications',
      description: 'Browser and mobile push notifications',
      icon: Smartphone
    },
    {
      key: 'realtime_updates_enabled',
      label: 'Real-time Updates',
      description: 'Live updates in the application',
      icon: Bell
    }
  ];

  const notificationTypes = [
    {
      key: 'queue_position_updates',
      label: 'Queue Position Updates',
      description: 'Notify users about their position in sell queues'
    },
    {
      key: 'price_change_notifications',
      label: 'Price Change Notifications',
      description: 'Alert users when share prices change significantly'
    },
    {
      key: 'transaction_completion_notifications',
      label: 'Transaction Completion',
      description: 'Notify when transactions are completed'
    },
    {
      key: 'daily_summary_emails',
      label: 'Daily Summary Emails',
      description: 'Send daily activity summaries to users'
    }
  ];

  const getActiveChannelsCount = () => {
    return notificationChannels.filter(channel => formData[channel.key as keyof typeof formData]).length;
  };

  const getActiveTypesCount = () => {
    return notificationTypes.filter(type => formData[type.key as keyof typeof formData]).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">System Notification Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure how users receive notifications about trading activities
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">
            {getActiveChannelsCount()}/4 Channels Active
          </Badge>
          <Badge variant="outline">
            {getActiveTypesCount()}/4 Types Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Channels
            </CardTitle>
            <CardDescription>Choose how notifications are delivered</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificationChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div key={channel.key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>{channel.label}</Label>
                      <p className="text-xs text-muted-foreground">
                        {channel.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData[channel.key as keyof typeof formData] as boolean}
                    onCheckedChange={(checked) => updateField(channel.key, checked)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Types</CardTitle>
            <CardDescription>Choose what events trigger notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-center justify-between">
                <div>
                  <Label>{type.label}</Label>
                  <p className="text-xs text-muted-foreground">
                    {type.description}
                  </p>
                </div>
                <Switch
                  checked={formData[type.key as keyof typeof formData] as boolean}
                  onCheckedChange={(checked) => updateField(type.key, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Preview</CardTitle>
          <CardDescription>Current configuration summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{getActiveChannelsCount()}</div>
              <div className="text-xs text-muted-foreground">Active Channels</div>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{getActiveTypesCount()}</div>
              <div className="text-xs text-muted-foreground">Active Types</div>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">
                {formData.realtime_updates_enabled ? "Live" : "Batch"}
              </div>
              <div className="text-xs text-muted-foreground">Update Mode</div>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">
                {formData.daily_summary_emails ? "Daily" : "Event"}
              </div>
              <div className="text-xs text-muted-foreground">Email Mode</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};