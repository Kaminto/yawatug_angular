
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUp, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import TopUpWalletForm from './TopUpWalletForm';
import WalletLoadingState from '@/components/user/WalletLoadingState';
import { formatCurrency } from '@/lib/utils';

interface WalletSummaryProps {
  wallets: any[];
  onWalletUpdate?: () => void;
  loading?: boolean;
}

const WalletSummary: React.FC<WalletSummaryProps> = ({ wallets, onWalletUpdate, loading = false }) => {
  const [openTopUp, setOpenTopUp] = useState(false);
  const [openWithdraw, setOpenWithdraw] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);

  // Find UGX and USD wallets
  const ugxWallet = wallets.find(wallet => wallet.currency === 'UGX') || { balance: 0, currency: 'UGX' };
  const usdWallet = wallets.find(wallet => wallet.currency === 'USD') || { balance: 0, currency: 'USD' };

  const handleTopUp = (wallet: any) => {
    setSelectedWallet(wallet);
    setOpenTopUp(true);
  };

  const handleWithdraw = (wallet: any) => {
    setSelectedWallet(wallet);
    setOpenWithdraw(true);
  };

  const handleClose = () => {
    setOpenTopUp(false);
    setOpenWithdraw(false);
    if (onWalletUpdate) {
      onWalletUpdate();
    }
  };

  // Show loading state while balances are being synced
  if (loading) {
    return <WalletLoadingState message="Loading wallet balances..." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* UGX Wallet Card */}
      <Card className="bg-gradient-to-br from-accent-blue/5 to-accent-blue/10 border-l-4 border-accent-blue shadow-md hover:shadow-lg transition-all duration-200 elegant-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="p-2 rounded-full text-accent-blue bg-background/50">
              <ArrowUp className="h-5 w-5" />
            </div>
            UGX Wallet
          </CardTitle>
          <CardDescription>Your local currency balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-card-foreground mb-2">{formatCurrency(ugxWallet.balance, 'UGX')}</div>
          <p className="text-sm text-muted-foreground mb-4">Available Balance</p>
          <div className="flex mt-4 gap-2">
            <Button 
              size="icon"
              className="h-12 w-12 rounded-xl border-2 border-action-deposit hover:bg-action-deposit hover:text-white flex-1 max-w-[48px]"
              onClick={() => handleTopUp(ugxWallet)}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-12 w-12 rounded-xl border-2 border-action-withdraw hover:bg-action-withdraw hover:text-white flex-1 max-w-[48px]"
              onClick={() => handleWithdraw(ugxWallet)}
              disabled={ugxWallet.balance <= 0}
            >
              <ArrowUp className="h-5 w-5 rotate-180" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* USD Wallet Card */}
      <Card className="bg-gradient-to-br from-accent-green/5 to-accent-green/10 border-l-4 border-accent-green shadow-md hover:shadow-lg transition-all duration-200 elegant-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="p-2 rounded-full text-accent-green bg-background/50">
              <ArrowUp className="h-5 w-5" />
            </div>
            USD Wallet
          </CardTitle>
          <CardDescription>Your foreign currency balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-card-foreground mb-2">{formatCurrency(usdWallet.balance, 'USD')}</div>
          <p className="text-sm text-muted-foreground mb-4">Available Balance</p>
          <div className="flex mt-4 gap-2">
            <Button 
              size="icon"
              className="h-12 w-12 rounded-xl border-2 border-action-deposit hover:bg-action-deposit hover:text-white flex-1 max-w-[48px]"
              onClick={() => handleTopUp(usdWallet)}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-12 w-12 rounded-xl border-2 border-action-withdraw hover:bg-action-withdraw hover:text-white flex-1 max-w-[48px]"
              onClick={() => handleWithdraw(usdWallet)}
              disabled={usdWallet.balance <= 0}
            >
              <ArrowUp className="h-5 w-5 rotate-180" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top Up Wallet Sheet */}
      <Sheet open={openTopUp} onOpenChange={setOpenTopUp}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Top Up Wallet</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedWallet && (
              <TopUpWalletForm 
                wallets={[selectedWallet]} 
                onTopUpComplete={handleClose}
                isOpen={true}
                onClose={handleClose}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Withdraw Dialog */}
      <Dialog open={openWithdraw} onOpenChange={setOpenWithdraw}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-center text-muted-foreground">
              Withdrawal functionality is coming soon.
            </p>
            <div className="flex justify-center mt-6">
              <Button onClick={() => setOpenWithdraw(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletSummary;
