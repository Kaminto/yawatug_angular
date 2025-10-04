import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp, Gift, Repeat } from 'lucide-react';
import { useReferralCredits } from '@/hooks/useReferralCredits';

interface ReferralCreditsCardProps {
  userId: string;
  onConvert: () => void;
  onEnterDraw: () => void;
}

const ReferralCreditsCard: React.FC<ReferralCreditsCardProps> = ({ 
  userId, 
  onConvert,
  onEnterDraw 
}) => {
  const { credits, transactions, loading } = useReferralCredits(userId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Credit Balance Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-600" />
            Your Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-4xl font-bold text-purple-700">
              {credits?.available_credits.toFixed(0) || '0'}
            </div>
            <p className="text-sm text-purple-600">Available Credits</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Staked</p>
              <p className="text-lg font-semibold">{credits?.staked_credits.toFixed(0) || '0'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Converted</p>
              <p className="text-lg font-semibold">{credits?.converted_credits.toFixed(0) || '0'}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={onConvert}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={!credits || credits.available_credits < 10}
            >
              <Repeat className="h-4 w-4 mr-2" />
              Convert to Shares
            </Button>
            <Button 
              onClick={onEnterDraw}
              variant="outline"
              className="flex-1"
              disabled={!credits || credits.available_credits < 1}
            >
              <Gift className="h-4 w-4 mr-2" />
              Enter Draw
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Credit Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Credit Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No credit activity yet
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm capitalize">
                      {tx.transaction_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={tx.transaction_type === 'earned' || tx.transaction_type === 'prize_won' ? 'default' : 'secondary'}
                      className="mb-1"
                    >
                      {tx.transaction_type === 'earned' || tx.transaction_type === 'prize_won' ? '+' : '-'}
                      {tx.amount.toFixed(0)} credits
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Balance: {tx.balance_after.toFixed(0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralCreditsCard;
