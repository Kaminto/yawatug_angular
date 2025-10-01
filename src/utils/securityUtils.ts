// Security utilities for enhanced protection

interface SecurityEvent {
  event_type: 'failed_login' | 'admin_access_attempt' | 'suspicious_activity' | 'rate_limit_exceeded';
  user_id?: string;
  email?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Input validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }

  const checks = [
    /[A-Z]/.test(password), // uppercase
    /[a-z]/.test(password), // lowercase
    /\d/.test(password),     // number
    /[!@#$%^&*(),.?":{}|<>]/.test(password) // special char
  ];

  const passedChecks = checks.filter(Boolean).length;
  
  if (passedChecks < 3) {
    return { 
      isValid: false, 
      message: 'Password must contain at least 3 of: uppercase, lowercase, number, special character' 
    };
  }

  return { isValid: true };
};

export const validatePhone = (phone: string): boolean => {
  // Basic phone validation - adjust regex based on your requirements
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Security event logging
export const logSecurityEvent = (event: SecurityEvent): void => {
  console.warn('SECURITY EVENT:', event);
  
  // In production, you would send this to a security monitoring service
  // For now, we'll log to console for development
};

// Rate limiting utilities
export const checkRateLimit = (
  key: string, 
  maxAttempts: number, 
  windowMinutes: number
): { allowed: boolean; remainingTime?: number } => {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  
  // Get or create rate limit data from localStorage
  const rateLimitData = localStorage.getItem(`rate_limit_${key}`);
  let attempts: number[] = rateLimitData ? JSON.parse(rateLimitData) : [];
  
  // Remove old attempts outside the window
  attempts = attempts.filter(time => now - time < windowMs);
  
  if (attempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...attempts);
    const remainingTime = Math.ceil((windowMs - (now - oldestAttempt)) / 1000 / 60);
    return { allowed: false, remainingTime };
  }
  
  // Add current attempt
  attempts.push(now);
  localStorage.setItem(`rate_limit_${key}`, JSON.stringify(attempts));
  
  return { allowed: true };
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
};

// CSRF token generation and validation
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  return token === storedToken && token.length === 64;
};

// Session timeout utilities
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const isSessionExpired = (lastActivity: number): boolean => {
  return Date.now() - lastActivity > SESSION_TIMEOUT_MS;
};

export const updateLastActivity = (): void => {
  localStorage.setItem('last_activity', Date.now().toString());
};

export const getLastActivity = (): number => {
  const lastActivity = localStorage.getItem('last_activity');
  return lastActivity ? parseInt(lastActivity) : Date.now();
};