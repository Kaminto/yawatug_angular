import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, ArrowLeftRight } from 'lucide-react';

interface WalletQuickActionsProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onTransfer: () => void;
}

const WalletQuickActions: React.FC<WalletQuickActionsProps> = ({ onDeposit, onWithdraw, onTransfer }) => {
  return (
    <div className="p-4 sm:p-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Quick Actions</h3>
        <p className="text-sm text-muted-foreground">Manage your wallet easily</p>
      </div>
      
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        {/* Deposit Action */}
        <div className="flex flex-col items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-primary/30 hover:border-primary hover:bg-primary/10 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 group"
            onClick={onDeposit}
          >
            <Plus className="h-7 w-7 sm:h-9 sm:w-9 text-primary group-hover:scale-110 transition-all duration-200" />
          </Button>
          <span className="text-xs sm:text-sm font-semibold text-primary">Deposit</span>
        </div>
        
        {/* Withdraw Action */}
        <div className="flex flex-col items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-secondary/30 hover:border-secondary hover:bg-secondary/10 bg-gradient-to-br from-secondary/5 to-secondary/10 shadow-lg hover:shadow-xl transition-all duration-300 group"
            onClick={onWithdraw}
          >
            <Minus className="h-7 w-7 sm:h-9 sm:w-9 text-secondary group-hover:scale-110 transition-all duration-200" />
          </Button>
          <span className="text-xs sm:text-sm font-semibold text-secondary">Withdraw</span>
        </div>
        
        {/* Transfer Action */}
        <div className="flex flex-col items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-primary/30 hover:border-primary hover:bg-primary/10 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 group"
            onClick={onTransfer}
          >
            <ArrowLeftRight className="h-7 w-7 sm:h-9 sm:w-9 text-primary group-hover:scale-110 transition-all duration-200" />
          </Button>
          <span className="text-xs sm:text-sm font-semibold text-primary">Transfer</span>
        </div>
      </div>
    </div>
  );
};

export default WalletQuickActions;