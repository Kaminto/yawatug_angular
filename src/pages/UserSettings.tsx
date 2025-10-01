import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { MobileBottomPadding } from '@/components/layout/MobileBottomPadding';
import { useUser } from '@/providers/UserProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Settings, 
  Bell, 
  Eye,
  Moon,
  Sun,
  Globe,
  Shield,
  Smartphone,
  Mail,
  AlertTriangle,
  Save,
  Download,
  Trash2
} from 'lucide-react';

interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  transaction_alerts: boolean;
  dividend_notifications: boolean;
  price_alerts: boolean;
}

interface PrivacySettings {
  profile_visibility: string;
  show_portfolio_value: boolean;
  show_transaction_history: boolean;
  data_sharing: boolean;
}

const UserSettings = () => {
  const { user, userProfile } = useUser();
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('UGX');
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    sms_notifications: true,
    push_notifications: true,
    marketing_emails: false,
    transaction_alerts: true,
    dividend_notifications: true,
    price_alerts: false
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profile_visibility: 'private',
    show_portfolio_value: false,
    show_transaction_history: false,
    data_sharing: false
  });

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings' }
  ];

  useEffect(() => {
    loadUserSettings();
  }, [user?.id]);

  const loadUserSettings = async () => {
    if (!user?.id) return;

    try {
      // Load user preferences from database or localStorage
      const savedTheme = localStorage.getItem('theme') || 'system';
      const savedLanguage = localStorage.getItem('language') || 'en';
      const savedCurrency = localStorage.getItem('currency') || 'UGX';

      setTheme(savedTheme);
      setLanguage(savedLanguage);
      setCurrency(savedCurrency);

      // In a real app, you'd load notification and privacy settings from the database
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Save to localStorage (in a real app, you'd save to database)
      localStorage.setItem('theme', theme);
      localStorage.setItem('language', language);
      localStorage.setItem('currency', currency);

      // Apply theme
      applyTheme(theme);

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (selectedTheme: string) => {
    const root = window.document.documentElement;
    
    if (selectedTheme === 'dark') {
      root.classList.add('dark');
    } else if (selectedTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: any) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
  };

  const handleExportData = () => {
    toast.info('Data export feature coming soon');
  };

  const handleDeleteAccount = () => {
    toast.error('Account deletion must be requested through support');
  };

  return (
    <UserLayout title="Settings" breadcrumbs={breadcrumbs}>
      <MobileBottomPadding>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account preferences and privacy settings
              </p>
            </div>
            <Button onClick={handleSaveSettings} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-yawatu-gold" />
                    General Preferences
                  </CardTitle>
                  <CardDescription>
                    Customize your app experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center">
                        <Moon className="h-4 w-4 mr-2" />
                        Theme
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Choose your preferred color scheme
                      </p>
                    </div>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center">
                            <Sun className="h-4 w-4 mr-2" />
                            Light
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center">
                            <Moon className="h-4 w-4 mr-2" />
                            Dark
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center">
                            <Smartphone className="h-4 w-4 mr-2" />
                            System
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Language
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Select your preferred language
                      </p>
                    </div>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sw">Swahili</SelectItem>
                        <SelectItem value="lg">Luganda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Default Currency</Label>
                      <p className="text-sm text-muted-foreground">
                        Primary currency for display
                      </p>
                    </div>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UGX">UGX</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Control how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Email Notifications */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Notifications
                    </h4>
                    
                    <div className="space-y-3">
                      {[
                        { key: 'email_notifications' as const, label: 'Email notifications', desc: 'Receive general notifications via email' },
                        { key: 'transaction_alerts' as const, label: 'Transaction alerts', desc: 'Get notified about your transactions' },
                        { key: 'dividend_notifications' as const, label: 'Dividend notifications', desc: 'Receive dividend payment notifications' },
                        { key: 'marketing_emails' as const, label: 'Marketing emails', desc: 'Receive promotional content and updates' },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>{label}</Label>
                            <p className="text-sm text-muted-foreground">{desc}</p>
                          </div>
                          <Switch
                            checked={notifications[key]}
                            onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SMS Notifications */}
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center">
                      <Smartphone className="h-4 w-4 mr-2" />
                      SMS & Push Notifications
                    </h4>
                    
                    <div className="space-y-3">
                      {[
                        { key: 'sms_notifications' as const, label: 'SMS notifications', desc: 'Receive important updates via SMS' },
                        { key: 'push_notifications' as const, label: 'Push notifications', desc: 'Get notifications on your device' },
                        { key: 'price_alerts' as const, label: 'Price alerts', desc: 'Get notified about share price changes' },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>{label}</Label>
                            <p className="text-sm text-muted-foreground">{desc}</p>
                          </div>
                          <Switch
                            checked={notifications[key]}
                            onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>
                    Control what information is visible to others
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Profile Visibility</Label>
                      <p className="text-sm text-muted-foreground">
                        Who can see your profile information
                      </p>
                    </div>
                    <Select
                      value={privacy.profile_visibility}
                      onValueChange={(value) => handlePrivacyChange('profile_visibility', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="contacts">Contacts Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'show_portfolio_value' as const, label: 'Show portfolio value', desc: 'Display your total portfolio value to others' },
                      { key: 'show_transaction_history' as const, label: 'Show transaction history', desc: 'Make your transaction history visible' },
                      { key: 'data_sharing' as const, label: 'Data sharing', desc: 'Allow anonymized data sharing for analytics' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>{label}</Label>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>
                        <Switch
                          checked={privacy[key] as boolean}
                          onCheckedChange={(checked) => handlePrivacyChange(key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-yawatu-gold" />
                    Account Management
                  </CardTitle>
                  <CardDescription>
                    Manage your account data and security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">Export Your Data</h4>
                        <p className="text-sm text-muted-foreground">
                          Download a copy of your account data
                        </p>
                      </div>
                      <Button variant="outline" onClick={handleExportData}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">Account Status</h4>
                        <p className="text-sm text-muted-foreground">
                          Current verification status
                        </p>
                      </div>
                      <Badge variant={userProfile?.is_verified ? 'default' : 'secondary'}>
                        {userProfile?.is_verified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Danger Zone:</strong> The following actions cannot be undone.
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-red-900 dark:text-red-100">Delete Account</h4>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Permanently delete your account and all associated data
                        </p>
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MobileBottomPadding>
    </UserLayout>
  );
};

export default UserSettings;