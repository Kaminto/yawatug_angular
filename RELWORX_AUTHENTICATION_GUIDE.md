# RelWorx Authentication Configuration Guide

## Current Setup Status ✅

Your Yawatu app is already properly configured with **secure authentication methods** that don't require IP whitelisting:

### 1. API Key Authentication (Bearer Token)
- **Status**: ✅ Configured
- **Location**: Environment variable `RELWORX_API_KEY`
- **Usage**: Sent in `Authorization: Bearer [API_KEY]` header
- **Security**: Provides unique merchant identification

### 2. Account Number Verification
- **Status**: ✅ Configured  
- **Location**: Environment variable `RELWORX_ACCOUNT_NO`
- **Usage**: Included in every payment request payload
- **Security**: Additional merchant verification layer

### 3. Webhook Signature Verification (HMAC-SHA256)
- **Status**: ✅ Configured
- **Location**: Environment variable `RELWORX_WEBHOOK_SECRET`  
- **Usage**: Verifies all incoming webhook callbacks
- **Security**: Ensures webhook authenticity and data integrity

## Current Issue 🚨

RelWorx is enforcing **IP whitelisting** on your account, causing this error:
```
HTTP 403 Forbidden
"No Authorized IP Access" (INVALID_IP)
```

**Problem**: Supabase Edge Functions use dynamic IP addresses (serverless architecture), making IP whitelisting impossible.

## Solution: Contact RelWorx Support 📞

You need to contact RelWorx support and request the following:

### Request Template

```
Subject: Disable IP Whitelisting - Use API Authentication Only

Dear RelWorx Support,

We are using RelWorx payment services with a serverless architecture (Supabase Edge Functions) 
that uses dynamic IP addresses. We need to disable IP whitelisting for our account and rely 
on the following secure authentication methods instead:

ACCOUNT DETAILS:
- Account Number: [Your RELWORX_ACCOUNT_NO]
- API Key: [First 8 characters of your API key]***

REQUESTED CHANGES:
1. ❌ DISABLE: IP Address Whitelisting
2. ✅ ENABLE: API Key Authentication (Bearer token)
3. ✅ ENABLE: Account Number Verification  
4. ✅ ENABLE: Webhook HMAC-SHA256 Signature Verification

TECHNICAL JUSTIFICATION:
- Our application uses Supabase Edge Functions (serverless)
- Edge Functions use dynamic IP addresses that change with each request
- We have implemented proper API authentication and webhook signature verification
- This setup is more secure than static IP whitelisting

Please confirm when IP restrictions have been removed so we can proceed with testing.

Thank you,
[Your Name]
[Your Company]
```

## Authentication Implementation Details 🔧

### API Request Authentication
```javascript
// Headers sent with every API call
{
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.relworx.v2',
  'Authorization': `Bearer ${RELWORX_API_KEY}`
}

// Payload includes account verification
{
  "account_no": "${RELWORX_ACCOUNT_NO}",
  "reference": "unique_transaction_ref",
  "msisdn": "+256701234567",
  "currency": "UGX",
  "amount": 5000,
  "description": "Payment description"
}
```

### Webhook Signature Verification
```javascript
// Webhook verification process
const signature = request.headers.get('x-relworx-signature');
const payload = await request.text();
const isValid = await verifyHMAC(payload, signature, RELWORX_WEBHOOK_SECRET);
```

## Security Benefits of This Approach 🛡️

1. **API Key Authentication**: 
   - Unique per merchant
   - Can be rotated if compromised
   - More secure than static IPs

2. **Account Number Verification**:
   - Additional layer of merchant verification
   - Prevents cross-account access

3. **Webhook Signature Verification**:
   - Ensures webhook authenticity
   - Prevents spoofed callbacks
   - Uses cryptographic signatures (HMAC-SHA256)

4. **Dynamic IP Architecture**:
   - Better security through IP rotation
   - Harder for attackers to predict/target
   - Industry standard for serverless applications

## Alternative Providers (If Needed) 🔄

If RelWorx cannot accommodate this request, consider these alternatives that support serverless architectures:

- **Flutterwave**: Full API-based authentication
- **Paystack**: No IP restrictions required
- **Stripe**: API-key based authentication
- **MTN MoMo API**: Direct integration available

## Testing After RelWorx Update ✅

Once RelWorx disables IP whitelisting:

1. Visit `/relworx-test` in your app
2. Click "Test API Connectivity" 
3. Should receive success response instead of 403 error
4. Proceed with deposit testing

## Contact Information 📧

- **RelWorx Support**: [Insert support email/phone]
- **Your Technical Contact**: [Your details]
- **Escalation**: Request to speak with technical team if first-line support doesn't understand

---

**Note**: This is a common request for modern cloud applications. Most payment providers support API-only authentication for serverless architectures.