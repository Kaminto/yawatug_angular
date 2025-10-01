import { supabase } from "@/integrations/supabase/client";

export interface CommunicationRequest {
  recipient: string;
  subject?: string;
  message: string;
  channel: 'email' | 'sms' | 'both';
  templateType?: string;
  templateData?: Record<string, any>;
}

export interface CommunicationResponse {
  success: boolean;
  message: string;
  data?: any;
  results?: {
    email?: { success: boolean; message: string; data?: any };
    sms?: { success: boolean; message: string; data?: any };
  };
}

export class UnifiedCommunicationService {
  /**
   * Send communication via email, SMS, or both channels
   */
  static async send(request: CommunicationRequest): Promise<CommunicationResponse> {
    const results: CommunicationResponse['results'] = {};
    let overallSuccess = true;
    const messages: string[] = [];

    try {
      // Send via email if requested
      if (request.channel === 'email' || request.channel === 'both') {
        try {
          const { data: response, error } = await supabase.functions.invoke('unified-communication-sender', {
            body: request
          });

          if (error) {
            results.email = { success: false, message: error.message };
            overallSuccess = false;
            messages.push(`Email failed: ${error.message}`);
          } else if (!response?.success) {
            results.email = { success: false, message: response?.message || 'Email service failed' };
            overallSuccess = false;
            messages.push(`Email failed: ${response?.message || 'Email service failed'}`);
          } else {
            results.email = { success: true, message: response.message || 'Email sent successfully', data: response.results?.email || response.data };
            messages.push('Email sent successfully');
          }
        } catch (error: any) {
          results.email = { success: false, message: error.message };
          overallSuccess = false;
          messages.push(`Email error: ${error.message}`);
        }
      }

      // Send via SMS if requested
      if (request.channel === 'sms' || request.channel === 'both') {
        try {
          const { data: response, error } = await supabase.functions.invoke('unified-communication-sender', {
            body: request
          });

          if (error) {
            results.sms = { success: false, message: error.message };
            overallSuccess = false;
            messages.push(`SMS failed: ${error.message}`);
          } else if (!response?.success) {
            results.sms = { success: false, message: response?.message || 'SMS service failed' };
            overallSuccess = false;
            messages.push(`SMS failed: ${response?.message || 'SMS service failed'}`);
          } else {
            results.sms = { success: true, message: response.message || 'SMS sent successfully', data: response.results?.sms || response.data };
            messages.push('SMS sent successfully');
          }
        } catch (error: any) {
          results.sms = { success: false, message: error.message };
          overallSuccess = false;
          messages.push(`SMS error: ${error.message}`);
        }
      }

      return {
        success: overallSuccess,
        message: messages.join(', '),
        results
      };

    } catch (error: any) {
      return {
        success: false,
        message: `Communication service error: ${error.message}`,
        results
      };
    }
  }

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
   * Send SMS notification
   */
  static async sendSMS(phoneNumber: string, message: string): Promise<CommunicationResponse> {
    return this.send({
      recipient: phoneNumber,
      message,
      channel: 'sms'
    });
  }

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

  /**
   * Send consent invitation via email
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
    return this.send({
      recipient: email,
      subject: 'Share Allocation Consent Required - Yawatu Minerals & Mining PLC',
      message: `Dear ${consentData.member_name}, you have been allocated ${consentData.allocated_shares} shares for debt conversion.`,
      channel: 'email',
      templateType: 'consent_invitation',
      templateData: consentData
    });
  }

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
   * Format phone number for SMS
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
}