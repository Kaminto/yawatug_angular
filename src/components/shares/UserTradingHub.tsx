
import React from 'react';
import EnhancedTradingHub from './enhanced/EnhancedTradingHub';

interface UserTradingHubProps {
  sharePool: any;
  userProfile: any;
  userId: string;
  userWallets: any[];
  userShares: any[];
  onTransactionComplete: () => Promise<void>;
  activeTab?: string;
}

const UserTradingHub: React.FC<UserTradingHubProps> = ({
  sharePool,
  userProfile,
  userId,
  userWallets,
  userShares,
  onTransactionComplete,
  activeTab
}) => {
  // Wrapper function to handle async onTransactionComplete
  const handleTransactionComplete = () => {
    onTransactionComplete();
  };

  return (
    <EnhancedTradingHub
      sharePool={sharePool}
      userProfile={userProfile}
      userId={userId}
      userWallets={userWallets}
      userShares={userShares}
      onTransactionComplete={handleTransactionComplete}
      activeTab={activeTab}
    />
  );
};

export default UserTradingHub;
