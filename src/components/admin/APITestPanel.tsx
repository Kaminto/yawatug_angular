import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Send, MessageCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCommunication } from '@/hooks/useUnifiedCommunication';

export const APITestPanel = () => {
  const [emailTest, setEmailTest] = useState({
    to: 'biztrisystems@yahoo.com',
    subject: 'API Test Email',
    loading: false,
    result: null as any
  });

  const [smsTest, setSmsTest] = useState({
    phoneNumber: '+256785183468',
    loading: false,
    result: null as any
  });

  const [unifiedTest, setUnifiedTest] = useState({
    recipient: 'biztrisystems@yahoo.com',
    channel: 'email' as 'email' | 'sms' | 'both',
    subject: 'Unified Communication Test',
    message: 'This is a test message from the unified communication system.'
  });

  const { toast } = useToast();
  const { sendCommunication, loading: unifiedLoading, lastResponse } = useUnifiedCommunication();

  const testBasicFunction = async () => {
    try {
      console.log('Testing verify-resend-config function...');
      const { data, error } = await supabase.functions.invoke('verify-resend-config');
      
      console.log('Test function response:', { data, error });
      
      if (error) {
        toast({
          title: "Test Function Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Test Function Success",
          description: "Basic function working correctly"
        });
      }
    } catch (err: any) {
      console.error('Test function error:', err);
      toast({
        title: "Test Function Failed", 
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const testEmail = async () => {
    setEmailTest(prev => ({ ...prev, loading: true, result: null }));
    
    try {
      // Use the unified email sender for comprehensive testing
      const { data, error } = await supabase.functions.invoke('unified-communication-sender', {
        body: {
          to: emailTest.to,
          subject: emailTest.subject || 'API Test Email',
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #0E4D92;">🧪 Email API Test</h1>
              <p>This is a test email from the unified email sender system.</p>
              <p><strong>Test Details:</strong></p>
              <ul>
                <li>Timestamp: ${new Date().toLocaleString()}</li>
                <li>Sender: Unified Email System</li>
                <li>Provider: Auto-selected (Resend/Gmail fallback)</li>
              </ul>
              <p>✅ If you receive this email, the email system is working correctly!</p>
            </div>
          `,
          fromEmail: 'admin@yawatug.com',
          fromName: 'Yawatu API Test',
          priority: 'normal'
        }
      });

      if (error) throw error;

      setEmailTest(prev => ({ 
        ...prev, 
        result: { success: true, data },
        loading: false 
      }));

      toast({
        title: "Email Test Successful",
        description: "Debug test email sent successfully! Check both inbox and Resend dashboard."
      });
    } catch (error: any) {
      console.error('Email test error:', error);
      setEmailTest(prev => ({ 
        ...prev, 
        result: { success: false, error: error.message },
        loading: false 
      }));

      toast({
        title: "Email Test Failed",
        description: `${error.message}. Check console for detailed debug info.`,
        variant: "destructive"
      });
    }
  };

  const testSMS = async () => {
    setSmsTest(prev => ({ ...prev, loading: true, result: null }));
    
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phoneNumber: smsTest.phoneNumber,
          message: 'Test SMS from your application. SMS system is working correctly!',
          purpose: 'test'
        }
      });

      if (error) throw error;

      setSmsTest(prev => ({ 
        ...prev, 
        result: { success: true, data },
        loading: false 
      }));

      toast({
        title: "SMS Test Successful",
        description: "Test SMS sent successfully!"
      });
    } catch (error: any) {
      console.error('SMS test error:', error);
      setSmsTest(prev => ({ 
        ...prev, 
        result: { success: false, error: error.message },
        loading: false 
      }));

      toast({
        title: "SMS Test Failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">API Testing Panel</h2>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Function Test</CardTitle>
            <CardDescription>Test if edge functions are deployed and accessible</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testBasicFunction} className="w-full">
              Test Basic Function
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Email API
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            SMS API
          </TabsTrigger>
          <TabsTrigger value="unified" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Unified
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Email System Test
              </CardTitle>
              <CardDescription>
                Test the enhanced email sender with Resend API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-to">Recipient Email</Label>
                <Input
                  id="email-to"
                  type="email"
                  value={emailTest.to}
                  onChange={(e) => setEmailTest(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="Enter test email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={emailTest.subject}
                  onChange={(e) => setEmailTest(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Email subject"
                />
              </div>

              <Button 
                onClick={testEmail} 
                disabled={emailTest.loading || !emailTest.to}
                className="w-full"
              >
                {emailTest.loading ? 'Sending...' : 'Send Test Email'}
              </Button>

      {emailTest.result && (
        <div className={`p-4 rounded-lg border ${
          emailTest.result.success 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {emailTest.result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {emailTest.result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(emailTest.result, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                SMS System Test
              </CardTitle>
              <CardDescription>
                Test the enhanced SMS sender with configured providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sms-phone">Phone Number</Label>
                <Input
                  id="sms-phone"
                  type="tel"
                  value={smsTest.phoneNumber}
                  onChange={(e) => setSmsTest(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="Enter phone number with country code"
                />
              </div>

              <Button 
                onClick={testSMS} 
                disabled={smsTest.loading || !smsTest.phoneNumber}
                className="w-full"
              >
                {smsTest.loading ? 'Sending...' : 'Send Test SMS'}
              </Button>

              {smsTest.result && (
                <div className={`p-4 rounded-lg border ${
                  smsTest.result.success 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {smsTest.result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {smsTest.result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(smsTest.result, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unified">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Unified Communication Test
              </CardTitle>
              <CardDescription>
                Test multi-channel communication (Email, SMS, or both)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unified-recipient">Recipient</Label>
                  <Input
                    id="unified-recipient"
                    type="text"
                    value={unifiedTest.recipient}
                    onChange={(e) => setUnifiedTest(prev => ({ ...prev, recipient: e.target.value }))}
                    placeholder="email@example.com or +256123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unified-channel">Channel</Label>
                  <select 
                    id="unified-channel"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    value={unifiedTest.channel}
                    onChange={(e) => setUnifiedTest(prev => ({ ...prev, channel: e.target.value as any }))}
                  >
                    <option value="email">Email Only</option>
                    <option value="sms">SMS Only</option>
                    <option value="both">Both Email & SMS</option>
                  </select>
                </div>
              </div>
              
              {(unifiedTest.channel === 'email' || unifiedTest.channel === 'both') && (
                <div className="space-y-2">
                  <Label htmlFor="unified-subject">Email Subject</Label>
                  <Input
                    id="unified-subject"
                    value={unifiedTest.subject}
                    onChange={(e) => setUnifiedTest(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Email subject line"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="unified-message">Message Content</Label>
                <textarea
                  id="unified-message"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background min-h-[100px] resize-y"
                  value={unifiedTest.message}
                  onChange={(e) => setUnifiedTest(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Your message content..."
                />
              </div>

              <Button
                onClick={() => sendCommunication({
                  recipient: unifiedTest.recipient,
                  subject: unifiedTest.subject,
                  message: unifiedTest.message,
                  channel: unifiedTest.channel
                })}
                disabled={unifiedLoading || !unifiedTest.recipient || !unifiedTest.message}
                className="w-full"
              >
                {unifiedLoading ? "Sending..." : `Send via ${unifiedTest.channel.charAt(0).toUpperCase() + unifiedTest.channel.slice(1)}`}
              </Button>

              {lastResponse && (
                <div className={`p-4 rounded-lg border ${
                  lastResponse.success 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {lastResponse.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {lastResponse.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <p className="mb-2">{lastResponse.message}</p>
                  
                  {lastResponse.results && (
                    <div className="space-y-2">
                      {lastResponse.results.email && (
                        <div className="text-sm">
                          <strong>Email:</strong> {lastResponse.results.email.success ? '✅' : '❌'} {lastResponse.results.email.message}
                        </div>
                      )}
                      {lastResponse.results.sms && (
                        <div className="text-sm">
                          <strong>SMS:</strong> {lastResponse.results.sms.success ? '✅' : '❌'} {lastResponse.results.sms.message}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {lastResponse.data && (
                    <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto">
                      {JSON.stringify(lastResponse, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};