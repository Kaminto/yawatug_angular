
export interface ValidationError {
  field: string;
  message: string;
}

export interface BasicInfoFormData {
  full_name: string;
  phone: string;
  date_of_birth: string;
  nationality: string;
  country_of_residence: string;
  address: string;
  gender: string;
  account_type: string;
}

export const validateBasicInfo = (formData: BasicInfoFormData): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!formData.full_name?.trim()) {
    errors.push({ field: 'full_name', message: 'Full name is required' });
  }

  if (!formData.phone?.trim()) {
    errors.push({ field: 'phone', message: 'Phone number is required' });
  }

  if (!formData.date_of_birth) {
    errors.push({ field: 'date_of_birth', message: 'Date of birth is required' });
  }

  if (!formData.account_type) {
    errors.push({ field: 'account_type', message: 'Account type is required' });
  }

  // Format validations
  if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
  }

  if (formData.date_of_birth) {
    const birthDate = new Date(formData.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 13) {
      errors.push({ field: 'date_of_birth', message: 'You must be at least 13 years old' });
    }
    
    if (age > 120) {
      errors.push({ field: 'date_of_birth', message: 'Please enter a valid date of birth' });
    }
  }

  if (formData.full_name && formData.full_name.length < 2) {
    errors.push({ field: 'full_name', message: 'Full name must be at least 2 characters' });
  }

  return errors;
};

export const validateForVerification = (
  profile: any,
  documents: any[],
  contactPersons: any[]
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Basic info validation
  const basicInfoErrors = validateBasicInfo({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    date_of_birth: profile?.date_of_birth || '',
    nationality: profile?.nationality || '',
    country_of_residence: profile?.country_of_residence || '',
    address: profile?.address || '',
    gender: profile?.gender || '',
    account_type: profile?.account_type || ''
  });
  
  errors.push(...basicInfoErrors);

  // Document validation
  if (documents.length === 0) {
    errors.push({ field: 'documents', message: 'At least one document is required' });
  }

  // Contact person validation
  if (contactPersons.length === 0) {
    errors.push({ field: 'contacts', message: 'At least one emergency contact is required' });
  }

  return errors;
};
