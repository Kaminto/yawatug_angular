# Centralized Communication System

This document explains the centralized SMS and email communication system for the Yawatu Minerals & Mining PLC application.

## Overview

All communications in the app (SMS, Email, OTP, notifications, etc.) should go through the centralized communication system to ensure consistency, reliability, and easy maintenance.

## Architecture

```
┌─────────────────────────────────────────┐
│              Application Layer          │
│  (Components, Pages, Business Logic)    │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│            Communication Hook           │
│        useCommunication()               │
│    (State management, UI feedback)      │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│        Communication Service            │
│      CommunicationService class         │
│   (Business logic, validation)          │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│           Supabase Edge Functions       │
│    send-sms, send-sms-otp, enhanced-   │
│    email-sender, verify-sms-otp         │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│         External Services               │
│   EasyUganda SMS, Resend Email         │
└─────────────────────────────────────────┘
```

## Quick Start

### 1. Basic Usage with Hook (Recommended)

```typescript
import { useCommunication } from '@/hooks/useCommunication';

function MyComponent() {
  const communication = useCommunication();
  
  const handleSendEmail = async () => {
    await communication.sendEmail(
      'user@example.com',
      'Welcome!',
      'Welcome to Yawatu!'
    );
  };
  
  const handleSendSMS = async () => {
    await communication.sendSMS(
      '+256701234567',
      'Your verification code is 123456'
    );
  };
  
  const handleSendBoth = async () => {
    await communication.sendBoth(
      'user@example.com', // Will detect this is email
      'Important Notice',
      'This is an important notification'
    );
  };
  
  return (
    <div>
      <button onClick={handleSendEmail}>
        Send Email
      </button>
      <button onClick={handleSendSMS}>
        Send SMS
      </button>
      {communication.loading && <p>Sending...</p>}
      {communication.error && <p>Error: {communication.error}</p>}
    </div>
  );
}
```

### 2. Direct Service Usage (No State Management)

```typescript
import { CommunicationService } from '@/services/CommunicationService';

// Simple email
const result = await CommunicationService.sendEmail(
  'user@example.com',
  'Subject',
  'Message'
);

// Simple SMS
const result = await CommunicationService.sendSMS(
  '+256701234567',
  'Hello World!'
);

// Both channels
const result = await CommunicationService.sendBoth(
  'user@example.com',
  'Subject',
  'Message'
);
```

### 3. Utility Functions for Common Tasks

```typescript
import { 
  quickSendEmail,
  quickSendSMS,
  sendTransactionConfirmation,
  sendWalletAlert,
  sendSecurityAlert
} from '@/utils/communication';

// Quick sends (no state management)
await quickSendEmail('user@example.com', 'Subject', 'Message');
await quickSendSMS('+256701234567', 'Hello!');

// Template-based sends
await sendTransactionConfirmation(
  'user@example.com',
  'email',
  {
    type: 'deposit',
    amount: 100000,
    currency: 'UGX',
    transactionId: 'TXN-123456',
    userName: 'John Doe'
  }
);

await sendWalletAlert(
  '+256701234567',
  'sms',
  {
    userName: 'John Doe',
    currentBalance: 50000,
    currency: 'UGX',
    alertType: 'low_balance'
  }
);
```

## Communication Channels

- `'email'` - Email only
- `'sms'` - SMS only  
- `'both'` - Attempts both email and SMS

## SMS OTP System

```typescript
import { useCommunication } from '@/hooks/useCommunication';

function OTPComponent() {
  const communication = useCommunication();
  
  const sendOTP = async () => {
    await communication.sendSMSOTP({
      phoneNumber: '+256701234567',
      purpose: 'verification',
      userId: 'user-123'
    });
  };
  
  const verifyOTP = async (otp: string) => {
    await communication.verifySMSOTP({
      phoneNumber: '+256701234567',
      otp,
      purpose: 'verification',
      userId: 'user-123'
    });
  };
}
```

## Pre-built Email Templates

The system includes several pre-built email templates:

```typescript
// Welcome email
await communication.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  'Thank you for joining!'
);

// Account activation
await communication.sendActivationEmail(
  'user@example.com',
  'John Doe',
  'https://app.com/activate?token=xyz'
);

// Invitation
await communication.sendInvitationEmail(
  'user@example.com',
  'John Doe',
  'https://app.com/invite?token=xyz',
  'Jane Smith' // inviter name
);

// Consent invitation
await communication.sendConsentInvitation(
  'user@example.com',
  {
    club_allocation_id: 'alloc-123',
    club_member_id: 'member-456',
    phone: '+256701234567',
    member_name: 'John Doe',
    allocated_shares: 1000,
    debt_amount: 500000
  }
);
```

## Phone Number Formatting

The system automatically formats phone numbers to Uganda standard:

```typescript
import { CommunicationService } from '@/services/CommunicationService';

// All of these will be converted to +256701234567
CommunicationService.formatPhoneNumber('0701234567');   // +256701234567
CommunicationService.formatPhoneNumber('701234567');    // +256701234567
CommunicationService.formatPhoneNumber('256701234567'); // +256701234567
CommunicationService.formatPhoneNumber('+256701234567'); // +256701234567
```

## Validation

```typescript
import { CommunicationService } from '@/services/CommunicationService';

// Validate emails
CommunicationService.isValidEmail('user@example.com'); // true
CommunicationService.isValidEmail('invalid-email');    // false

// Validate phone numbers
CommunicationService.isValidPhoneNumber('+256701234567'); // true
CommunicationService.isValidPhoneNumber('0701234567');    // true
CommunicationService.isValidPhoneNumber('123');          // false
```

## Error Handling

The system provides comprehensive error handling:

```typescript
const result = await communication.sendEmail('user@example.com', 'Subject', 'Message');

if (result.success) {
  console.log('Email sent successfully');
  console.log('Message:', result.message);
  console.log('Provider used:', result.data?.provider_used);
} else {
  console.error('Email failed:', result.message);
  
  // Check specific channel results if using 'both'
  if (result.results?.email) {
    console.log('Email result:', result.results.email);
  }
  if (result.results?.sms) {
    console.log('SMS result:', result.results.sms);
  }
}
```

## Bulk Communications

```typescript
import { sendBulkNotifications } from '@/utils/communication';

const recipients = ['user1@example.com', 'user2@example.com', '+256701234567'];
const result = await sendBulkNotifications(
  recipients,
  'Important Notice',
  'This is a bulk notification',
  'both' // channel
);

console.log(`Sent: ${result.success}, Failed: ${result.failed}`);
console.log('Results:', result.results);
```

## Migration from Old Hooks

If you're using the old communication hooks, update your imports:

```typescript
// OLD - Replace these
import { useUnifiedCommunication } from '@/hooks/useUnifiedCommunication';
import { useEmailService } from '@/hooks/useEmailService';
import { useSMSOTP } from '@/hooks/useSMSOTP';

// NEW - Use this instead
import { useCommunication } from '@/hooks/useCommunication';
```

The old hooks still work but are deprecated and will be removed in future versions.

## Edge Functions

The system uses these Supabase edge functions:

- `send-sms` - Sends SMS messages
- `send-sms-otp` - Sends SMS OTP codes
- `verify-sms-otp` - Verifies SMS OTP codes
- `enhanced-email-sender` - Sends emails with templates

## Configuration

Make sure these secrets are configured in your Supabase project:

### SMS (EasyUganda)
- `SMS_USERNAME` or `SMS_USER`
- `SMS_PASSWORD`

### Email (Resend)
- `RESEND_API_KEY`

## Best Practices

1. **Always use the centralized system** - Don't create separate communication logic
2. **Use hooks for UI components** - They provide loading states and error handling
3. **Use direct service calls for server-side logic** - No state management needed
4. **Use utility functions for common patterns** - They include pre-built templates
5. **Validate inputs** - The system validates automatically, but check beforehand for better UX
6. **Handle errors gracefully** - Always check the `success` property in responses
7. **Use appropriate channels** - Email for detailed info, SMS for urgent/short messages
8. **Format phone numbers** - The system does this automatically, but you can pre-format for better UX

## Testing

Use the `CommunicationExample` component to test all communication features:

```typescript
import { CommunicationExample } from '@/components/communication/CommunicationExample';

// Add this to your app for testing
<CommunicationExample />
```

## Troubleshooting

### Common Issues

1. **SMS not sending**: Check SMS credentials in Supabase secrets
2. **Email not sending**: Check RESEND_API_KEY and domain verification
3. **Phone number format errors**: Use the built-in formatting function
4. **Rate limiting**: SMS has built-in rate limiting, space out bulk sends

### Debug Information

Enable debug logging by checking the browser console and Supabase edge function logs.

### Edge Function Logs

Check these functions in your Supabase dashboard:
- [Send SMS Logs](https://supabase.com/dashboard/project/lqmcokwbqnjuufcvodos/functions/send-sms/logs)
- [SMS OTP Logs](https://supabase.com/dashboard/project/lqmcokwbqnjuufcvodos/functions/send-sms-otp/logs)
- [Email Sender Logs](https://supabase.com/dashboard/project/lqmcokwbqnjuufcvodos/functions/enhanced-email-sender/logs)