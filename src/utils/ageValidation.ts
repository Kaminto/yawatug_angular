export const calculateAge = (dateOfBirth: string): number => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const validateAgeForAccountType = (accountType: string, dateOfBirth: string): {
  isValid: boolean;
  message?: string;
  requiresGuardian?: boolean;
} => {
  const age = calculateAge(dateOfBirth);
  
  switch (accountType) {
    case 'individual':
      if (age < 13) {
        return {
          isValid: false,
          message: 'Users under 13 years old cannot register. A guardian must register on their behalf.'
        };
      } else if (age < 18) {
        return {
          isValid: true,
          message: 'Minor accounts require guardian documentation for verification.',
          requiresGuardian: true
        };
      }
      return { isValid: true };
    
    case 'business':
    case 'organisation':
      // For business/org accounts, the date represents registration date, not birth date
      return { isValid: true };
    
    default:
      return { isValid: true };
  }
};

export const getMinimumAgeDate = (accountType: string): string | undefined => {
  if (accountType === 'individual') {
    // Minimum age of 13 years
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 13);
    return minDate.toISOString().split('T')[0];
  }
  return undefined;
};