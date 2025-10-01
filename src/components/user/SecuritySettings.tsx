
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield } from 'lucide-react';
import PinSetup from '@/components/security/PinSetup';
import TwoFactorSetup from '@/components/security/TwoFactorSetup';
import BiometricSetup from '@/components/security/BiometricSetup';

const SecuritySettings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Security Settings</h1>
      </div>

      <Tabs defaultValue="pin" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pin">Transaction PIN</TabsTrigger>
          <TabsTrigger value="2fa">Two-Factor Auth</TabsTrigger>
          <TabsTrigger value="biometric">Biometric</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pin">
          <PinSetup />
        </TabsContent>
        
        <TabsContent value="2fa">
          <TwoFactorSetup />
        </TabsContent>
        
        <TabsContent value="biometric">
          <BiometricSetup />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecuritySettings;
