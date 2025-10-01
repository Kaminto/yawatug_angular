// Environment and URL constants
export const getBaseUrl = (): string => {
  // Always use production domain for activation emails
  return 'https://yawatug.com';
};

// For development URLs (when you need the current origin)
export const getCurrentOrigin = (): string => {
  return typeof window !== 'undefined' ? window.location.origin : 'https://yawatug.com';
};

export const YAWATU_CONSTANTS = {
  PRODUCTION_URL: 'https://yawatug.com',
  COMPANY_NAME: 'Yawatu Minerals & Mining PLC',
  COMPANY_EMAIL: 'admin@yawatug.com',
  BRAND_COLORS: {
    PRIMARY: '#0E4D92',
    SECONDARY: '#F9B233',
  }
} as const;