import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownCircle, TrendingUp, Wallet, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MarketingCTAs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {/* Deposit CTA */}
      <div className="bg-gradient-to-r from-accent-green/10 to-accent-green/20 border border-accent-green/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-accent-green">Fund Your Wallet</h3>
            <p className="text-sm text-muted-foreground">Add money to start investing</p>
          </div>
          <ArrowDownCircle className="h-8 w-8 text-accent-green" />
        </div>
        <Button 
          onClick={() => navigate('/wallet?open=deposit')}
          className="w-full bg-accent-green hover:bg-accent-green/90 text-white font-semibold"
        >
          <Wallet className="h-4 w-4 mr-2" />
          Deposit now
        </Button>
      </div>

      {/* Buy Shares CTA */}
      <div className="bg-gradient-to-r from-accent-blue/10 to-accent-blue/20 border border-accent-blue/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-accent-blue">Buy Shares</h3>
            <p className="text-sm text-muted-foreground">Invest in Yawatu's future</p>
          </div>
          <TrendingUp className="h-8 w-8 text-accent-blue" />
        </div>
        <Button 
          onClick={() => navigate('/user-shares')}
          className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white font-semibold"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Buy shares
        </Button>
      </div>
    </div>
  );
};

export default MarketingCTAs;