import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { ShareBuyingLimits, AccountType } from '@/types/custom';

interface ShareBuyingValidatorProps {
  userProfile: any;
  quantity: number;
  sharePrice: number;
  availableShares: number;
  buyingLimits: ShareBuyingLimits | null;
  walletBalance: number;
  ownedShares?: number;
}

const ShareBuyingValidator: React.FC<ShareBuyingValidatorProps> = ({
  userProfile,
  quantity,
  sharePrice,
  availableShares,
  buyingLimits,
  walletBalance,
  ownedShares = 0
}) => {
  const totalAmount = quantity * sharePrice;
  const accountType = userProfile?.account_type as AccountType || 'individual';

  // Calculate effective min order using updated logic:
  // If held shares >= min limit, allow any quantity (min 1), else (min_limit - shares_held) is required
  const effectiveMinOrder = ownedShares >= (buyingLimits?.min_buy_amount || 0) ? 1 : Math.max(1, (buyingLimits?.min_buy_amount || 0) - ownedShares);

  // Validation checks  
  const validations = {
    quantity: quantity > 0,
    availability: quantity <= availableShares,
    minLimit: !buyingLimits || quantity >= effectiveMinOrder,
    maxLimit: !buyingLimits || quantity <= buyingLimits.max_buy_amount,
    balance: walletBalance >= totalAmount
  };

  const allValid = Object.values(validations).every(Boolean);

  const getValidationMessage = () => {
    if (!validations.quantity) return { type: 'error', message: 'Please enter a valid quantity' };
    if (!validations.availability) return { type: 'error', message: `Only ${availableShares} shares available` };
    if (!validations.minLimit && buyingLimits) {
      const minRequired = ownedShares >= buyingLimits.min_buy_amount ? 1 : (buyingLimits.min_buy_amount - ownedShares);
      return { 
        type: 'error', 
        message: ownedShares >= buyingLimits.min_buy_amount 
          ? `Minimum purchase is 1 share` 
          : `Minimum purchase is ${minRequired} shares (${buyingLimits.min_buy_amount} minimum - ${ownedShares} owned)`
      };
    }
    if (!validations.maxLimit && buyingLimits) return { type: 'error', message: `Maximum purchase limit is ${buyingLimits.max_buy_amount} shares for ${accountType} accounts` };
    if (!validations.balance) return { type: 'error', message: `Insufficient balance. Need UGX ${(totalAmount - walletBalance).toLocaleString()} more` };
    return { type: 'success', message: 'Ready to purchase' };
  };

  const validation = getValidationMessage();

  return (
    <Alert variant={validation.type === 'error' ? 'destructive' : 'default'}>
      {validation.type === 'error' ? (
        <AlertCircle className="h-4 w-4" />
      ) : validation.type === 'success' ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <Info className="h-4 w-4" />
      )}
      <AlertDescription>{validation.message}</AlertDescription>
    </Alert>
  );
};

export default ShareBuyingValidator;