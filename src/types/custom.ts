
export interface ExtendedWallet {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  status: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export interface ShareData {
  id: string;
  price_per_share: number;
  total_shares: number;
  available_shares: number;
  reserved_shares?: number;
  sold_shares?: number;
  net_reserved_shares?: number;
  reserved_issued?: number;
  reserve_rate_percent?: number;
  reserve_allocated_shares?: number;
  reserve_issued_shares?: number;
  calculated_sold_shares?: number;
  price_status?: 'manual' | 'auto';
  price_calculation_mode?: string;
  currency: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface DividendDeclaration {
  id: string;
  declaration_date: string;
  per_share_amount: number;
  total_dividend: number;
  payment_type: 'cash' | 'bonus_shares';
  status: 'pending' | 'approved' | 'paid';
  description?: string;
  cut_off_date?: string;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

export type DividendPaymentType = 'cash' | 'bonus_shares';
export type DividendStatus = 'pending' | 'approved' | 'paid';

export interface UserWalletLimit {
  id: string;
  user_id: string;
  currency: string;
  daily_deposit_limit: number | null;
  daily_withdraw_limit: number | null;
  monthly_deposit_limit: number | null;
  monthly_withdraw_limit: number | null;
  is_suspended: boolean;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface AdminExpenseCategory {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface AdminExpense {
  id: string;
  category_id: string;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  processed_by: string;
  processed_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface PaymentGateway {
  id: string;
  name: string;
  type: 'mobile_money' | 'bank' | 'cash_office';
  currency: string;
  balance: number;
  is_active: boolean;
  account_details: any;
}

export interface SystemMonitorMetrics {
  total_users: number;
  active_wallets: number;
  total_transactions_today: number;
  total_volume_today: number;
  pending_approvals: number;
  system_health_score: number;
}

// Basic type definitions
export type UserStatus = 'unverified' | 'pending_verification' | 'verified' | 'blocked' | 'active';
export type AccountType = 'individual' | 'organisation' | 'business';
export type SharePricingMode = 'manual' | 'auto';
export type TransferRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
export type OrderStatus = 'pending' | 'approved' | 'active' | 'partially_paid' | 'completed' | 'cancelled' | 'rejected';

// Order management interfaces
export interface OrderAction {
  id: string;
  action: 'approve' | 'reject' | 'cancel' | 'extend_grace' | 'modify_quantity';
  reason?: string;
  additionalData?: Record<string, any>;
}

export interface AdminOrderFilters {
  status: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  userSearch?: string;
  amountRange?: {
    min: number;
    max: number;
  };
}

// Share-related interfaces
export interface ShareBuyingLimits {
  account_type: AccountType;
  min_buy_amount: number;
  max_buy_amount: number;
  credit_period_days: number;
  required_down_payment_percentage: number;
}

export interface ShareSellingLimits {
  account_type: AccountType;
  daily_sell_limit: number;
  weekly_sell_limit: number;
  monthly_sell_limit: number;
  min_sell_amount: number;
  max_sell_amount: number;
}

export interface ShareBuybackSettings {
  id: string;
  is_enabled: boolean;
  buyback_price_percentage: number;
  max_buyback_per_user: number;
  cooldown_period_days: number;
  created_at: string;
  updated_at: string;
}

export interface SharePool {
  id: string;
  name: string;
  total_shares: number;
  available_shares: number;
  reserved_shares?: number;
  reserved_issued?: number;
  price_per_share: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface AllocationRule {
  id: string;
  project_funding_percent: number;
  expenses_percent: number;
  buyback_percent: number;
  currency: string;
  is_active: boolean;
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

export interface RiskManagementSettings {
  id: string;
  max_daily_volume: number;
  max_single_transaction: number;
  volatility_threshold: number;
  auto_suspend_threshold: number;
  max_price_volatility?: number;
  circuit_breaker_threshold?: number;
  auto_pause_enabled?: boolean;
  notification_thresholds?: number[];
  created_at: string;
  updated_at: string;
}

export interface ShareTradingLimits {
  id: string;
  min_trade_amount: number;
  max_trade_amount: number;
  daily_limit: number;
  monthly_limit: number;
  min_buy_amount?: number;
  max_buy_amount?: number;
  daily_sell_limit?: number;
  weekly_sell_limit?: number;
  monthly_sell_limit?: number;
  transfer_fee_percentage?: number;
  transfer_flat_fee?: number;
  created_at: string;
  updated_at: string;
}
