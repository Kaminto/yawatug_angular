
export interface ShareData {
  id: string;
  name: string;
  price_per_share: number;
  currency: string;
  available_shares: number;
  total_shares: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UserShare {
  id: string;
  user_id: string;
  share_id: string;
  quantity: number;
  purchase_price_per_share: number;
  currency: string;
  created_at: string;
  updated_at: string;
  booking_id?: string; // Progressive ownership reference
  shares?: {
    id: string;
    name: string;
    price_per_share: number;
    currency: string;
  };
}

export interface ShareBooking {
  id: string;
  user_id: string;
  share_id: string;
  quantity: number;
  total_amount: number;
  down_payment_amount: number;
  remaining_amount: number;
  payment_schedule?: any;
  status: 'active' | 'completed' | 'cancelled' | 'expired' | 'partially_paid';
  auto_cancel_date?: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  booked_price_per_share: number;
  currency: string;
  // Progressive ownership fields
  shares_owned_progressively?: number;
  cumulative_payments?: number;
  payment_percentage?: number;
}

export interface ShareBuyingLimits {
  id: string;
  account_type: string;
  min_buy_amount: number;
  max_buy_amount: number;
  required_down_payment_percentage: number;
  credit_period_days: number;
  created_at: string;
  updated_at: string;
}

export interface BookingExtensionRequest {
  id: string;
  booking_id: string;
  user_id: string;
  requested_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserTransactionHistory {
  id: string;
  user_id: string;
  transaction_type: 'share_purchase' | 'share_sale' | 'share_transfer_in' | 'share_transfer_out' | 'dividend_payment' | 'wallet_deposit' | 'wallet_withdrawal' | 'currency_exchange';
  reference_id?: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_table: string;
  target_id?: string;
  old_values?: any;
  new_values?: any;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
