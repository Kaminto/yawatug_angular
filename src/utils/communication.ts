/**
 * Communication utilities and helpers
 * These are convenience functions that use the centralized CommunicationService
 */

import { CommunicationService } from '@/services/CommunicationService';

// ============= QUICK COMMUNICATION FUNCTIONS =============

/**
 * Quick email sender - no state management, just send and return result
 */
export const quickSendEmail = async (to: string, subject: string, message: string) => {
  return await CommunicationService.sendEmail(to, subject, message);
};

/**
 * Quick SMS sender - no state management, just send and return result
 */
export const quickSendSMS = async (phoneNumber: string, message: string) => {
  return await CommunicationService.sendSMS(phoneNumber, message);
};

/**
 * Quick notification sender (both email and SMS)
 */
export const quickSendNotification = async (recipient: string, subject: string, message: string) => {
  return await CommunicationService.sendBoth(recipient, subject, message);
};

// ============= COMMON COMMUNICATION TEMPLATES =============

/**
 * Send transaction confirmation
 */
export const sendTransactionConfirmation = async (
  recipient: string, 
  channel: 'email' | 'sms' | 'both',
  transactionData: {
    type: string;
    amount: number;
    currency: string;
    transactionId: string;
    userName: string;
  }
) => {
  const message = `Dear ${transactionData.userName}, your ${transactionData.type} of ${transactionData.amount} ${transactionData.currency} has been processed. Transaction ID: ${transactionData.transactionId}`;
  
  return await CommunicationService.send({
    recipient,
    subject: `Transaction Confirmation - ${transactionData.type}`,
    message,
    channel,
    templateType: 'transaction_confirmation',
    templateData: transactionData
  });
};

/**
 * Send wallet balance alert
 */
export const sendWalletAlert = async (
  recipient: string,
  channel: 'email' | 'sms' | 'both',
  alertData: {
    userName: string;
    currentBalance: number;
    currency: string;
    alertType: 'low_balance' | 'deposit' | 'withdrawal';
  }
) => {
  let message = `Dear ${alertData.userName}, `;
  
  switch (alertData.alertType) {
    case 'low_balance':
      message += `your wallet balance is low: ${alertData.currentBalance} ${alertData.currency}`;
      break;
    case 'deposit':
      message += `your wallet has been credited. Current balance: ${alertData.currentBalance} ${alertData.currency}`;
      break;
    case 'withdrawal':
      message += `a withdrawal has been processed. Current balance: ${alertData.currentBalance} ${alertData.currency}`;
      break;
  }
  
  return await CommunicationService.send({
    recipient,
    subject: `Wallet Alert - ${alertData.alertType}`,
    message,
    channel,
    templateType: 'wallet_alert',
    templateData: alertData
  });
};

/**
 * Send share trading notification
 */
export const sendShareTradingNotification = async (
  recipient: string,
  channel: 'email' | 'sms' | 'both',
  tradeData: {
    userName: string;
    action: 'bought' | 'sold';
    shares: number;
    pricePerShare: number;
    totalAmount: number;
    currency: string;
  }
) => {
  const message = `Dear ${tradeData.userName}, you have successfully ${tradeData.action} ${tradeData.shares} shares at ${tradeData.pricePerShare} ${tradeData.currency} each. Total: ${tradeData.totalAmount} ${tradeData.currency}`;
  
  return await CommunicationService.send({
    recipient,
    subject: `Share Trading Confirmation - ${tradeData.action}`,
    message,
    channel,
    templateType: 'share_trading',
    templateData: tradeData
  });
};

/**
 * Send system maintenance notification
 */
export const sendMaintenanceNotification = async (
  recipient: string,
  channel: 'email' | 'sms' | 'both',
  maintenanceData: {
    startTime: string;
    endTime: string;
    affectedServices: string[];
    userName?: string;
  }
) => {
  const greeting = maintenanceData.userName ? `Dear ${maintenanceData.userName}` : 'Dear User';
  const services = maintenanceData.affectedServices.join(', ');
  const message = `${greeting}, system maintenance is scheduled from ${maintenanceData.startTime} to ${maintenanceData.endTime}. Affected services: ${services}`;
  
  return await CommunicationService.send({
    recipient,
    subject: 'Scheduled System Maintenance',
    message,
    channel,
    templateType: 'maintenance',
    templateData: maintenanceData
  });
};

/**
 * Send security alert
 */
export const sendSecurityAlert = async (
  recipient: string,
  channel: 'email' | 'sms' | 'both',
  securityData: {
    userName: string;
    alertType: 'login_attempt' | 'password_change' | 'suspicious_activity';
    location?: string;
    timestamp: string;
  }
) => {
  let message = `Dear ${securityData.userName}, `;
  
  switch (securityData.alertType) {
    case 'login_attempt':
      message += `a login attempt was detected on your account at ${securityData.timestamp}`;
      if (securityData.location) message += ` from ${securityData.location}`;
      break;
    case 'password_change':
      message += `your password was changed at ${securityData.timestamp}`;
      break;
    case 'suspicious_activity':
      message += `suspicious activity was detected on your account at ${securityData.timestamp}`;
      break;
  }
  
  message += '. If this wasn\'t you, please contact support immediately.';
  
  return await CommunicationService.send({
    recipient,
    subject: 'Security Alert - Yawatu Account',
    message,
    channel,
    templateType: 'security_alert',
    templateData: securityData
  });
};

// ============= VALIDATION HELPERS =============

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  return CommunicationService.isValidEmail(email);
};

/**
 * Validate phone number format
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  return CommunicationService.isValidPhoneNumber(phone);
};

/**
 * Format phone number to Uganda standard
 */
export const formatPhoneNumber = (phone: string): string => {
  return CommunicationService.formatPhoneNumber(phone);
};

/**
 * Determine best communication channel based on recipient
 */
export const getBestChannel = (recipient: string): 'email' | 'sms' | 'unknown' => {
  if (isValidEmail(recipient)) return 'email';
  if (isValidPhoneNumber(recipient)) return 'sms';
  return 'unknown';
};

/**
 * Clean and validate recipient
 */
export const cleanRecipient = (recipient: string): { cleaned: string; channel: 'email' | 'sms' | 'unknown' } => {
  const cleaned = recipient.trim();
  const channel = getBestChannel(cleaned);
  
  if (channel === 'sms') {
    return { cleaned: formatPhoneNumber(cleaned), channel };
  }
  
  return { cleaned, channel };
};

// ============= BATCH COMMUNICATION =============

/**
 * Send bulk notifications (be careful with rate limits)
 */
export const sendBulkNotifications = async (
  recipients: string[],
  subject: string,
  message: string,
  channel: 'email' | 'sms' | 'both' = 'email'
): Promise<{ success: number; failed: number; results: any[] }> => {
  let success = 0;
  let failed = 0;
  const results = [];
  
  for (const recipient of recipients) {
    try {
      const result = await CommunicationService.send({
        recipient,
        subject,
        message,
        channel
      });
      
      if (result.success) {
        success++;
      } else {
        failed++;
      }
      
      results.push({ recipient, ...result });
      
      // Add small delay to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      failed++;
      results.push({ recipient, success: false, message: error.message });
    }
  }
  
  return { success, failed, results };
};