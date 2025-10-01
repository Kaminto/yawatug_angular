
import React from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TwoFactorSetup from '@/components/security/TwoFactorSetup';

const Security = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Security' }
  ];

  return (
    <UserLayout title="Security Settings" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">Manage your account security and privacy settings</p>
        </div>

        <Tabs defaultValue="2fa" className="space-y-4">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="2fa">Two-Factor Authentication</TabsTrigger>
          </TabsList>
          
          <TabsContent value="2fa">
            <TwoFactorSetup />
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
};

export default Security;
