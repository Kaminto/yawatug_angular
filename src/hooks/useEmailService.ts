import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CommunicationService } from '@/services/CommunicationService';

/**
 * @deprecated Use useCommunication from '@/hooks/useCommunication' instead
 * This hook is kept for backward compatibility
 */

export interface EmailRequest {
  to: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateType?: string;
  templateData?: Record<string, any>;
  fromEmail?: string;
  fromName?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface EmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
  provider?: string;
  error?: string;
}

export interface UseEmailServiceState {
  loading: boolean;
  lastResponse: EmailResponse | null;
  error: string | null;
}

export function useEmailService() {
  const [state, setState] = useState<UseEmailServiceState>({
    loading: false,
    lastResponse: null,
    error: null
  });

  const sendEmail = async (emailRequest: EmailRequest): Promise<EmailResponse> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Validate required fields
      if (!emailRequest.to || !emailRequest.subject) {
        const error = 'Email address and subject are required';
        setState(prev => ({ ...prev, loading: false, error }));
        toast({
          title: "Validation Error",
          description: error,
          variant: "destructive"
        });
        return { success: false, message: error };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailRequest.to)) {
        const error = 'Invalid email address format';
        setState(prev => ({ ...prev, loading: false, error }));
        toast({
          title: "Validation Error",
          description: error,
          variant: "destructive"
        });
        return { success: false, message: error };
      }

      // Set defaults
      const request = {
        ...emailRequest,
        fromEmail: emailRequest.fromEmail || 'admin@yawatug.com',
        fromName: emailRequest.fromName || 'Yawatu Minerals & Mining PLC',
        priority: emailRequest.priority || 'normal'
      };

      console.log('Sending email:', { 
        to: request.to, 
        subject: request.subject, 
        templateType: request.templateType 
      });

      const { data, error } = await supabase.functions.invoke('unified-communication-sender', {
        body: request
      });

      if (error) {
        console.error('Email service error:', error);
        const errorMessage = error.message || 'Failed to send email';
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: errorMessage,
          lastResponse: { success: false, message: errorMessage }
        }));
        
        toast({
          title: "Email Error",
          description: errorMessage,
          variant: "destructive"
        });

        return { success: false, message: errorMessage };
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Email service returned failure';
        console.error('Email service returned failure:', data);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: errorMessage,
          lastResponse: { success: false, message: errorMessage }
        }));
        
        toast({
          title: "Email Failed",
          description: errorMessage,
          variant: "destructive"
        });

        return { success: false, message: errorMessage };
      }

      // Success
      const response: EmailResponse = {
        success: true,
        message: data.message || 'Email sent successfully',
        messageId: data.messageId,
        provider: data.provider
      };

      setState(prev => ({ 
        ...prev, 
        loading: false, 
        lastResponse: response,
        error: null
      }));

      toast({
        title: "Email Sent",
        description: `${response.message} (via ${response.provider})`,
        variant: "default"
      });

      return response;
    } catch (error: any) {
      console.error('Email hook error:', error);
      const errorMessage = error.message || 'Unknown email service error';
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: errorMessage,
        lastResponse: { success: false, message: errorMessage }
      }));
      
      toast({
        title: "Email Service Error",
        description: errorMessage,
        variant: "destructive"
      });

      return { success: false, message: errorMessage };
    }
  };

  // Convenience methods for common email types
  const sendWelcomeEmail = async (
    to: string, 
    name: string, 
    additionalMessage?: string
  ) => {
    return sendEmail({
      to,
      subject: 'Welcome to Yawatu Minerals & Mining PLC',
      templateType: 'welcome',
      templateData: {
        name,
        message: additionalMessage || 'We\'re excited to have you on board!'
      }
    });
  };

  const sendActivationEmail = async (
    to: string, 
    name: string, 
    activationUrl: string
  ) => {
    return sendEmail({
      to,
      subject: 'Activate Your Yawatu Account',
      templateType: 'activation',
      templateData: {
        name,
        activation_url: activationUrl,
        message: 'Please activate your account to start using all features.'
      },
      priority: 'high'
    });
  };

  const sendInvitationEmail = async (
    to: string, 
    name: string, 
    invitationUrl: string,
    inviterName?: string
  ) => {
    return sendEmail({
      to,
      subject: 'Invitation to Join Yawatu',
      templateType: 'invitation', 
      templateData: {
        name,
        invitation_url: invitationUrl,
        message: inviterName 
          ? `${inviterName} has invited you to join Yawatu Minerals & Mining PLC.`
          : 'You have been invited to join Yawatu Minerals & Mining PLC.'
      },
      priority: 'high'
    });
  };

  const sendNotificationEmail = async (
    to: string,
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ) => {
    return sendEmail({
      to,
      subject: title,
      templateType: 'notification',
      templateData: {
        title,
        message
      },
      priority
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
    sendEmail,
    sendWelcomeEmail,
    sendActivationEmail,
    sendInvitationEmail,
    sendNotificationEmail,
    reset
  };
}