import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Import existing components
import EnhancedSharePurchaseFlow from '../EnhancedSharePurchaseFlow';
import EnhancedUserShareSelling from '../EnhancedUserShareSelling';
import EnhancedShareTransferFlow from '../EnhancedShareTransferFlow';

// Import new enhanced components
import PriceHistoryChart from './PriceHistoryChart';
import MarketDepthIndicator from './MarketDepthIndicator';
import PerformanceMetricsPanel from './PerformanceMetricsPanel';
import TransferHistoryDashboard from './TransferHistoryDashboard';
import EnhancedSellOrdersTab from '../queue/EnhancedSellOrdersTab';

// Import management components
import UserSellQueueDashboard from '../queue/UserSellQueueDashboard';
import BookingManagementPanel from '../BookingManagementPanel';

interface EnhancedTradingHubProps {
  sharePool: any;
  userProfile: any;
  userId: string;
  userWallets: any[];
  userShares: any[];
  onTransactionComplete: () => void;
  activeTab?: string;
}

const EnhancedTradingHub: React.FC<EnhancedTradingHubProps> = ({
  sharePool,
  userProfile,
  userId,
  userWallets,
  userShares,
  onTransactionComplete,
  activeTab = 'buy'
}) => {
  const [shareBookings, setShareBookings] = useState<any[]>([]);
  const [sellOrders, setSellOrders] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      loadBookings();
      loadSellOrders();
    }
  }, [userId]);

  const loadBookings = async () => {
    try {
      const { data } = await supabase
        .from('share_bookings')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'partially_paid', 'pending'])
        .order('created_at', { ascending: false });
      
      setShareBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadSellOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('share_sell_orders')
        .select('*, shares(name, price_per_share)')
        .eq('user_id', userId)
        .order('fifo_position', { ascending: true });
      
      console.log('🔍 All sell orders loaded:', data);
      setSellOrders(data || []);
    } catch (error) {
      console.error('Error loading sell orders:', error);
    }
  };

  const handleUpdate = () => {
    loadBookings();
    loadSellOrders();
    onTransactionComplete();
  };

  const renderActiveForm = () => {
    switch (activeTab) {
      case 'buy':
        return (
          <div className="space-y-4">
            <div className="flex flex-col xl:grid xl:grid-cols-2 gap-4 max-w-full overflow-hidden">
              <div className="min-w-0 overflow-hidden">
                <EnhancedSharePurchaseFlow 
                  sharePool={sharePool} 
                  userProfile={userProfile} 
                  userId={userId} 
                  userWallets={userWallets} 
                  onPurchaseComplete={handleUpdate} 
                />
              </div>
              <div className="space-y-4 min-w-0 overflow-hidden">
                <PriceHistoryChart shareId={sharePool?.id} />
              </div>
            </div>
            
            {/* Active Bookings Management */}
            {shareBookings.length > 0 && (
              <BookingManagementPanel
                bookings={shareBookings}
                userId={userId}
                userWallets={userWallets}
                onUpdate={handleUpdate}
              />
            )}
          </div>
        );
      case 'sell':
        return (
          <div className="space-y-4">
            <div className="flex flex-col xl:grid xl:grid-cols-2 gap-4 max-w-full overflow-hidden">
              <div className="min-w-0 overflow-hidden">
                <EnhancedUserShareSelling 
                  userHoldings={userShares} 
                  userId={userId} 
                  onSellComplete={handleUpdate} 
                />
              </div>
              <div className="space-y-4 min-w-0 overflow-hidden">
                <PerformanceMetricsPanel userShares={userShares} />
              </div>
            </div>
            
            {/* Active Sell Orders Management - Always show */}
            <UserSellQueueDashboard userId={userId} />
          </div>
        );
      case 'transfer':
        return (
          <div className="flex flex-col xl:grid xl:grid-cols-2 gap-4 max-w-full overflow-hidden">
            <div className="min-w-0 overflow-hidden">
              <EnhancedShareTransferFlow 
                userId={userId} 
                onTransferComplete={onTransactionComplete} 
              />
            </div>
            <div className="space-y-4 min-w-0 overflow-hidden">
              <TransferHistoryDashboard userId={userId} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Enhanced Trading Interface */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 max-w-full overflow-hidden">
        {/* Left Column - Active Form */}
        <div className="lg:col-span-2 min-w-0 overflow-hidden">
          <div className="max-w-full overflow-hidden">
            {renderActiveForm()}
          </div>
        </div>

        {/* Right Column - Market Data & Tips */}
        <div className="space-y-4 min-w-0 overflow-hidden">
          <div className="max-w-full overflow-hidden">
            <MarketDepthIndicator shareId={sharePool?.id} />
          </div>

          {/* Trading Tips */}
          <Card className="max-w-full overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm">Trading Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1 text-muted-foreground overflow-hidden">
              <p className="break-words">• Sell orders are processed using FIFO queue system</p>
              <p className="break-words">• Share transfers require admin approval</p>
              <p className="break-words">• Check your queue position in the Sell tab</p>
              <p className="break-words">• Orders are processed during business hours (8 AM - 5 PM)</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTradingHub;