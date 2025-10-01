import { supabase } from "@/integrations/supabase/client";

export interface CommunicationRequest {
  recipient: string;
  subject?: string;
  message: string;
  channel: 'email' | 'sms' | 'both';
  templateType?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  businessProcess?: string;
  businessReferenceId?: string;
  userId?: string;
  correlationId?: string;
}

export interface CommunicationResponse {
  success: boolean;
  message: string;
  data?: any;
  correlationId?: string;
  results?: {
    email?: { success: boolean; message: string; data?: any };
    sms?: { success: boolean; message: string; data?: any };
  };
}

export interface SMSOTPRequest {
  phoneNumber: string;
  purpose: 'wallet_transaction' | 'two_factor_auth' | 'verification' | 'password_reset';
  userId?: string;
  transactionType?: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface VerifyOTPRequest {
  phoneNumber: string;
  otp: string;
  purpose: 'wallet_transaction' | 'two_factor_auth' | 'verification' | 'password_reset';
  userId?: string;
}

/**
 * Centralized Communication Service with unified tracking for all SMS and Email communications
 */
export class CommunicationService {
  
  // ============= CORE COMMUNICATION METHODS WITH UNIFIED TRACKING =============
  
  /**
   * Send communication via email, SMS, or both channels using unified sender
   */
  static async send(request: CommunicationRequest): Promise<CommunicationResponse> {
    try {
      const unifiedRequest = {
        recipient: request.recipient,
        channel: request.channel,
        subject: request.subject,
        message: request.message,
        templateType: request.templateType,
        templateData: request.templateData,
        priority: request.priority,
        businessProcess: request.businessProcess,
        businessReferenceId: request.businessReferenceId,
        correlationId: request.correlationId,
        userId: request.userId
      };

      const { data, error } = await supabase.functions.invoke('unified-communication-sender', {
        body: unifiedRequest
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (!data?.success) {
        return { success: false, message: data?.message || 'Communication failed' };
      }

      return {
        success: true,
        message: data.message,
        results: data.results,
        correlationId: data.correlationId,
        data: data
      };

    } catch (error: any) {
      return {
        success: false,
        message: `Communication service error: ${error.message}`
      };
    }
  }


  // ============= EMAIL METHODS =============

  /**
   * Send email notification
   */
  static async sendEmail(to: string, subject: string, message: string, templateType?: string, templateData?: Record<string, any>): Promise<CommunicationResponse> {
    return this.send({
      recipient: to,
      subject,
      message,
      channel: 'email',
      templateType,
      templateData
    });
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(to: string, name: string, additionalMessage?: string): Promise<CommunicationResponse> {
    return this.sendEmail(
      to,
      'Welcome to Yawatu Minerals & Mining PLC',
      `Dear ${name}, welcome to Yawatu! ${additionalMessage || ''}`,
      'welcome',
      { name, additionalMessage }
    );
  }

  /**
   * Send activation email
   */
  static async sendActivationEmail(to: string, name: string, activationUrl: string): Promise<CommunicationResponse> {
    return this.sendEmail(
      to,
      'Activate Your Yawatu Account',
      `Dear ${name}, please activate your account by clicking the link: ${activationUrl}`,
      'activation',
      { name, activationUrl }
    );
  }

  /**
   * Send invitation email
   */
  static async sendInvitationEmail(to: string, name: string, invitationUrl: string, inviterName?: string): Promise<CommunicationResponse> {
    const message = inviterName 
      ? `Dear ${name}, ${inviterName} has invited you to join Yawatu. Click here: ${invitationUrl}`
      : `Dear ${name}, you've been invited to join Yawatu. Click here: ${invitationUrl}`;
      
    return this.sendEmail(
      to,
      'You\'re Invited to Join Yawatu',
      message,
      'invitation',
      { name, invitationUrl, inviterName }
    );
  }

  /**
   * Send consent invitation email using unified sender
   */
  static async sendConsentInvitation(
    email: string, 
    consentData: {
      club_allocation_id: string;
      club_member_id: string;
      phone: string;
      member_name: string;
      allocated_shares: number;
      debt_amount: number;
    }
  ): Promise<CommunicationResponse> {
    try {
      const unifiedRequest = {
        recipient: email,
        channel: 'email' as const,
        subject: 'Share Allocation Consent Required - Yawatu Minerals & Mining PLC',
        message: `Dear ${consentData.member_name}, you have been allocated ${consentData.allocated_shares} shares for debt conversion.`,
        templateType: 'consent_invitation',
        templateData: consentData,
        consentData: consentData,
        businessProcess: 'consent_invitation'
      };

      const { data, error } = await supabase.functions.invoke('unified-communication-sender', {
        body: unifiedRequest
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: data?.success || false,
        message: data?.message || 'Consent invitation processed',
        data: data
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // ============= SMS METHODS =============

  /**
   * Send SMS notification
   */
  static async sendSMS(phoneNumber: string, message: string): Promise<CommunicationResponse> {
    return this.send({
      recipient: phoneNumber,
      message,
      channel: 'sms'
    });
  }

  // ============= SMS OTP METHODS =============

  /**
   * Send SMS OTP using unified sender
   */
  static async sendSMSOTP(request: SMSOTPRequest): Promise<CommunicationResponse> {
    try {
      const unifiedRequest = {
        recipient: this.formatPhoneNumber(request.phoneNumber),
        channel: 'sms' as const,
        message: 'Your verification code is: {{OTP}}. Valid for 10 minutes.',
        otpRequest: {
          purpose: request.purpose,
          userId: request.userId,
          transactionType: request.transactionType,
          amount: request.amount,
          generateOTP: true
        },
        businessProcess: 'otp_verification'
      };

      const { data, error } = await supabase.functions.invoke('unified-communication-sender', {
        body: unifiedRequest
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { 
        success: data?.success || false, 
        message: data?.message || 'OTP request processed',
        data: data
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Verify SMS OTP
   */
  static async verifySMSOTP(request: VerifyOTPRequest): Promise<CommunicationResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
        body: {
          phoneNumber: this.formatPhoneNumber(request.phoneNumber),
          otp: request.otp,
          purpose: request.purpose,
          userId: request.userId
        }
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { 
        success: data.success, 
        message: data.message,
        data 
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // ============= MULTI-CHANNEL METHODS =============

  /**
   * Send notification via both email and SMS
   */
  static async sendBoth(recipient: string, subject: string, message: string): Promise<CommunicationResponse> {
    return this.send({
      recipient,
      subject,
      message,
      channel: 'both'
    });
  }

  // ============= UTILITY METHODS =============

  /**
   * Validate recipient based on channel
   */
  static validateRecipient(recipient: string, channel: 'email' | 'sms' | 'both'): boolean {
    if (channel === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
    }
    if (channel === 'sms') {
      return /^\+?[\d\s\-\(\)]+$/.test(recipient) && recipient.replace(/\D/g, '').length >= 10;
    }
    if (channel === 'both') {
      return this.validateRecipient(recipient, 'email') || this.validateRecipient(recipient, 'sms');
    }
    return false;
  }

  /**
   * Format phone number for SMS (Uganda format)
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Add country code if missing (assuming Uganda +256)
    if (digits.length === 9 && digits.startsWith('7')) {
      return `+256${digits}`;
    }
    if (digits.length === 10 && digits.startsWith('07')) {
      return `+256${digits.substring(1)}`;
    }
    if (digits.length === 12 && digits.startsWith('256')) {
      return `+${digits}`;
    }
    
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  /**
   * Check if a string is a valid email
   */
  static isValidEmail(email: string): boolean {
    return this.validateRecipient(email, 'email');
  }

  /**
   * Check if a string is a valid phone number
   */
  static isValidPhoneNumber(phone: string): boolean {
    return this.validateRecipient(phone, 'sms');
  }
}