import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SMSRequest, VerifyOTPRequest, SMSResponse, SMSOTPState } from '@/types/sms';

/**
 * @deprecated Use useCommunication from '@/hooks/useCommunication' instead for OTP functionality
 * This hook is kept for backward compatibility
 */

interface UseSMSOTPOptions {
  onVerified?: () => void;
  onError?: (error: string) => void;
  autoCountdown?: boolean;
}

export const useSMSOTP = (options: UseSMSOTPOptions = {}) => {
  const { onVerified, onError, autoCountdown = true } = options;
  
  const [state, setState] = useState<SMSOTPState>({
    isLoading: false,
    isVerifying: false,
    otpSent: false,
    verified: false,
    error: null,
    countdown: 0,
  });

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Start countdown timer
  const startCountdown = useCallback((expiresAt: string) => {
    if (!autoCountdown) return;

    const expiryTime = new Date(expiresAt).getTime();
    
    const updateCountdown = () => {
      const now = Date.now();
      const timeLeft = Math.max(0, Math.floor((expiryTime - now) / 1000));
      
      setState(prev => ({ ...prev, countdown: timeLeft }));
      
      if (timeLeft <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setState(prev => ({ 
          ...prev, 
          countdown: 0,
          otpSent: false,
          error: 'OTP has expired. Please request a new one.'
        }));
      }
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);
  }, [autoCountdown]);

  // Send OTP
  const sendOTP = useCallback(async (request: SMSRequest): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('send-sms-otp', {
        body: request
      });

      if (error) throw error;

      const response: SMSResponse = data;

      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          otpSent: true, 
          verified: false,
          expiresAt: response.expires_at 
        }));

        if (response.expires_at) {
          startCountdown(response.expires_at);
        }

        toast.success('OTP sent successfully');
        return true;
      } else {
        throw new Error(response.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Failed to send OTP:', error);
      const errorMessage = error.message || 'Failed to send OTP';
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));

      if (error.message?.includes('Rate limit exceeded')) {
        toast.error('Too many OTP requests. Please wait before trying again.');
      } else {
        toast.error(errorMessage);
      }

      onError?.(errorMessage);
      return false;
    }
  }, [startCountdown, onError]);

  // Verify OTP
  const verifyOTP = useCallback(async (request: VerifyOTPRequest): Promise<boolean> => {
    setState(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      console.log('Verifying OTP with request:', { ...request, otp: '[HIDDEN]' });
      
      const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
        body: request
      });

      console.log('OTP verification response:', data, 'Error:', error);

      if (error) {
        // Network or unexpected function error
        throw error;
      }

      const response: SMSResponse & { verified?: boolean; remaining_attempts?: number } = data || {};
      const isVerified = response.verified === true || response.success === true;

      if (isVerified) {
        setState(prev => ({ 
          ...prev, 
          isVerifying: false, 
          verified: true, 
          otpSent: false,
          countdown: 0 
        }));

        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }

        toast.success('Phone number verified successfully');
        onVerified?.();
        return true;
      }

      // Handle graceful failure - improve error messaging
      const remaining = response.remaining_attempts;
      let msg = response.error || response.message || 'Invalid verification code';
      
      // Make error messages more user-friendly
      if (msg.includes('Invalid or expired')) {
        msg = 'Verification code is invalid or has expired. Please request a new code.';
      } else if (msg.includes('Invalid verification code')) {
        msg = 'The verification code you entered is incorrect. Please try again.';
      }

      setState(prev => ({ 
        ...prev, 
        isVerifying: false, 
        error: msg,
        remainingAttempts: remaining 
      }));

      if (typeof remaining === 'number' && remaining >= 0) {
        toast.error(`${msg} ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
      } else {
        toast.error(msg);
      }

      onError?.(msg);
      return false;
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      let errorMessage = 'Failed to verify code. Please try again.';
      
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setState(prev => ({ 
        ...prev, 
        isVerifying: false, 
        error: errorMessage
      }));

      toast.error(errorMessage);
      onError?.(errorMessage);
      return false;
    }
  }, [onVerified, onError]);

  // Reset state
  const reset = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    setState({
      isLoading: false,
      isVerifying: false,
      otpSent: false,
      verified: false,
      error: null,
      countdown: 0,
    });
  }, []);

  // Check if can resend (countdown finished)
  const canResend = state.countdown === 0 && !state.isLoading;

  // Format countdown for display
  const formatCountdown = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    ...state,
    sendOTP,
    verifyOTP,
    reset,
    canResend,
    formatCountdown: () => formatCountdown(state.countdown),
  };
};