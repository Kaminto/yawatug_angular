
export type UserStatus = 'active' | 'blocked' | 'unverified' | 'pending_verification';
export type AccountType = 'individual' | 'business' | 'organisation' | 'minor';
export type UserRole = 'user' | 'admin';
export type UserType = 'individual' | 'business' | 'organisation' | 'minor';

export interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  country_of_residence: string | null;
  town_city: string | null;
  address: string | null;
  tin: string | null;
  languages: string[] | null;
  account_type: AccountType | null;
  user_role: UserRole | null;
  user_type: UserType | null;
  status: UserStatus | null;
  profile_picture_url: string | null;
  profile_completion_percentage: number | null;
  created_at: string;
  updated_at: string;
  last_profile_update: string | null;
  gender: string | null;
  is_verified: boolean | null;
  verification_submitted_at: string | null;
  verification_reviewed_at: string | null;
  verification_reviewed_by: string | null;
  verification_notes: string | null;
  edit_requested: boolean | null;
  edit_request_status: string | null;
  edit_reason: string | null;
  edit_approved: boolean | null;
  last_edit_request: string | null;
  referral_code: string | null;
  referred_by: string | null;
  login_count: number | null;
  last_login: string | null;
  is_first_login: boolean | null;
}

export interface ProfileAudit {
  id: string;
  user_id: string;
  changed_by: string | null;
  change_type: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  admin_notes: string | null;
  created_at: string;
}

export interface ContactPerson {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
}

export interface UserDocument {
  id: string;
  type: string;
  url: string;
  document_number?: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  uploaded_at: string;
}
