import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Gift, Trophy, Clock, Users } from 'lucide-react';
import { useGrandDraw } from '@/hooks/useGrandDraw';
import { toast } from 'sonner';

interface GrandDrawCardProps {
  userId: string;
  availableCredits: number;
}

const GrandDrawCard: React.FC<GrandDrawCardProps> = ({ userId, availableCredits }) => {
  const { currentDraw, userEntry, recentWinners, loading, enterDraw } = useGrandDraw(userId);
  const [stakeAmount, setStakeAmount] = useState<number>(1);
  const [isEntering, setIsEntering] = useState(false);

  const handleEnterDraw = async () => {
    if (!currentDraw || stakeAmount < 1 || stakeAmount > availableCredits) {
      toast.error('Invalid stake amount');
      return;
    }

    setIsEntering(true);
    try {
      await enterDraw(stakeAmount);
      toast.success(`Successfully entered draw with ${stakeAmount} credits!`);
      setStakeAmount(1);
    } catch (error: any) {
      console.error('Error entering draw:', error);
      toast.error(error.message || 'Failed to enter draw');
    } finally {
      setIsEntering(false);
    }
  };

  const getCountdown = () => {
    if (!currentDraw) return 'No active draw';
    const now = new Date();
    const drawDate = new Date(currentDraw.draw_date);
    const diff = drawDate.getTime() - now.getTime();
    
    if (diff < 0) return 'Draw ending soon';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h remaining`;
  };

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
      {/* Current Draw */}
      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-600" />
            Grand Draw
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentDraw ? (
            <>
              <div>
                <h3 className="text-xl font-bold text-yellow-700">{currentDraw.draw_name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-600">{getCountdown()}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 py-4 border-y">
                <div className="text-center">
                  <Trophy className="h-6 w-6 mx-auto text-yellow-600 mb-1" />
                  <p className="text-2xl font-bold">{currentDraw.first_prize_percentage}%</p>
                  <p className="text-xs text-muted-foreground">1st Prize</p>
                </div>
                <div className="text-center">
                  <Trophy className="h-5 w-5 mx-auto text-gray-400 mb-1" />
                  <p className="text-xl font-bold">{currentDraw.second_prize_percentage}%</p>
                  <p className="text-xs text-muted-foreground">2nd Prize</p>
                </div>
                <div className="text-center">
                  <Trophy className="h-4 w-4 mx-auto text-orange-400 mb-1" />
                  <p className="text-lg font-bold">{currentDraw.third_prize_percentage}%</p>
                  <p className="text-xs text-muted-foreground">3rd Prize</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Pool</span>
                  <span className="font-semibold">{currentDraw.total_staked_credits.toFixed(0)} credits</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Entries</span>
                  <span className="font-semibold flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {currentDraw.total_entries}
                  </span>
                </div>
              </div>

              {userEntry ? (
                <Badge className="w-full justify-center py-2 bg-green-600">
                  You're in! {userEntry.credits_staked} credits staked
                </Badge>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={availableCredits}
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(Number(e.target.value))}
                      placeholder="Credits to stake"
                    />
                    <Button
                      onClick={handleEnterDraw}
                      disabled={isEntering || availableCredits < 1}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      {isEntering ? 'Entering...' : 'Enter Draw'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: {availableCredits.toFixed(0)} credits
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              No active draw at the moment. Check back soon!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Winners */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Recent Winners
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentWinners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No winners yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentWinners.slice(0, 5).map((winner) => (
                <div key={winner.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">
                      {winner.user_profile?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : '🥉'} Position {winner.position}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {winner.prize_shares} shares
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(winner.created_at).toLocaleDateString()}
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

export default GrandDrawCard;
