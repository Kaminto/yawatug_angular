import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Palette, Monitor, Sun, Moon, Languages } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

const AppearanceSettings = () => {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState('en');
  const [compactMode, setCompactMode] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [loading, setLoading] = useState(false);

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Here you would save appearance preferences to the database
      toast.success('Appearance settings saved successfully');
    } catch (error) {
      console.error('Error saving appearance settings:', error);
      toast.error('Failed to save appearance settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-3">
            <Label>Theme</Label>
            <div className="flex gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-3">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ug">Luganda</SelectItem>
                <SelectItem value="sw">Swahili</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Display Options */}
          <div className="space-y-4">
            <h3 className="font-medium">Display Options</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="compact">Compact Mode</Label>
                <p className="text-sm text-muted-foreground">Show more content in less space</p>
              </div>
              <Switch
                id="compact"
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="animations">Enable Animations</Label>
                <p className="text-sm text-muted-foreground">Smooth transitions and effects</p>
              </div>
              <Switch
                id="animations"
                checked={animations}
                onCheckedChange={setAnimations}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={saveSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppearanceSettings;