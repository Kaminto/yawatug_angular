import React from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Shield, Bell, Palette } from 'lucide-react';
import SecuritySettings from '@/components/user/SecuritySettings';
import NotificationSettings from '@/components/user/NotificationSettings';
import AppearanceSettings from '@/components/user/AppearanceSettings';

const Settings = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings' }
  ];

  return (
    <UnifiedLayout title="Settings" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Account Settings</h1>
        </div>

        <Tabs defaultValue="security" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>
          
          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
          
          <TabsContent value="appearance">
            <AppearanceSettings />
          </TabsContent>
        </Tabs>
      </div>
    </UnifiedLayout>
  );
};

export default Settings;