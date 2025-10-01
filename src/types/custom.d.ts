// Define available user roles
export type UserRole = 'admin' | 'user' | 'moderator';

// Define available user types - updated to match standardized account types
export type AccountType = 'individual' | 'organisation' | 'business';

// Define user status options - updated to match database  
export type UserStatus = 'unverified' | 'pending_verification' | 'verified' | 'blocked' | 'active';

// Define share pricing modes
export type SharePricingMode = 'manual' | 'auto';

// Define document types - updated to match database
export type DocumentType = 'national_id' | 'passport' | 'driving_license' | 'birth_certificate' | 'organization_certificate' | 'tax_certificate' | 'proof_of_address' | 'business_registration' | 'trading_license' | 'operational_permit' | 'registration_certificate' | 'other';

// Define document status
export type DocumentStatus = 'pending' | 'approved' | 'rejected';

// Define relationship types - updated to match database
export type RelationshipType = 'next_of_kin' | 'spouse' | 'child' | 'parent' | 'sibling' | 'friend' | 'business_partner' | 'guardian' | 'director' | 'other';

// Admin session data returned from check_active_admin_session
export interface AdminSessionData {
  user_id: string;
}

// East African languages
export type EastAfricanLanguage = 'Swahili' | 'Luganda' | 'Kinyarwanda' | 'Amharic' | 'Oromo' | 'Somali' | 'Tigrinya' | 'Kikuyu' | 'Luo' | 'Gikuyu' | 'Other';

// Define share transaction types
export type ShareTransactionType = 'purchase' | 'sale' | 'transfer' | 'buyback' | 'dividend';

// Define share pricing modes
export type SharePricingMode = 'manual' | 'auto';

// Define dividend payment types
export type DividendPaymentType = 'cash' | 'shares' | 'mixed';

// Define project status
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'suspended' | 'cancelled';

// Define buyback order status
export type BuybackOrderStatus = 'pending' | 'partial' | 'completed' | 'cancelled' | 'expired';

// Define transfer request status
export type TransferRequestStatus = 'pending' | 'completed' | 'cancelled';

// Define account type buying limits - standardized to three types
export interface ShareBuyingLimits {
  id?: string;
  account_type: AccountType;
  min_buy_amount: number;
  max_buy_amount: number;
  credit_period_days: number;
  required_down_payment_percentage: number;
  created_at?: string;
  updated_at?: string;
}

// Define selling limits
export interface ShareSellingLimits {
  id?: string;
  limit_type: 'quantity' | 'percentage';
  limit_value: number;
  period_type: 'day' | 'week' | 'month' | 'quarter' | 'year';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Admin wallet interfaces
export interface AdminWallet {
  id: string;
  wallet_type: 'main' | 'project_funding' | 'admin_expenses' | 'share_buyback';
  currency: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface AdminWalletTransaction {
  id: string;
  admin_wallet_id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  description: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  admin_wallet: AdminWallet;
}

export interface AllocationRule {
  id: string;
  project_funding_percent: number;
  expenses_percent: number;
  buyback_percent: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionFeeSettings {
  id: string;
  transaction_type: string;
  flat_fee: number;
  percentage_fee: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CurrencyConversion {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  created_at: string;
  updated_at: string;
}

// Mining project interface
export interface MiningProject {
  id: string;
  name: string;
  description?: string;
  project_type?: string;
  location?: string;
  status: ProjectStatus;
  target_funding: number;
  current_funding?: number;
  expected_returns?: number;
  start_date?: string;
  expected_completion?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Share buyback order interface
export interface ShareBuybackOrder {
  id: string;
  user_id: string;
  share_id: string;
  quantity: number;
  requested_price: number;
  partial_payment?: number;
  payment_percentage?: number;
  status: BuybackOrderStatus;
  fifo_position?: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  completed_at?: string;
}

// Share transfer request interface
export interface ShareTransferRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  share_id: string;
  quantity: number;
  transfer_fee?: number;
  reason?: string;
  status: TransferRequestStatus;
  created_at: string;
  completed_at?: string;
}

// Buyback settings interface
export interface ShareBuybackSettings {
  id: string;
  mode: 'auto' | 'manual';
  daily_limit?: number;
  weekly_limit?: number;
  monthly_limit?: number;
  quarterly_limit?: number;
  yearly_limit?: number;
  buyback_fund?: number;
  auto_cancel_days?: number;
  min_payment_percentage?: number;
  created_at: string;
  updated_at: string;
}

// Extended wallet interface for user management
export interface ExtendedWallet {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  status?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

// Share pool interface - updated without buyback_fund
export interface SharePool {
  id: string;
  name: string;
  total_shares: number;
  available_shares: number;
  reserved_shares: number;
  reserved_issued?: number;
  price_per_share: number;
  currency: string;
  initial_price: number;
  start_date: string;
  buy_back_limit: number;
  buy_back_mode: string;
  price_calculation_mode: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Dividend declaration interface
export interface DividendDeclaration {
  id: string;
  declaration_date: string;
  company_valuation: number;
  market_cap: number;
  total_dividend: number;
  per_share_amount: number;
  payment_type: DividendPaymentType;
  cut_off_date?: string;
  payment_date?: string;
  description?: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Profile interface with improved fields
export interface ProfileData {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  account_type?: AccountType;
  nationality?: string;
  country_of_residence?: string;
  town_city?: string;
  date_of_birth?: string;
  gender?: string;
  tin?: string;
  languages?: string[];
  status?: UserStatus;
  profile_picture_url?: string;
  edit_requested?: boolean;
  edit_request_status?: string;
  created_at?: string;
  updated_at?: string;
}

// Document interface for uploads
export interface DocumentData {
  id: string;
  user_id: string;
  type: DocumentType;
  document_number?: string;
  url: string;
  status: DocumentStatus;
  feedback?: string;
  uploaded_at: string;
  updated_at?: string;
}

// Wallet transaction interface
export interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  reference?: string;
  description?: string;
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

// Payment method interface
export interface PaymentMethodData {
  id: string;
  name: string;
  type: 'mobile_money' | 'bank_transfer' | 'card' | 'crypto';
  currency: string;
  is_active: boolean;
  account_number?: string;
  details?: string;
  created_at: string;
  updated_at: string;
}

// Pending approval interface for admin
export interface PendingApproval {
  id: string;
  user_id: string;
  transaction_id?: string;
  approval_type: 'deposit' | 'withdrawal' | 'verification' | 'profile_edit';
  amount?: number;
  currency?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  processed_at?: string;
  processed_by?: string;
  notes?: string;
}

// New interfaces for referral system
export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// New interfaces for agent system
export interface AgentApplication {
  id: string;
  user_id: string;
  reason: string;
  location: string;
  expected_customers: number;
  experience?: string;
  business_plan?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// New interfaces for support system
export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: 'technical' | 'account' | 'shares' | 'wallet' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  attachments?: string[];
  created_at: string;
}

// New interface for project funding
export interface ProjectFunding {
  id: string;
  project_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  pledged_at: string;
  confirmed_at?: string;
}
