import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { useSmartPayment } from '@/hooks/useSmartPayment';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SmartPaymentSuggestionsProps {
  userId: string;
  wallets: any[];
  balances: { UGX: number; USD: number };
}

const SmartPaymentSuggestions: React.FC<SmartPaymentSuggestionsProps> = ({
  userId,
  wallets,
  balances
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const { processExchangeAndPayment, loading } = useSmartPayment();

  useEffect(() => {
    generateSuggestions();
  }, [balances]);

  const generateSuggestions = () => {
    const newSuggestions = [];

    // Suggest exchange if USD balance > $5 and could boost UGX
    if (balances.USD > 5) {
      const potentialUGX = balances.USD * 3800;
      newSuggestions.push({
        id: 'exchange-usd',
        type: 'exchange',
        title: 'Maximize your UGX balance',
        description: `Exchange ${balances.USD.toFixed(2)} USD to gain ${potentialUGX.toLocaleString()} UGX`,
        benefit: `+${potentialUGX.toLocaleString()} UGX`,
        action: 'Exchange Now',
        icon: ArrowRightLeft
      });
    }

    // Suggest if user has unbalanced wallets
    if (balances.UGX < 10000 && balances.USD > 10) {
      newSuggestions.push({
        id: 'low-ugx-high-usd',
        type: 'exchange',
        title: 'Low UGX balance detected',
        description: 'Convert some USD to UGX for local transactions',
        benefit: 'Better purchasing power',
        action: 'Exchange USD',
        icon: TrendingUp
      });
    }

    setSuggestions(newSuggestions);
  };

  const handleExchange = async (suggestion: any) => {
    const usdWallet = wallets.find(w => w.currency === 'USD');
    const ugxWallet = wallets.find(w => w.currency === 'UGX');

    if (!usdWallet || !ugxWallet) {
      toast.error('Required wallets not found');
      return;
    }

    // Exchange all available USD
    const result = await processExchangeAndPayment(
      usdWallet,
      ugxWallet,
      balances.USD,
      3800
    );

    if (result.success) {
      setShowExchangeDialog(false);
      generateSuggestions();
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Smart Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <div
                key={suggestion.id}
                className="p-4 border rounded-lg space-y-2 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {suggestion.benefit}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedSuggestion(suggestion);
                    setShowExchangeDialog(true);
                  }}
                >
                  {suggestion.action}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={showExchangeDialog} onOpenChange={setShowExchangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Exchange</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedSuggestion?.description}
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>From USD:</span>
                <span className="font-medium">${balances.USD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>To UGX (est.):</span>
                <span className="font-medium">
                  UGX {(balances.USD * 3800).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Exchange Rate:</span>
                <span>1 USD = 3,800 UGX</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExchangeDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedSuggestion && handleExchange(selectedSuggestion)}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Confirm Exchange'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SmartPaymentSuggestions;
