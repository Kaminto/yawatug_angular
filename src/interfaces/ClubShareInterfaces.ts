export interface ClubShareAllocation {
  id: string;
  club_member_id: string;
  allocated_shares: number;
  transfer_fee_paid: number;
  debt_amount_settled: number;
  total_cost: number;
  cost_per_share: number;
  debt_rejected: number;
  allocation_status: string;
  consent_deadline: string;
  consent_signed_at?: string;
  rejection_reason?: string;
  rejection_count: number;
  last_rejection_at?: string;
  can_reapply_after?: string;
  admin_release_percentage: number;
  phased_release_schedule: any;
  import_batch_reference?: string;
  created_at: string;
  updated_at: string;
  // Relations
  investment_club_members?: {
    id: string;
    member_name: string;
    email?: string;
    phone?: string;
    user_id?: string;
  };
}

export interface ClubShareHoldingAccount {
  id: string;
  club_member_id: string;
  club_allocation_id: string;
  shares_quantity: number;
  shares_released: number;
  shares_remaining: number;
  status: string;
  expected_release_date?: string;
  created_at: string;
  updated_at: string;
  // Relations
  investment_club_members?: {
    id: string;
    member_name: string;
    email?: string;
    phone?: string;
    user_id?: string;
  };
  club_share_allocations?: {
    id: string;
    allocation_status: string;
    allocated_shares: number;
  };
}

export interface ClubShareReleaseLog {
  id: string;
  club_allocation_id: string;
  club_holding_account_id: string;
  shares_released: number;
  release_percentage: number;
  release_trigger: 'manual_admin' | 'automatic_ratio' | 'referral_bonus' | 'bulk_release';
  released_by_admin?: string;
  release_reason?: string;
  market_ratio_data?: any;
  user_share_holding_id?: string;
  released_at: string;
  created_at: string;
}

export interface ClubTransferFeeSettings {
  id: string;
  fee_type: 'percentage' | 'flat_rate' | 'percentage_plus_flat';
  percentage_rate: number;
  flat_fee_amount: number;
  minimum_fee: number;
  maximum_fee?: number;
  currency: string;
  is_active: boolean;
  applies_to: 'import_legacy' | 'post_conversion' | 'both';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ClubReleaseCriteriaSettings {
  id: string;
  criteria_type: string;
  sales_ratio_threshold: number;
  total_shares_for_sale: number;
  minimum_sales_volume: number;
  buyback_fund_threshold: number;
  time_based_schedule: any;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ClubAllocationImportData {
  member_name: string;
  email?: string;
  phone?: string;
  allocated_shares: number;
  transfer_fee_paid: number;
  debt_amount_settled: number;
  total_cost: number;
  cost_per_share: number;
  debt_rejected?: number;
  batch_reference?: string;
}

export interface ClubShareConsentFormData {
  allocation_id: string;
  consent_status: 'accept' | 'reject';
  rejection_reason?: string;
  digital_signature?: string;
}

export interface ClubReleaseRequest {
  allocation_ids: string[];
  release_type: 'percentage' | 'absolute';
  release_value: number;
  release_reason: string;
  schedule_release?: boolean;
  scheduled_date?: string;
}