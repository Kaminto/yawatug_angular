
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Eye, EyeOff, RefreshCw, TrendingUp, TrendingDown, Activity, Plus, Minus, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEnhancedWalletContext } from '@/hooks/useEnhancedWalletContext';

interface WalletData {
  id: string;
  currency: string;
  balance: number;
  status: string;
  updated_at: string;
  user_id: string;
  created_at: string;
  import_batch_id?: string;
}

interface BalanceChange {
  amount: number;
  type: 'increase' | 'decrease';
  timestamp: number;
}

interface RealTimeWalletBalanceProps {
  onRefresh?: () => void;
  onTabSwitch?: (tab: string) => void;
}

const RealTimeWalletBalance: React.FC<RealTimeWalletBalanceProps> = ({ onRefresh, onTabSwitch }) => {
  const { currentUserId } = useEnhancedWalletContext();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [recentChanges, setRecentChanges] = useState<Record<string, BalanceChange>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  const loadWallets = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', currentUserId)
        .order('currency');

      if (error) throw error;
      
      setWallets(data || []);
    } catch (error) {
      console.error('Error loading wallets:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscription = () => {
    if (!currentUserId) return;

    setConnectionStatus('connecting');

    const channel = supabase
      .channel('wallet-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          console.log('Real-time wallet update:', payload);
          setConnectionStatus('connected');
          
          if (payload.eventType === 'UPDATE') {
            const updatedWallet = payload.new as WalletData;
            const oldWallet = payload.old as WalletData;
            
            setWallets(prev => 
              prev.map(wallet => 
                wallet.id === updatedWallet.id ? updatedWallet : wallet
              )
            );

            // Track balance changes for visual feedback
            if (oldWallet && updatedWallet.balance !== oldWallet.balance) {
              const change: BalanceChange = {
                amount: Math.abs(updatedWallet.balance - oldWallet.balance),
                type: updatedWallet.balance > oldWallet.balance ? 'increase' : 'decrease',
                timestamp: Date.now()
              };
              
              setRecentChanges(prev => ({
                ...prev,
                [updatedWallet.id]: change
              }));

              // Clear the change indicator after 3 seconds
              setTimeout(() => {
                setRecentChanges(prev => {
                  const newChanges = { ...prev };
                  delete newChanges[updatedWallet.id];
                  return newChanges;
                });
              }, 3000);

              toast(
                `${updatedWallet.currency} wallet ${change.type === 'increase' ? 'credited' : 'debited'} with ${updatedWallet.currency} ${change.amount.toLocaleString()}`,
                {
                  icon: change.type === 'increase' ? '💰' : '💸'
                }
              );
            }
          }
        }
      )
      .on('system', {}, (payload) => {
        console.log('Realtime status:', payload);
        if (payload === 'SUBSCRIBED' || payload.status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (payload === 'CLOSED' || payload === 'CHANNEL_ERROR' || payload.status === 'CLOSED') {
          setConnectionStatus('disconnected');
          // Auto-reconnect after 3 seconds
          setTimeout(() => {
            if (currentUserId) {
              console.log('Attempting to reconnect...');
              setupRealTimeSubscription();
            }
          }, 3000);
        } else {
          setConnectionStatus('connecting');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    loadWallets();
    const cleanup = setupRealTimeSubscription();
    return cleanup;
  }, [currentUserId]);

  const getWalletIcon = (currency: string) => {
    return <Wallet className="h-5 w-5 mr-2 text-primary" />;
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (!balanceVisible) return '****';
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      frozen: 'secondary',
      suspended: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getChangeIndicator = (walletId: string) => {
    const change = recentChanges[walletId];
    if (!change) return null;

    return (
      <div className={`flex items-center gap-1 text-sm ${
        change.type === 'increase' ? 'text-green-600' : 'text-red-600'
      }`}>
        {change.type === 'increase' ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span className="animate-pulse">
          {change.type === 'increase' ? '+' : '-'}{change.amount.toLocaleString()}
        </span>
      </div>
    );
  };

  if (loading) {
    return <div className="animate-pulse">Loading wallets...</div>;
  }


  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${
            connectionStatus === 'connected' ? 'text-green-500' : 
            connectionStatus === 'connecting' ? 'text-yellow-500' : 'text-red-500'
          }`} />
          <span className="text-sm text-muted-foreground">
            {connectionStatus === 'connected' ? 'Live updates active' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Connection lost'}
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setBalanceVisible(!balanceVisible)}
        >
          {balanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.map((wallet) => (
          <Card key={wallet.id} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center">
                  {getWalletIcon(wallet.currency)}
                  {wallet.currency}
                </CardTitle>
                {getStatusBadge(wallet.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-xl font-bold text-primary">
                  {formatCurrency(wallet.balance, wallet.currency)}
                </div>
                
                {getChangeIndicator(wallet.id)}
                
                <div className="text-xs text-muted-foreground">
                  Updated: {new Date(wallet.updated_at).toLocaleTimeString()}
                </div>

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {wallets.length === 0 && (
        <Alert>
          <AlertDescription>
            No wallets found. Contact support if you believe this is an error.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default RealTimeWalletBalance;
