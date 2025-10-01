export interface MerchantCode {
  id: string;
  provider_name: string;
  merchant_code: string;
  currency: string;
  is_active: boolean;
  environment: 'production' | 'sandbox';
  api_endpoint?: string;
  webhook_url?: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code?: string;
  swift_code?: string;
  currency: string;
  account_type: 'business' | 'escrow' | 'operational';
  is_active: boolean;
  is_primary: boolean;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}