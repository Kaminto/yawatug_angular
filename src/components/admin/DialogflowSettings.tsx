import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Settings, Save, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const DialogflowSettings: React.FC = () => {
  const [projectId, setProjectId] = useState('');
  const [location, setLocation] = useState('us-central1');
  const [agentId, setAgentId] = useState('');
  const [credentials, setCredentials] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'dialogflow_config')
        .single();

      if (data?.setting_value) {
        const config = data.setting_value as any;
        setProjectId(config.project_id || '');
        setLocation(config.location || 'us-central1');
        setAgentId(config.agent_id || '');
        // Don't load credentials for security
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    if (!projectId || !location || !agentId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      // Save to admin_settings table
      const { error: settingsError } = await supabase
        .from('admin_settings')
        .upsert({
          setting_key: 'dialogflow_config',
          setting_value: {
            project_id: projectId,
            location: location,
            agent_id: agentId,
            updated_at: new Date().toISOString()
          }
        });

      if (settingsError) throw settingsError;

      // Save credentials as secrets if provided
      if (credentials) {
        // Note: In production, this should call an edge function to securely store credentials
        toast.info('Credentials should be stored via Supabase secrets');
      }

      toast.success('Dialogflow settings saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('dialogflow-chat', {
        body: {
          message: 'Hello, this is a test message',
          sessionId: `test_${Date.now()}`
        }
      });

      if (error) {
        toast.error(`Test failed: ${error.message}`);
      } else {
        toast.success('Dialogflow connection successful!');
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <CardTitle>Dialogflow CX Configuration</CardTitle>
        </div>
        <CardDescription>
          Configure Google Dialogflow CX for AI chatbot functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="projectId">Project ID *</Label>
          <Input
            id="projectId"
            placeholder="your-project-id"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your Google Cloud Project ID
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <Input
            id="location"
            placeholder="us-central1"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Valid locations: us-central1, europe-west1, asia-northeast1, etc.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agentId">Agent ID *</Label>
          <Input
            id="agentId"
            placeholder="your-agent-id"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your Dialogflow CX Agent ID
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="credentials">Service Account Credentials (JSON)</Label>
          <Textarea
            id="credentials"
            placeholder='{"type": "service_account", "project_id": "...", ...}'
            value={credentials}
            onChange={(e) => setCredentials(e.target.value)}
            rows={6}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Paste your service account JSON here. Store as DIALOGFLOW_CREDENTIALS secret.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button 
            onClick={handleTest} 
            disabled={isTesting || !projectId || !location || !agentId}
            variant="outline"
          >
            <TestTube className="w-4 h-4 mr-2" />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>

        <div className="rounded-lg border p-4 bg-muted/50">
          <h4 className="font-medium mb-2">Setup Instructions:</h4>
          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li>Create a Dialogflow CX agent in Google Cloud Console</li>
            <li>Create a service account with Dialogflow API Client role</li>
            <li>Download the service account JSON key</li>
            <li>Store credentials as DIALOGFLOW_CREDENTIALS in Supabase secrets</li>
            <li>Set DIALOGFLOW_PROJECT_ID, DIALOGFLOW_LOCATION, and DIALOGFLOW_AGENT_ID</li>
            <li>Click "Test Connection" to verify setup</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
