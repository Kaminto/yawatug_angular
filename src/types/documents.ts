
export type DocumentType = 
  | 'national_id'
  | 'passport'
  | 'birth_certificate'
  | 'guardian_id'
  | 'proof_of_address'
  | 'business_registration'
  | 'trading_license'
  | 'operational_permit'
  | 'registration_certificate';

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export const getDocumentTypesByUserType = (accountType: string, dateOfBirth?: string): DocumentType[] => {
  // Calculate age if dateOfBirth is provided
  const getAge = () => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = getAge();

  switch (accountType) {
    case 'individual':
      if (age !== null && age < 18) {
        // Minor: birth certificate + guardian ID + proof of address
        return ['birth_certificate', 'guardian_id', 'proof_of_address'];
      }
      // Adult: National ID or Passport + proof of address
      return ['national_id', 'passport', 'proof_of_address'];
    case 'business':
      return ['business_registration', 'trading_license', 'proof_of_address'];
    case 'organisation':
      return ['registration_certificate', 'operational_permit', 'proof_of_address'];
    default:
      return [];
  }
};

export const getDocumentLabel = (type: DocumentType): string => {
  const labels: Record<DocumentType, string> = {
    national_id: 'National ID',
    passport: 'Passport',
    birth_certificate: 'Birth Certificate',
    guardian_id: 'Guardian National ID/Passport',
    proof_of_address: 'Proof of Address',
    business_registration: 'Business Registration Certificate',
    trading_license: 'Trading License',
    operational_permit: 'Operational Permit',
    registration_certificate: 'Registration Certificate'
  };
  return labels[type] || type;
};
