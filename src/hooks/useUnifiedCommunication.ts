import { useState } from 'react';
import { CommunicationService, CommunicationRequest, CommunicationResponse } from '@/services/CommunicationService';
import { toast } from 'sonner';

/**
 * @deprecated Use useCommunication from '@/hooks/useCommunication' instead
 * This hook is kept for backward compatibility
 */

export interface UseCommunicationState {
  loading: boolean;
  lastResponse: CommunicationResponse | null;
  error: string | null;
}

export function useUnifiedCommunication() {
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

      // Format phone number if SMS channel
      if (request.channel === 'sms' || request.channel === 'both') {
        request.recipient = CommunicationService.formatPhoneNumber(request.recipient);
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

  const sendSMS = async (phoneNumber: string, message: string) => {
    return sendCommunication({
      recipient: phoneNumber,
      message,
      channel: 'sms'
    });
  };

  const sendBoth = async (recipient: string, subject: string, message: string) => {
    return sendCommunication({
      recipient,
      subject,
      message,
      channel: 'both'
    });
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
    return sendCommunication({
      recipient: email,
      subject: 'Share Allocation Consent Required - Yawatu Minerals & Mining PLC',
      message: `Dear ${consentData.member_name}, you have been allocated ${consentData.allocated_shares} shares for debt conversion.`,
      channel: 'email',
      templateType: 'consent_invitation',
      templateData: consentData
    });
  };

  const reset = () => {
    setState({
      loading: false,
      lastResponse: null,
      error: null
    });
  };

  return {
    ...state,
    sendCommunication,
    sendEmail,
    sendSMS,
    sendBoth,
    sendConsentInvitation,
    reset
  };
}