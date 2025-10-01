import React, { useState, useEffect } from 'react';
import { useEnhancedWalletContext } from '@/hooks/useEnhancedWalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import the new wallet components
import WalletOnboarding from './WalletOnboarding';
import QuickActionsPanel from './QuickActionsPanel';
import WalletInsightsDashboard from './WalletInsightsDashboard';
import TransactionConfirmationModal from './TransactionConfirmationModal';

// Import existing components
import RealTimeWalletBalance from './RealTimeWalletBalance';
import EnhancedWalletDepositForm from './EnhancedWalletDepositForm';
import EnhancedWalletWithdrawForm from './EnhancedWalletWithdrawForm';
import WalletTransferForm from './WalletTransferForm';
import WalletExchangeForm from './WalletExchangeForm';
import EnhancedTransactionHistory from './EnhancedTransactionHistory';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface Wallet {
  id: string;
  currency: string;
  balance: number;
  status: string;
}

interface TransactionData {
  type: 'deposit' | 'withdraw' | 'transfer' | 'exchange';
  amount: number;
  currency: string;
  recipient?: string;
  description?: string;
}

const IntegratedWalletFlow = React.forwardRef<{ setActiveTab: (tab: string) => void }, {}>((props, ref) => {
  const { currentUserId, loading: contextLoading, isAdmin } = useEnhancedWalletContext();
  
  // State management
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const transactionHistoryRef = React.useRef<{ refresh: () => void }>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);
  
  // Transaction confirmation state
  const [pendingTransaction, setPendingTransaction] = useState<TransactionData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!contextLoading && currentUserId) {
      initializeWallet();
    }
  }, [currentUserId, contextLoading]);

  const initializeWallet = async () => {
    try {
      setLoading(true);
      
      // Load wallet data
      const { data: walletsData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', currentUserId);
      
      setWallets(walletsData || []);
      
      // Check if this is a first-time user or if security setup is incomplete
      const { data: transactionCount } = await supabase
        .from('transactions')
        .select('id', { count: 'exact' })
        .eq('user_id', currentUserId);
      
      // Check security settings completion
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completion_percentage')
        .eq('id', currentUserId)
        .single();
      
      const { data: twoFactorAuth } = await supabase
        .from('two_factor_auth')
        .select('*')
        .eq('user_id', currentUserId)
        .single();
      
      const { data: userPin } = await supabase
        .from('user_pins')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      const hasTransactions = (transactionCount?.length || 0) > 0;
      const hasBalance = walletsData?.some(w => w.balance > 0) || false;
      const profileComplete = (profile?.profile_completion_percentage || 0) >= 80;
      const has2FA = twoFactorAuth?.sms_enabled || twoFactorAuth?.google_auth_enabled;
      const hasPin = !!userPin;
      
      // Show onboarding if profile is incomplete or no security is set up
      const securityIncomplete = !has2FA && !hasPin;
      
      if ((!hasTransactions || !profileComplete || securityIncomplete) && !isAdmin) {
        setIsFirstTimeUser(true);
        setShowOnboarding(true);
      }
      
    } catch (error) {
      console.error('Error initializing wallet:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const scrollToTabs = () => {
    if (tabsRef.current) {
      tabsRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  // Expose setActiveTab function via ref
  React.useImperativeHandle(ref, () => ({
    setActiveTab: (tab: string) => {
      setActiveTab(tab);
      // Small delay to ensure tab content is rendered before scrolling
      setTimeout(scrollToTabs, 100);
    }
  }));

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setActiveTab('overview');
  };

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'deposit':
        setActiveTab('deposit');
        break;
      case 'withdraw':
        setActiveTab('withdraw');
        break;
      case 'transfer':
        setActiveTab('transfer');
        break;
      case 'mobile-money':
        setActiveTab('deposit');
        // Could set a specific deposit method
        break;
      case 'qr-pay':
        // Handle QR payment flow
        toast.info('QR Payment feature coming soon!');
        break;
      default:
        console.log('Quick action:', actionId);
    }
  };

  const handleTransactionRequest = (transactionData: TransactionData) => {
    setPendingTransaction(transactionData);
    setShowConfirmation(true);
  };

  const handleConfirmTransaction = async () => {
    if (!pendingTransaction) return;
    
    // Process the transaction based on type
    try {
      // This would normally call the appropriate transaction processing function
      toast.success(`${pendingTransaction.type} transaction completed successfully!`);
      setShowConfirmation(false);
      setPendingTransaction(null);
      
      // Refresh wallet data
      await initializeWallet();
    } catch (error) {
      toast.error('Transaction failed. Please try again.');
    }
  };

  const getTotalBalance = () => {
    return wallets.reduce((total, wallet) => {
      if (wallet.currency === 'UGX') {
        return total + wallet.balance;
      }
      // Convert other currencies to UGX for display
      return total + (wallet.balance * 3700); // Example conversion rate
    }, 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  // Show onboarding for first-time users
  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <WalletOnboarding 
          onComplete={handleOnboardingComplete}
          isFirstTime={isFirstTimeUser}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Wallet Balance */}
      <RealTimeWalletBalance onTabSwitch={setActiveTab} />

      {/* Smart Suggestions & Highlights */}
      <QuickActionsPanel 
        onActionClick={handleQuickAction}
        userBalance={getTotalBalance()}
        currency="UGX"
      />

      {/* Main Wallet Interface */}
      <Tabs ref={tabsRef} value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">Overview</TabsTrigger>
          <TabsTrigger value="deposit" className="text-xs sm:text-sm py-2">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw" className="text-xs sm:text-sm py-2">Withdraw</TabsTrigger>
          <TabsTrigger value="transfer" className="text-xs sm:text-sm py-2">Transfer</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm py-2">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <WalletInsightsDashboard />
        </TabsContent>

        <TabsContent value="deposit">
          <EnhancedWalletDepositForm 
            wallets={wallets}
            onDepositComplete={initializeWallet}
          />
        </TabsContent>

        <TabsContent value="withdraw">
          <EnhancedWalletWithdrawForm 
            wallets={wallets}
            onWithdrawComplete={initializeWallet}
          />
        </TabsContent>

        <TabsContent value="transfer">
          <WalletTransferForm 
            wallets={wallets}
            onTransferComplete={() => transactionHistoryRef.current?.refresh()} 
          />
        </TabsContent>

        <TabsContent value="history">
          <EnhancedTransactionHistory ref={transactionHistoryRef} />
        </TabsContent>
      </Tabs>

      {/* Transaction Confirmation Modal */}
      <TransactionConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmTransaction}
        transaction={pendingTransaction}
      />

      {/* Quick Access Button for Settings */}
      <div className="fixed bottom-6 right-6">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg"
          onClick={() => toast.info('Settings panel coming soon!')}
        >
          ⚙️
        </Button>
      </div>
    </div>
  );
});

IntegratedWalletFlow.displayName = 'IntegratedWalletFlow';

export default IntegratedWalletFlow;