
export interface ShareBooking {
  id: string;
  user_id: string;
  share_id: string;
  quantity: number;
  total_amount: number;
  down_payment_amount: number;
  remaining_amount: number;
  payment_schedule: any;
  status: 'active' | 'completed' | 'cancelled' | 'partially_paid';
  auto_cancel_date?: string;
  created_at: string;
  updated_at: string;
  // Progressive ownership fields
  shares_owned_progressively?: number;
  cumulative_payments?: number;
  payment_percentage?: number;
}

export interface ShareBookingPayment {
  id: string;
  booking_id: string;
  payment_amount: number;
  payment_date: string;
  payment_method?: string;
  transaction_id?: string;
  created_at: string;
}

export interface SharePriceCalculation {
  id: string;
  calculation_date: string;
  previous_price: number;
  mining_profit: number;
  dividend_paid: number;
  market_activity_adjustment: number;
  buy_sell_ratio: number;
  new_price: number;
  calculation_method: 'manual' | 'auto';
  admin_notes?: string;
  created_by?: string;
  created_at: string;
}

export interface AutoPricingSettings {
  id: string;
  is_enabled: boolean;
  update_frequency: 'daily' | 'weekly' | 'monthly';
  mining_profit_weight: number;
  dividend_weight: number;
  market_activity_weight: number;
  max_price_increase_percent: number;
  max_price_decrease_percent: number;
  minimum_price_floor: number;
  last_calculation_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ShareReserveTracking {
  id: string;
  reserve_type: 'admin_pool' | 'promotions' | 'buyback_reserve';
  allocated_quantity: number;
  used_quantity: number;
  remaining_quantity: number;
  allocation_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketActivityLog {
  id: string;
  activity_date: string;
  total_buy_orders: number;
  total_sell_orders: number;
  total_buy_volume: number;
  total_sell_volume: number;
  buy_sell_ratio: number;
  market_sentiment: 'bullish' | 'bearish' | 'neutral';
  created_at: string;
}

export interface UserShareHolding {
  id: string;
  user_id: string;
  share_id: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  source_type: 'purchase' | 'transfer' | 'dividend';
  source_reference?: string;
  fifo_order?: number;
  is_locked: boolean;
  created_at: string;
}

export interface EnhancedBuybackOrder {
  id: string;
  user_id: string;
  share_id: string;
  quantity: number;
  original_quantity?: number;
  remaining_quantity?: number;
  requested_price: number;
  partial_payment?: number;
  total_payments_made?: number;
  payment_percentage?: number;
  payment_schedule?: any;
  status: 'pending' | 'partial' | 'completed' | 'cancelled' | 'expired';
  fifo_position?: number;
  last_payment_date?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  completed_at?: string;
  profiles?: { full_name: string; email: string };
}

export interface P2PShareTrade {
  id: string;
  seller_id: string;
  buyer_id?: string;
  share_id: string;
  quantity: number;
  price_per_share: number;
  total_amount: number;
  escrow_amount: number;
  status: 'open' | 'pending' | 'completed' | 'cancelled' | 'expired';
  trade_type: 'direct' | 'auction' | 'bid';
  expires_at?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  notes?: string;
  seller?: { full_name: string; email: string };
  buyer?: { full_name: string; email: string };
}

export interface SmartBuybackSettings {
  id: string;
  is_enabled: boolean;
  algorithm_type: 'fifo' | 'price_weighted' | 'time_weighted';
  max_daily_amount: number;
  min_fund_threshold: number;
  auto_approval_limit: number;
  batch_processing_size: number;
  processing_frequency: 'hourly' | 'daily' | 'weekly';
  market_price_factor: number;
  created_at: string;
  updated_at: string;
}

export interface WalletShareIntegration {
  wallet_id: string;
  share_transaction_id: string;
  integration_type: 'purchase' | 'sale' | 'dividend' | 'buyback';
  amount: number;
  currency: string;
  exchange_rate?: number;
  processing_status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

// New interfaces for enhanced admin functionality
export interface ShareOrderBook {
  id: string;
  user_id: string;
  share_id: string;
  order_type: 'buy' | 'sell';
  order_method: 'market' | 'limit';
  quantity: number;
  price_per_share: number;
  market_price_at_order: number;
  price_tolerance_percent: number;
  total_amount: number;
  status: 'pending' | 'partial' | 'completed' | 'cancelled' | 'expired';
  filled_quantity: number;
  remaining_quantity: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  completed_at?: string;
}

export interface MarketPriceToleranceSettings {
  id: string;
  max_buy_discount_percent: number;
  max_sell_premium_percent: number;
  order_expiry_hours: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShareSellingRules {
  id: string;
  account_type: string;
  daily_sell_limit: number;
  weekly_sell_limit: number;
  monthly_sell_limit: number;
  min_sell_amount: number;
  max_sell_amount: number;
  installment_allowed: boolean;
  min_installment_period_days?: number;
  max_installment_period_days?: number;
  min_down_payment_percent?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnhancedDividendDeclaration {
  id: string;
  declaration_date: string;
  per_share_amount: number;
  total_dividend: number;
  company_valuation: number;
  market_cap: number;
  payment_type: 'cash' | 'stock' | 'mixed';
  status: 'pending' | 'approved' | 'paid';
  description?: string;
  cut_off_date?: string;
  payment_date?: string;
  eligible_shareholders_count?: number;
  total_eligible_shares?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ShareReserveSettings {
  id: string;
  share_id: string;
  reserve_rate_percent: number;
  reserve_allocated_shares: number;
  reserve_issued_shares: number;
  available_reserve_shares: number;
  created_at: string;
  updated_at: string;
}
