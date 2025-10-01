import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCommunication } from '@/hooks/useCommunication';
import { 
  quickSendEmail, 
  quickSendSMS, 
  sendTransactionConfirmation,
  sendWalletAlert 
} from '@/utils/communication';

/**
 * Example component showing how to use the centralized communication system
 * This demonstrates all the different ways to send communications in your app
 */
export function CommunicationExample() {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms' | 'both'>('email');

  // Using the centralized communication hook
  const communication = useCommunication();

  const handleSendCommunication = async () => {
    await communication.sendCommunication({
      recipient,
      subject,
      message,
      channel
    });
  };

  const handleSendWelcome = async () => {
    await communication.sendWelcomeEmail(
      recipient,
      'John Doe',
      'Thank you for joining our platform!'
    );
  };

  const handleSendOTP = async () => {
    await communication.sendSMSOTP({
      phoneNumber: recipient,
      purpose: 'verification',
      userId: 'user-123'
    });
  };

  const handleQuickEmail = async () => {
    // Using utility functions for quick sends (no state management)
    const result = await quickSendEmail(
      recipient,
      subject || 'Quick Email',
      message || 'This is a quick email test'
    );
    console.log('Quick email result:', result);
  };

  const handleTransactionNotification = async () => {
    // Using template functions
    const result = await sendTransactionConfirmation(
      recipient,
      channel,
      {
        type: 'deposit',
        amount: 100000,
        currency: 'UGX',
        transactionId: 'TXN-123456',
        userName: 'John Doe'
      }
    );
    console.log('Transaction notification result:', result);
  };

  const handleWalletAlert = async () => {
    const result = await sendWalletAlert(
      recipient,
      channel,
      {
        userName: 'John Doe',
        currentBalance: 50000,
        currency: 'UGX',
        alertType: 'low_balance'
      }
    );
    console.log('Wallet alert result:', result);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Centralized Communication System</CardTitle>
          <CardDescription>
            Test the unified SMS and email communication system. All communication in your app should use this centralized service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Communication Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Email or Phone Number"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <Select value={channel} onValueChange={(value: any) => setChannel(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email Only</SelectItem>
                <SelectItem value="sms">SMS Only</SelectItem>
                <SelectItem value="both">Both Email & SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Input
            placeholder="Subject (for emails)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          
          <Textarea
            placeholder="Message content"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          
          <Button 
            onClick={handleSendCommunication}
            disabled={communication.loading || !recipient || !message}
          >
            {communication.loading ? 'Sending...' : 'Send Communication'}
          </Button>
          
          {communication.error && (
            <div className="text-destructive text-sm">{communication.error}</div>
          )}
          
          {communication.lastResponse && (
            <div className="text-sm">
              <strong>Last Response:</strong> {communication.lastResponse.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pre-built Communication Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Welcome Email</CardTitle>
            <CardDescription>Send welcome email to new users</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSendWelcome} disabled={!recipient}>
              Send Welcome
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SMS OTP</CardTitle>
            <CardDescription>Send OTP for verification</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSendOTP} disabled={!recipient}>
              Send OTP
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Email</CardTitle>
            <CardDescription>Send without state management</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleQuickEmail} disabled={!recipient}>
              Quick Send
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Alert</CardTitle>
            <CardDescription>Transaction confirmation template</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTransactionNotification} disabled={!recipient}>
              Send Transaction
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wallet Alert</CardTitle>
            <CardDescription>Wallet balance notification</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleWalletAlert} disabled={!recipient}>
              Send Alert
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use the Centralized Communication System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold">1. Using the Hook (with state management):</h4>
              <code className="bg-muted p-2 rounded block mt-1">
                {`const communication = useCommunication();
await communication.sendEmail('user@example.com', 'Subject', 'Message');`}
              </code>
            </div>
            
            <div>
              <h4 className="font-semibold">2. Using Direct Service (no state):</h4>
              <code className="bg-muted p-2 rounded block mt-1">
                {`import { CommunicationService } from '@/services/CommunicationService';
await CommunicationService.sendSMS('+256701234567', 'Hello!');`}
              </code>
            </div>
            
            <div>
              <h4 className="font-semibold">3. Using Utility Functions:</h4>
              <code className="bg-muted p-2 rounded block mt-1">
                {`import { quickSendEmail, sendTransactionConfirmation } from '@/utils/communication';
await quickSendEmail('user@example.com', 'Subject', 'Message');`}
              </code>
            </div>
            
            <div>
              <h4 className="font-semibold">4. Available Channels:</h4>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><code>'email'</code> - Email only</li>
                <li><code>'sms'</code> - SMS only</li>
                <li><code>'both'</code> - Both email and SMS</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}