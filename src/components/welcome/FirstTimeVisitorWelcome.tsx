import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { useFirstTimeVisitor } from '@/hooks/useFirstTimeVisitor';
import { usePromotionalCampaigns } from '@/hooks/usePromotionalCampaigns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import PublicShareOrderForm from '@/components/public/PublicShareOrderForm';

const FirstTimeVisitorWelcome: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [hasBought100Shares, setHasBought100Shares] = useState(false);
  
  const { isFirstTimeVisitor } = useFirstTimeVisitor();
  const { activeCampaigns, loading: campaignsLoading } = usePromotionalCampaigns();
  const { user } = useAuth();

  useEffect(() => {
    const checkUserPurchases = async () => {
      if (user) {
        const { data: purchases } = await supabase
          .from('share_purchase_orders')
          .select('quantity')
          .eq('user_id', user.id)
          .eq('status', 'completed');
        
        const totalShares = purchases?.reduce((sum, purchase) => sum + purchase.quantity, 0) || 0;
        setHasBought100Shares(totalShares >= 100);
      }
    };

    checkUserPurchases();
  }, [user]);

  useEffect(() => {
    if (campaignsLoading) return;

    // Find active promotional campaign for first 100 shares
    const activeCampaign = activeCampaigns?.find(campaign => 
      campaign.is_active && 
      campaign.name?.toLowerCase().includes('100') &&
      campaign.name?.toLowerCase().includes('share')
    );

    if (activeCampaign && activeCampaign.end_date) {
      const endTime = new Date(activeCampaign.end_date).getTime();
      const now = new Date().getTime();
      const timeLeftInSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setTimeLeft(timeLeftInSeconds);
      
      // Show banner if: first time visitor, hasn't bought 100 shares, and campaign is still active
      if (isFirstTimeVisitor && !hasBought100Shares && timeLeftInSeconds > 0) {
        setIsVisible(true);
      }
    }
  }, [activeCampaigns, campaignsLoading, isFirstTimeVisitor, hasBought100Shares]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBuyNow = () => {
    setShowOrderForm(true);
  };

  const handleLater = () => {
    setIsVisible(false);
  };

  if (!isVisible || !isFirstTimeVisitor) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 p-4">
        <Card className="mx-auto max-w-2xl border-2 border-primary shadow-2xl bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-foreground mb-2">
                Days, you deserve UGX100,000 discount for first 100 shares you buy.
              </h3>
              <div className="bg-background/50 rounded-lg p-2 mb-4">
                <div className="text-primary text-xl font-mono font-bold">
                  {formatTime(timeLeft)}
                </div>
                <p className="text-muted-foreground text-xs">Days remaining</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button 
                onClick={handleBuyNow}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              >
                Buy Now!
              </Button>
              <Button 
                variant="outline"
                onClick={handleLater}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Public Order Form */}
      {showOrderForm && (
        <PublicShareOrderForm 
          open={showOrderForm} 
          onClose={() => setShowOrderForm(false)} 
        />
      )}
    </>
  );
};

export default FirstTimeVisitorWelcome;