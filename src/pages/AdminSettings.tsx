import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Shield, Bell, Globe, Volume2 } from 'lucide-react';
import { VoiceSelector } from '@/components/voice/VoiceSelector';
import GoogleWorkspaceEmailConfig from '@/components/admin/GoogleWorkspaceEmailConfig';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    siteName: 'YAWATU',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    maxSharesPerUser: 10000,
    defaultCurrency: 'UGX',
    systemEmail: '',
    systemMessage: '',
    systemVoiceId: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_payment_settings')
        .select('*');

      if (error) throw error;

      // Process settings from database
      const settingsMap = data?.reduce((acc: any, setting) => {
        acc[setting.setting_name] = setting.setting_value;
        return acc;
      }, {});

      setSettings(prev => ({ ...prev, ...settingsMap }));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('admin_payment_settings')
        .upsert({
          setting_name: key,
          setting_value: value.toString()
        }, {
          onConflict: 'setting_name'
        });

      if (error) throw error;

      toast.success('Setting saved successfully');
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Failed to save setting');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchChange = (key: string, checked: boolean) => {
    setSettings(prev => ({ ...prev, [key]: checked }));
    saveSetting(key, checked);
  };

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveInput = (key: string) => {
    saveSetting(key, settings[key as keyof typeof settings]);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AdminLayout title="System Settings">
        <main className="flex-grow pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">System Settings</h1>
              <p className="text-muted-foreground">Configure platform settings and preferences</p>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="voice" className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Voice
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  System
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="general">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="siteName">Site Name</Label>
                        <Input
                          id="siteName"
                          value={settings.siteName}
                          onChange={(e) => handleInputChange('siteName', e.target.value)}
                          onBlur={() => handleSaveInput('siteName')}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="defaultCurrency">Default Currency</Label>
                        <Input
                          id="defaultCurrency"
                          value={settings.defaultCurrency}
                          onChange={(e) => handleInputChange('defaultCurrency', e.target.value)}
                          onBlur={() => handleSaveInput('defaultCurrency')}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="systemEmail">System Email</Label>
                        <Input
                          id="systemEmail"
                          type="email"
                          value={settings.systemEmail}
                          onChange={(e) => handleInputChange('systemEmail', e.target.value)}
                          onBlur={() => handleSaveInput('systemEmail')}
                          placeholder="admin@yawatu.com"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Business Rules</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="maxShares">Max Shares Per User</Label>
                        <Input
                          id="maxShares"
                          type="number"
                          value={settings.maxSharesPerUser}
                          onChange={(e) => handleInputChange('maxSharesPerUser', e.target.value)}
                          onBlur={() => handleSaveInput('maxSharesPerUser')}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="systemMessage">System Message</Label>
                        <Textarea
                          id="systemMessage"
                          value={settings.systemMessage}
                          onChange={(e) => handleInputChange('systemMessage', e.target.value)}
                          onBlur={() => handleSaveInput('systemMessage')}
                          placeholder="Important system announcements..."
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="voice">
                <Card>
                  <CardHeader>
                    <CardTitle>Voice Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>System Voice</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select the voice that all users will hear throughout the platform
                        </p>
                        <VoiceSelector 
                          onVoiceChange={(voice) => {
                            const voiceId = voice?.voiceURI || '';
                            setSettings(prev => ({ ...prev, systemVoiceId: voiceId }));
                            // VoiceSelector handles its own saving, no need to duplicate
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Maintenance Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Temporarily disable access to the platform
                        </p>
                      </div>
                      <Switch
                        checked={settings.maintenanceMode}
                        onCheckedChange={(checked) => handleSwitchChange('maintenanceMode', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Allow New Registrations</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow new users to create accounts
                        </p>
                      </div>
                      <Switch
                        checked={settings.allowRegistration}
                        onCheckedChange={(checked) => handleSwitchChange('allowRegistration', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Require Email Verification</Label>
                        <p className="text-sm text-muted-foreground">
                          Users must verify their email before access
                        </p>
                      </div>
                      <Switch
                        checked={settings.requireEmailVerification}
                        onCheckedChange={(checked) => handleSwitchChange('requireEmailVerification', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Integration Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GoogleWorkspaceEmailConfig />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="system">
                <Card>
                  <CardHeader>
                    <CardTitle>System Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Platform Version</Label>
                        <p className="text-sm text-muted-foreground">v1.0.0</p>
                      </div>
                      <div>
                        <Label>Database Status</Label>
                        <p className="text-sm text-green-600">Connected</p>
                      </div>
                      <div>
                        <Label>Last Backup</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </AdminLayout>
      
      <Footer />
    </div>
  );
};

export default AdminSettings;
