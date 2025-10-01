
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, ArrowUpRight, ArrowRightLeft, Repeat, History, Settings, Shield, Play, Trash2 } from 'lucide-react';
import { useEnhancedWalletContext } from '@/hooks/useEnhancedWalletContext';
import { useDemoData } from '@/hooks/useDemoData';
import { WalletSkeleton, TransactionSkeleton } from '@/components/ui/enhanced-skeleton';
import RealTimeWalletBalance from '@/components/wallet/RealTimeWalletBalance';
import EnhancedWalletDepositForm from '@/components/wallet/EnhancedWalletDepositForm';
import EnhancedWalletWithdrawForm from '@/components/wallet/EnhancedWalletWithdrawForm';
import WalletTransferForm from '@/components/wallet/WalletTransferForm';
import WalletExchangeForm from '@/components/wallet/WalletExchangeForm';
import EnhancedTransactionHistory from '@/components/wallet/EnhancedTransactionHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Wallet {
  id: string;
  currency: string;
  balance: number;
  status: string;
}

const EnhancedUserWalletDashboard = () => {
  const { currentUserId, loading: contextLoading } = useEnhancedWalletContext();
  const { loading: demoLoading, generateDemoData } = useDemoData();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const transactionHistoryRef = React.useRef<{ refresh: () => void }>(null);
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  });

  useEffect(() => {
    if (!contextLoading && currentUserId) {
      loadWalletData();
    }
  }, [currentUserId, contextLoading]);

  const loadWalletData = async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', currentUserId);

      if (error) throw error;
      
      const walletsData = data || [];
      setWallets(walletsData);
      
      // Check if user has meaningful data
      const hasBalance = walletsData.some(w => w.balance > 0);
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', currentUserId)
        .limit(1);
      
      const hasTransactions = (transactions?.length || 0) > 0;
      setHasData(hasBalance || hasTransactions);
      
    } catch (error) {
      console.error('Error loading wallets:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionComplete = async () => {
    await loadWalletData();
  };

  const handleGenerateDemo = async () => {
    if (currentUserId) {
      await generateDemoData(currentUserId);
      await loadWalletData();
    }
  };


  if (contextLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-4"></div>
          <WalletSkeleton />
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">

      {/* Demo Data Controls */}
      {!hasData && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Get Started with Demo Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your wallet is empty. Generate some demo data to explore the features and see how transactions work.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={handleGenerateDemo} 
                disabled={demoLoading}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                {demoLoading ? 'Generating...' : 'Generate Demo Data'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Real-time Wallet Balances */}
      <RealTimeWalletBalance />

      {/* Enhanced Transaction Interface */}
      <Tabs defaultValue="deposit" className="space-y-4">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="deposit" className="flex items-center gap-1 sm:gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Deposit</span>
            <span className="sm:hidden">Dep</span>
          </TabsTrigger>
          <TabsTrigger value="withdraw" className="flex items-center gap-1 sm:gap-2">
            <ArrowUpRight className="h-4 w-4" />
            <span className="hidden sm:inline">Withdraw</span>
            <span className="sm:hidden">With</span>
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex items-center gap-1 sm:gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Transfer</span>
            <span className="sm:hidden">Trans</span>
          </TabsTrigger>
          <TabsTrigger value="exchange" className="flex items-center gap-1 sm:gap-2">
            <Repeat className="h-4 w-4" />
            <span className="hidden sm:inline">Exchange</span>
            <span className="sm:hidden">Exch</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
            <span className="sm:hidden">Hist</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Set</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposit">
          <EnhancedWalletDepositForm 
            wallets={wallets}
            onDepositComplete={handleTransactionComplete}
          />
        </TabsContent>

        <TabsContent value="withdraw">
          <EnhancedWalletWithdrawForm 
            wallets={wallets}
            onWithdrawComplete={handleTransactionComplete}
          />
        </TabsContent>

        <TabsContent value="transfer">
          <WalletTransferForm 
            wallets={wallets}
            onTransferComplete={() => transactionHistoryRef.current?.refresh()} 
          />
        </TabsContent>

        <TabsContent value="exchange">
          <WalletExchangeForm />
        </TabsContent>

        <TabsContent value="history">
          {loading ? <TransactionSkeleton /> : <EnhancedTransactionHistory ref={transactionHistoryRef} />}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Wallet Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Preferences */}
              <div>
                <h3 className="font-medium mb-4">Notification Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive transaction alerts via email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailNotifications}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        emailNotifications: e.target.checked
                      }))}
                      className="rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">SMS Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive transaction alerts via SMS</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.smsNotifications}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        smsNotifications: e.target.checked
                      }))}
                      className="rounded"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Push Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive real-time push notifications</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.pushNotifications}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        pushNotifications: e.target.checked
                      }))}
                      className="rounded"
                    />
                  </div>
                </div>
                
                <Button className="w-full mt-4">
                  Save Notification Settings
                </Button>
              </div>

              {/* Security Settings */}
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Security Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">Enhance security with 2FA</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Transaction PIN</h4>
                      <p className="text-sm text-muted-foreground">Set a PIN for transactions</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Set PIN
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedUserWalletDashboard;
