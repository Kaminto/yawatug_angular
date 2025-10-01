
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface WalletCardProps {
  wallet: any;
}

const WalletCard: React.FC<WalletCardProps> = ({ wallet }) => {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getWalletIcon = () => {
    return <Wallet className="h-5 w-5 mr-2 text-yawatu-gold" />;
  };

  return (
    <Card className="border-yawatu-gold/30 dark:bg-black/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          {getWalletIcon()}
          {wallet.currency} Wallet
        </CardTitle>
        <CardDescription>
          Your {wallet.currency === 'USD' ? 'dollar' : wallet.currency === 'UGX' ? 'Ugandan Shilling' : wallet.currency} balance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <div className="text-2xl font-bold text-yawatu-gold mb-4">
            {formatCurrency(wallet.balance, wallet.currency)}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" asChild className="flex-1 border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold hover:text-black">
              <Link to="/shares">
                <ArrowUpRight className="h-4 w-4 mr-1" /> Top Up
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to="/transactions">History</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WalletCard;
