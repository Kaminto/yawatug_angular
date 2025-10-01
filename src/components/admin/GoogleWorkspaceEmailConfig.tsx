import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Settings, CheckCircle, AlertCircle, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const GoogleWorkspaceEmailConfig = () => {
  const [config, setConfig] = useState({
    fromEmail: 'admin@yawatug.com', // Use verified domain by default
    fromName: 'Yawatu Minerals & Mining PLC',
    isConfigured: false
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_payment_settings')
        .select('setting_name, setting_value')
        .in('setting_name', ['gmail_from_email', 'gmail_from_name', 'gmail_configured']);

      if (error) throw error;

      const settingsMap = data?.reduce((acc: any, setting) => {
        acc[setting.setting_name] = setting.setting_value;
        return acc;
      }, {});

      if (settingsMap) {
        setConfig(prev => ({
          ...prev,
          fromEmail: settingsMap.gmail_from_email || prev.fromEmail,
          fromName: settingsMap.gmail_from_name || prev.fromName,
          isConfigured: settingsMap.gmail_configured === 'true'
        }));
      }
    } catch (error) {
      console.error('Error loading Gmail config:', error);
    }
  };

  const [testEmail, setTestEmail] = useState({
    to: '',
    subject: 'Test Email from Yawatu Minerals',
    body: 'This is a test email to verify Google Workspace email integration.'
  });

  const handleSaveConfig = async () => {
    try {
      // Save Gmail configuration to database
      const { error } = await supabase
        .from('admin_payment_settings')
        .upsert([
          { setting_name: 'gmail_from_email', setting_value: config.fromEmail },
          { setting_name: 'gmail_from_name', setting_value: config.fromName },
          { setting_name: 'gmail_configured', setting_value: 'true' }
        ], { onConflict: 'setting_name' });

      if (error) throw error;

      toast.success('Gmail email configuration saved successfully');
      setConfig(prev => ({ ...prev, isConfigured: true }));
    } catch (error) {
      console.error('Error saving Gmail config:', error);
      toast.error('Failed to save configuration');
    }
  };

  const handleTestEmail = async () => {
    try {
      if (!testEmail.to) {
        toast.error('Please enter a recipient email address');
        return;
      }

      // Call the send-emails edge function
      const { data, error } = await supabase.functions.invoke('send-emails', {
        body: {
          to: testEmail.to,
          subject: testEmail.subject,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0E4D92;">Test Email from Yawatu Minerals</h2>
              <p>${testEmail.body}</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                This is a test email sent from the Yawatu Minerals admin panel.<br>
                Sent at: ${new Date().toLocaleString()}
              </p>
            </div>
          `,
          fromEmail: config.fromEmail,
          fromName: config.fromName
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Test email sent successfully via ${data.provider || 'Email Service'}!`);
      } else {
        // Handle detailed error responses
        let errorMessage = data.error || 'Failed to send email';
        if (data.setup_help) {
          errorMessage += '\n\nSetup Help: ' + data.setup_help;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      
      // Show detailed error message
      let errorMsg = error.message;
      if (errorMsg.includes('domain verification')) {
        errorMsg += '\n\nTip: Use admin@yawatug.com as the "From Email" since it is already verified.';
      }
      
      toast.error('Failed to send test email: ' + errorMsg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Service Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {config.isConfigured ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Badge variant="default">Configured</Badge>
                <span className="text-sm text-muted-foreground">
                  Email service is active and ready
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <Badge variant="secondary">Not Configured</Badge>
                <span className="text-sm text-muted-foreground">
                  Email service requires configuration
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Email Service Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Setup Options:</strong> You can use either Gmail App Password or Resend API key.
            </p>
            <div className="mt-2 space-y-2 text-sm text-blue-700">
              <p><strong>Option 1 - Resend (Recommended):</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>Sign up at <a href="https://resend.com" target="_blank" className="underline">resend.com</a></li>
                <li>Create API key and use it as GMAIL_APP_PASSWORD secret</li>
                <li>Verify your domain at <a href="https://resend.com/domains" target="_blank" className="underline">resend.com/domains</a></li>
              </ul>
              <p><strong>Option 2 - Gmail App Password:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>Enable 2FA on Gmail → Generate App Password</li>
                <li>Use Gmail App Password as GMAIL_APP_PASSWORD secret</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email Address</Label>
              <Input
                id="fromEmail"
                type="email"
                value={config.fromEmail}
                onChange={(e) => setConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                placeholder="noreply@yawatuminerals.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input
                id="fromName"
                value={config.fromName}
                onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
                placeholder="Yawatu Minerals & Mining PLC"
              />
            </div>
          </div>

          <Button onClick={handleSaveConfig} className="w-full">
            Save Email Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Test Email Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testTo">Recipient Email</Label>
            <Input
              id="testTo"
              type="email"
              value={testEmail.to}
              onChange={(e) => setTestEmail(prev => ({ ...prev, to: e.target.value }))}
              placeholder="test@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="testSubject">Subject</Label>
            <Input
              id="testSubject"
              value={testEmail.subject}
              onChange={(e) => setTestEmail(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Test Email Subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="testBody">Message Body</Label>
            <Textarea
              id="testBody"
              value={testEmail.body}
              onChange={(e) => setTestEmail(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Enter test email content..."
              rows={4}
            />
          </div>

          <Button 
            onClick={handleTestEmail} 
            disabled={!testEmail.to}
            className="w-full"
          >
            Send Test Email
          </Button>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>1. Resend API Setup (Recommended):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Create account at <a href="https://resend.com" target="_blank" className="underline">resend.com</a></li>
              <li>Generate API key at <a href="https://resend.com/api-keys" target="_blank" className="underline">resend.com/api-keys</a></li>
              <li>Add the API key as GMAIL_APP_PASSWORD in Supabase Edge Function secrets</li>
              <li>For testing: use "admin@yawatug.com" as From Email (verified domain)</li>
              <li>For production: verify your domain at <a href="https://resend.com/domains" target="_blank" className="underline">resend.com/domains</a></li>
            </ul>
            
            <p><strong>2. Gmail App Password Setup (Alternative):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Enable 2-factor authentication on your Gmail account</li>
              <li>Go to Google Account settings → Security → App passwords</li>
              <li>Generate a new app password for "Mail"</li>
              <li>Add this password as GMAIL_APP_PASSWORD in Supabase Edge Function secrets</li>
            </ul>

            <p><strong>3. Testing:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>With Resend: Use admin@yawatug.com as from email (verified domain)</li>
              <li>With verified domain: Use any email from your verified domain</li>
              <li>Check edge function logs for detailed error messages</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleWorkspaceEmailConfig;