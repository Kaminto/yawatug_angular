
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, ArrowUpRight, ArrowRightLeft, Repeat, History, Settings, Play, Plus, Minus } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [activeDialog, setActiveDialog] = useState<'deposit' | 'withdraw' | 'transfer' | 'exchange' | null>(null);

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
    setActiveDialog(null);
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

      {/* Quick Actions Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/10 hover:border-primary"
              onClick={() => setActiveDialog('deposit')}
            >
              <Plus className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Deposit</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-secondary/10 hover:border-secondary"
              onClick={() => setActiveDialog('withdraw')}
            >
              <Minus className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium">Withdraw</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/10 hover:border-primary"
              onClick={() => setActiveDialog('transfer')}
            >
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Transfer</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-accent/10 hover:border-accent"
              onClick={() => setActiveDialog('exchange')}
            >
              <Repeat className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium">Exchange</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs - Only History and Settings */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="history" className="flex items-center gap-2 flex-1">
            <History className="h-4 w-4" />
            <span>History</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 flex-1">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          {loading ? <TransactionSkeleton /> : <EnhancedTransactionHistory ref={transactionHistoryRef} />}
        </TabsContent>

        <TabsContent value="settings">
...
        </TabsContent>
      </Tabs>

      {/* Dialogs for Quick Actions */}
      <Dialog open={activeDialog === 'deposit'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Deposit Funds
            </DialogTitle>
          </DialogHeader>
          <EnhancedWalletDepositForm 
            wallets={wallets}
            onDepositComplete={handleTransactionComplete}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'withdraw'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="h-5 w-5 text-secondary" />
              Withdraw Funds
            </DialogTitle>
          </DialogHeader>
          <EnhancedWalletWithdrawForm 
            wallets={wallets}
            onWithdrawComplete={handleTransactionComplete}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'transfer'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Transfer Funds
            </DialogTitle>
          </DialogHeader>
          <WalletTransferForm 
            wallets={wallets}
            onTransferComplete={handleTransactionComplete}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'exchange'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-accent" />
              Exchange Currency
            </DialogTitle>
          </DialogHeader>
          <WalletExchangeForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedUserWalletDashboard;
