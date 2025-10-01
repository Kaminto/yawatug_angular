/**
 * Comprehensive transaction type mapping for the Yawatu system
 * Handles wallet transactions, share transactions, and stock movements
 */

export const TRANSACTION_TYPES = {
  // Wallet transactions
  deposit: { label: 'Deposit', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  deposit_request: { label: 'Deposit Request', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  withdrawal: { label: 'Withdrawal', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  withdrawal_request: { label: 'Withdrawal Request', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  
  // Share transactions - user facing
  buy: { label: 'Buy Shares', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  purchase: { label: 'Share Purchase', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  sell: { label: 'Sell Shares', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  sale: { label: 'Share Sale', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  
  // Share stock movements - admin/system
  company_issue: { label: 'Company Issue', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
  reserve_issue: { label: 'Reserve Issue', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300' },
  dividend_issue: { label: 'Dividend Issue', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
  share_purchase: { label: 'Share Purchase', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  share_sale: { label: 'Share Sale', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  
  // Transfers
  transfer_in: { label: 'Transfer In', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300' },
  transfer_out: { label: 'Transfer Out', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  
  // Booking/progressive ownership (installment purchases)
  booking: { label: 'Installment Purchase', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
  booking_payment: { label: 'Installment Purchase', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
  booking_completion: { label: 'Installment Purchase', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
  
  // Other
  currency_exchange: { label: 'Currency Exchange', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300' },
  share_transfer_in: { label: 'Share Transfer In', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300' },
  share_transfer_out: { label: 'Share Transfer Out', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  dividend_payment: { label: 'Dividend Payment', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
} as const;

export type TransactionType = keyof typeof TRANSACTION_TYPES;

export const getTransactionTypeLabel = (type: string) => {
  return TRANSACTION_TYPES[type as TransactionType] || { 
    label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' 
  };
};

export const getAllTransactionTypes = () => {
  return Object.keys(TRANSACTION_TYPES);
};

export const getShareTransactionTypes = () => {
  return [
    'buy', 'purchase', 'sell', 'sale', 
    'company_issue', 'reserve_issue', 'dividend_issue',
    'transfer_in', 'transfer_out',
    'booking', 'booking_payment', 'booking_completion',
    'share_transfer_in', 'share_transfer_out'
  ];
};

export const getWalletTransactionTypes = () => {
  return [
    'deposit', 'deposit_request', 
    'withdrawal', 'withdrawal_request',
    'currency_exchange'
  ];
};
