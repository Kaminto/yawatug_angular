
import React from 'react';
import UserShareBuying from './UserShareBuying';

interface EnhancedUserShareBuyingProps {
  sharePool: any;
  userProfile: any;
  userId: string;
  userWallets: any[];
  onPurchaseComplete: () => Promise<void>;
}

const EnhancedUserShareBuying: React.FC<EnhancedUserShareBuyingProps> = ({
  sharePool,
  userProfile,
  userId,
  userWallets,
  onPurchaseComplete
}) => {
  return (
    <UserShareBuying
      sharePool={sharePool}
      userProfile={userProfile}
      userId={userId}
      wallets={userWallets}
      onPurchaseComplete={onPurchaseComplete}
    />
  );
};

export default EnhancedUserShareBuying;
