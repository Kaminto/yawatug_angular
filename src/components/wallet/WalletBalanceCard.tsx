import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface UnifiedWalletBalanceCardProps {
  ugxBalance: number;
  usdBalance: number;
}

const UnifiedWalletBalanceCard: React.FC<UnifiedWalletBalanceCardProps> = ({ 
  ugxBalance, 
  usdBalance 
}) => {
  // Simple exchange rate - in production this should come from API or settings
  const exchangeRate = 3700; // 1 USD = 3700 UGX (approximate)
  const usdToUgxEquivalent = Math.max(0, usdBalance) * exchangeRate; // Only count positive USD
  const totalEquivalentUGX = ugxBalance + usdToUgxEquivalent;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/5 border-0 shadow-2xl">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full translate-y-12 -translate-x-12"></div>
      
      <CardContent className="relative p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground">Available Balance</h3>
            <p className="text-sm text-muted-foreground">Multi-currency wallet</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Individual Currency Balances */}
          <div className="grid grid-cols-1 gap-4">
            {/* UGX Balance Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary to-primary/80 flex-shrink-0"></div>
                  <span className="text-sm font-semibold text-primary truncate">UGX Wallet</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground break-all">
                    {formatCurrency(ugxBalance, 'UGX')}
                  </p>
                  <p className="text-xs text-muted-foreground">Ugandan Shilling</p>
                </div>
              </div>
            </div>
            
            {/* USD Balance Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/20 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-secondary to-secondary/80 flex-shrink-0"></div>
                  <span className="text-sm font-semibold text-secondary truncate">USD Wallet</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground break-all">
                    {formatCurrency(usdBalance, 'USD')}
                  </p>
                  <p className="text-xs text-muted-foreground">US Dollar</p>
                </div>
              </div>
            </div>
          </div>

          {/* Equivalent Total */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse flex-shrink-0"></div>
                <span className="text-sm font-semibold text-accent truncate">Total Equivalent</span>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-accent break-all">
                  {formatCurrency(totalEquivalentUGX, 'UGX')}
                </span>
                <p className="text-xs text-muted-foreground">Combined value</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedWalletBalanceCard;