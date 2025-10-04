import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import SimpleReferralSummary from '@/components/referral/SimpleReferralSummary';
import Footer from '@/components/layout/Footer';

const UserReferralDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Referral Dashboard</h1>
            <p className="text-muted-foreground">
              Earn commissions, collect credits, and win prizes by referring investors
            </p>
          </div>

          {/* Main Referral Summary Component */}
          <SimpleReferralSummary userId={user.id} />

          {/* Info Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>How the Referral Program Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Level 1: Direct Referral Commissions (Cash)</h3>
                <p className="text-sm text-muted-foreground">
                  Earn cash commission when your referrals purchase shares from the pool (after KYC verification to 80%+). 
                  Commission rate is set by admin and applies only to pool purchases, not reserves or bonuses.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Level 2: Network Credit Rewards</h3>
                <p className="text-sm text-muted-foreground">
                  Earn credits for every share purchased in your network. Credits can be converted to shares or staked in the Grand Draw.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Grand Draw System</h3>
                <p className="text-sm text-muted-foreground">
                  Stake your credits to enter draws with 3 winners. 1st place gets 50%, 2nd gets 30%, 3rd gets 20% of the prize pool in shares.
                  Results are publicly displayed for transparency.
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium">
                  ⏰ Time-Limited Qualification: Your commission eligibility period is configurable by admin. 
                  Check your dashboard for countdown timers.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserReferralDashboard;
