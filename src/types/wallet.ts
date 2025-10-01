
export interface PaymentMethod {
  id: string;
  name: string;
  type: 'mobile_money' | 'bank_transfer' | 'card' | 'crypto';
  currency: string;
  is_active: boolean;
  details?: string;
  account_number?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  transaction_type: 'deposit' | 'withdraw' | 'transfer' | 'exchange';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference?: string;
  created_at: string;
  updated_at: string;
}

export interface WalletBalance {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  status: 'active' | 'frozen' | 'suspended';
  created_at: string;
  updated_at: string;
}
