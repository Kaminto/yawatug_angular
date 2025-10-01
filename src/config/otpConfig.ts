export interface OTPConfig {
  localCountries: string[];
  defaultMethod: 'sms' | 'email';
  fallbackMethod: 'sms' | 'email';
  smsEnabled: boolean;
  emailEnabled: boolean;
}

export const OTP_CONFIG: OTPConfig = {
  // East African countries where SMS is preferred for local users
  localCountries: ['UG', 'KE', 'TZ', 'UGX', 'KES', 'TZS'],
  defaultMethod: 'sms',
  fallbackMethod: 'email', 
  smsEnabled: true,
  emailEnabled: true
};

export const isLocalUser = (countryCode?: string, currency?: string): boolean => {
  if (!countryCode && !currency) return true; // Default to local for SMS preference
  
  return OTP_CONFIG.localCountries.some(code => 
    code === countryCode || 
    code === currency ||
    (countryCode && countryCode.startsWith(code)) ||
    (currency && currency.startsWith(code))
  );
};

export const getPreferredOTPMethod = (countryCode?: string, currency?: string): 'sms' | 'email' => {
  // For local users, prefer SMS
  if (isLocalUser(countryCode, currency)) {
    return OTP_CONFIG.smsEnabled ? 'sms' : 'email';
  }
  
  // For international users, prefer email but allow SMS if enabled
  return OTP_CONFIG.emailEnabled ? 'email' : 'sms';
};

export const getOTPMethodsAvailable = (countryCode?: string, currency?: string) => {
  const isLocal = isLocalUser(countryCode, currency);
  const preferred = getPreferredOTPMethod(countryCode, currency);
  
  const methods: Array<{value: 'sms' | 'email', label: string, icon: string, preferred: boolean}> = [];
  
  if (OTP_CONFIG.smsEnabled) {
    methods.push({
      value: 'sms',
      label: isLocal ? 'SMS (Recommended for local users)' : 'SMS',
      icon: 'smartphone',
      preferred: preferred === 'sms'
    });
  }
  
  if (OTP_CONFIG.emailEnabled) {
    methods.push({
      value: 'email', 
      label: !isLocal ? 'Email (Recommended for international users)' : 'Email',
      icon: 'mail',
      preferred: preferred === 'email'
    });
  }
  
  return methods;
};