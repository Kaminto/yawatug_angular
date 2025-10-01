import { useState } from 'react';
import { CommunicationService, CommunicationRequest, CommunicationResponse, SMSOTPRequest, VerifyOTPRequest } from '@/services/CommunicationService';
import { toast } from 'sonner';

export interface UseCommunicationState {
  loading: boolean;
  lastResponse: CommunicationResponse | null;
  error: string | null;
}

/**
 * Centralized communication hook for all SMS and Email communications
 * This hook provides a unified interface for all communication needs
 */
export function useCommunication() {
  const [state, setState] = useState<UseCommunicationState>({
    loading: false,
    lastResponse: null,
    error: null
  });

  const sendCommunication = async (request: CommunicationRequest): Promise<CommunicationResponse> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Validate recipient
      if (!CommunicationService.validateRecipient(request.recipient, request.channel)) {
        const error = `Invalid recipient format for ${request.channel} channel`;
        setState(prev => ({ ...prev, loading: false, error }));
        toast.error(error);
        return { success: false, message: error };
      }

      const response = await CommunicationService.send(request);
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        lastResponse: response,
        error: response.success ? null : response.message
      }));

      // Show toast notification
      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }

      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        lastResponse: { success: false, message: errorMessage }
      }));
      
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // ============= EMAIL METHODS =============

  const sendEmail = async (to: string, subject: string, message: string, templateType?: string, templateData?: Record<string, any>) => {
    return sendCommunication({
      recipient: to,
      subject,
      message,
      channel: 'email',
      templateType,
      templateData
    });
  };

  const sendWelcomeEmail = async (to: string, name: string, additionalMessage?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await CommunicationService.sendWelcomeEmail(to, name, additionalMessage);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        lastResponse: response,
        error: response.success ? null : response.message
      }));
      
      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
      
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        lastResponse: { success: false, message: errorMessage }
      }));
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const sendActivationEmail = async (to: string, name: string, activationUrl: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await CommunicationService.sendActivationEmail(to, name, activationUrl);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        lastResponse: response,
        error: response.success ? null : response.message
      }));
      
      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
      
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        lastResponse: { success: false, message: errorMessage }
      }));
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const sendInvitationEmail = async (to: string, name: string, invitationUrl: string, inviterName?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await CommunicationService.sendInvitationEmail(to, name, invitationUrl, inviterName);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        lastResponse: response,
        error: response.success ? null : response.message
      }));
      
      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
      
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        lastResponse: { success: false, message: errorMessage }
      }));
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const sendConsentInvitation = async (
    email: string,
    consentData: {
      club_allocation_id: string;
      club_member_id: string;
      phone: string;
      member_name: string;
      allocated_shares: number;
      debt_amount: number;
    }
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await CommunicationService.sendConsentInvitation(email, consentData);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        lastResponse: response,
        error: response.success ? null : response.message
      }));
      
      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
      
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        lastResponse: { success: false, message: errorMessage }
      }));
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // ============= SMS METHODS =============

  const sendSMS = async (phoneNumber: string, message: string) => {
    return sendCommunication({
      recipient: phoneNumber,
      message,
      channel: 'sms'
    });
  };

  const sendSMSOTP = async (request: SMSOTPRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await CommunicationService.sendSMSOTP(request);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        lastResponse: response,
        error: response.success ? null : response.message
      }));
      
      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
      
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        lastResponse: { success: false, message: errorMessage }
      }));
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const verifySMSOTP = async (request: VerifyOTPRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await CommunicationService.verifySMSOTP(request);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        lastResponse: response,
        error: response.success ? null : response.message
      }));
      
      if (response.success) {
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
      
      return response;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        lastResponse: { success: false, message: errorMessage }
      }));
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // ============= MULTI-CHANNEL METHODS =============

  const sendBoth = async (recipient: string, subject: string, message: string) => {
    return sendCommunication({
      recipient,
      subject,
      message,
      channel: 'both'
    });
  };

  // ============= UTILITY METHODS =============

  const reset = () => {
    setState({
      loading: false,
      lastResponse: null,
      error: null
    });
  };

  const isValidEmail = (email: string) => CommunicationService.isValidEmail(email);
  const isValidPhoneNumber = (phone: string) => CommunicationService.isValidPhoneNumber(phone);
  const formatPhoneNumber = (phone: string) => CommunicationService.formatPhoneNumber(phone);

  return {
    // State
    ...state,
    
    // Core methods
    sendCommunication,
    
    // Email methods
    sendEmail,
    sendWelcomeEmail,
    sendActivationEmail,
    sendInvitationEmail,
    sendConsentInvitation,
    
    // SMS methods
    sendSMS,
    sendSMSOTP,
    verifySMSOTP,
    
    // Multi-channel
    sendBoth,
    
    // Utilities
    reset,
    isValidEmail,
    isValidPhoneNumber,
    formatPhoneNumber
  };
}