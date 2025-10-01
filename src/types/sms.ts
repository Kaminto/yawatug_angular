export interface SMSConfig {
  rate_limits: {
    per_user_per_10min: number;
    per_phone_per_hour: number;
    per_user_per_day: number;
  };
  otp_settings: {
    length: number;
    expiry_minutes: number;
    max_attempts: number;
    block_duration_minutes: number;
  };
  message_templates: Record<string, string>;
  provider_settings: {
    primary: string;
    failover_enabled: boolean;
    retry_attempts: number;
    timeout_seconds: number;
  };
}

export interface SMSRequest {
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

export interface SMSResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  expires_at?: string;
  expires_in_minutes?: number;
  remaining_attempts?: number;
}

export interface OTPRecord {
  id: string;
  user_id: string;
  phone_number: string;
  otp_code: string;
  purpose: string;
  expires_at: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
  attempt_count: number;
  max_attempts: number;
  is_blocked: boolean;
  blocked_until?: string;
  ip_address?: string;
  user_agent?: string;
  sms_status: 'pending' | 'sent' | 'delivered' | 'failed';
  sms_provider_response?: any;
  sms_sent_at?: string;
  delivery_attempts: number;
}

export interface SMSDeliveryLog {
  id: string;
  otp_id: string;
  phone_number: string;
  message_content: string;
  provider_name: string;
  provider_response?: any;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'expired';
  cost_amount?: number;
  cost_currency?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  failure_reason?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface SMSRateLimit {
  id: string;
  user_id: string;
  phone_number: string;
  window_start: string;
  window_end: string;
  attempts_count: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface SMSError {
  code: 'RATE_LIMIT_EXCEEDED' | 'SMS_SEND_FAILED' | 'INVALID_OTP' | 'OTP_BLOCKED' | 'OTP_EXPIRED' | 'PHONE_NUMBER_INVALID' | 'SMS_CONFIG_ERROR';
  message: string;
  details?: any;
}

export interface SMSOTPState {
  isLoading: boolean;
  isVerifying: boolean;
  otpSent: boolean;
  verified: boolean;
  error: string | null;
  countdown: number;
  remainingAttempts?: number;
  expiresAt?: string;
}