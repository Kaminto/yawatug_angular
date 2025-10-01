
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gift, Calendar, Users, Percent } from 'lucide-react';

interface Promotion {
  id: string;
  name: string;
  description: string;
  bonusPercentage: number;
  minimumPurchase: number;
  maxParticipants: number;
  currentParticipants: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

const PromotionsView = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      // This would load from promotions table when created
      const mockPromotions: Promotion[] = [
        {
          id: '1',
          name: 'New Year Bonus',
          description: 'Get 10% bonus shares on purchases above UGX 500,000',
          bonusPercentage: 10,
          minimumPurchase: 500000,
          maxParticipants: 100,
          currentParticipants: 45,
          isActive: true,
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        {
          id: '2',
          name: 'Referral Boost',
          description: 'Double referral commissions for this month',
          bonusPercentage: 100,
          minimumPurchase: 0,
          maxParticipants: 0,
          currentParticipants: 0,
          isActive: true,
          startDate: '2024-01-15',
          endDate: '2024-02-15'
        }
      ];
      
      setPromotions(mockPromotions);
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinPromotion = async (promotionId: string) => {
    try {
      // This would add user to promotion participation table
      toast.success('Successfully joined promotion!');
    } catch (error) {
      console.error('Error joining promotion:', error);
      toast.error('Failed to join promotion');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading promotions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Active Promotions</h2>
        <Badge variant="outline">{promotions.filter(p => p.isActive).length} Active</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {promotions.map((promotion) => (
          <Card key={promotion.id} className="relative overflow-hidden">
            {promotion.isActive && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-green-500">Active</Badge>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                {promotion.name}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {promotion.description}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium">Bonus</p>
                    <p className="text-muted-foreground">{promotion.bonusPercentage}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="font-medium">Valid Until</p>
                    <p className="text-muted-foreground">
                      {new Date(promotion.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {promotion.minimumPurchase > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Minimum purchase: UGX {promotion.minimumPurchase.toLocaleString()}
                  </p>
                </div>
              )}

              {promotion.maxParticipants > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>Participants:</span>
                  <span>{promotion.currentParticipants}/{promotion.maxParticipants}</span>
                </div>
              )}

              <Button 
                onClick={() => joinPromotion(promotion.id)}
                disabled={!promotion.isActive || (promotion.maxParticipants > 0 && promotion.currentParticipants >= promotion.maxParticipants)}
                className="w-full"
              >
                {promotion.isActive ? 'Join Promotion' : 'Promotion Ended'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {promotions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No active promotions at the moment</p>
            <p className="text-sm text-muted-foreground">Check back later for exciting offers!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PromotionsView;
