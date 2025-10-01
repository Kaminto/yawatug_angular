// Investment opportunities showcase component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Clock, 
  Users, 
  Target,
  ArrowRight,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface InvestmentOpportunity {
  id: string;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  min_investment: number;
  expected_return: number;
  duration_months: number;
  risk_level: 'low' | 'medium' | 'high';
  participants: number;
  deadline: Date;
  featured: boolean;
}

export const InvestmentOpportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      // This would be real data from your database
      const mockOpportunities: InvestmentOpportunity[] = [
        {
          id: '1',
          title: 'Gold Mining Expansion Project',
          description: 'Expand our gold mining operations in Busia region with new equipment and infrastructure.',
          target_amount: 50000000,
          current_amount: 32000000,
          min_investment: 100000,
          expected_return: 18.5,
          duration_months: 18,
          risk_level: 'medium',
          participants: 234,
          deadline: new Date('2024-12-31'),
          featured: true
        },
        {
          id: '2',
          title: 'Sustainable Mining Initiative',
          description: 'Implement eco-friendly mining technologies and processes.',
          target_amount: 25000000,
          current_amount: 8500000,
          min_investment: 50000,
          expected_return: 15.2,
          duration_months: 24,
          risk_level: 'low',
          participants: 156,
          deadline: new Date('2024-11-30'),
          featured: false
        }
      ];

      setOpportunities(mockOpportunities);
    } catch (error) {
      console.error('Error loading opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysLeft = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Investment Opportunities</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/investment-opportunities')}
        >
          View All
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="grid gap-4">
        {opportunities.map((opportunity) => (
          <Card 
            key={opportunity.id} 
            className={
              "border transition-all duration-200 hover:shadow-lg cursor-pointer" + 
              (opportunity.featured ? " border-primary bg-primary/5" : "")
            }
            onClick={() => navigate(`/investment-opportunities/${opportunity.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                    {opportunity.featured && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {opportunity.description}
                  </p>
                </div>
                <Badge className={`${getRiskBadgeColor(opportunity.risk_level)} text-white`}>
                  {opportunity.risk_level.toUpperCase()} RISK
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Funding Progress</span>
                    <span className="font-medium">
                      {getProgressPercentage(opportunity.current_amount, opportunity.target_amount).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={getProgressPercentage(opportunity.current_amount, opportunity.target_amount)} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatCurrency(opportunity.current_amount)} raised</span>
                    <span>of {formatCurrency(opportunity.target_amount)}</span>
                  </div>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">{opportunity.expected_return}%</p>
                      <p className="text-muted-foreground">Expected Return</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">{opportunity.duration_months}mo</p>
                      <p className="text-muted-foreground">Duration</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="font-medium">{opportunity.participants}</p>
                      <p className="text-muted-foreground">Investors</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="font-medium">{getDaysLeft(opportunity.deadline)}</p>
                      <p className="text-muted-foreground">Days Left</p>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <Button 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/investment-opportunities/${opportunity.id}/invest`);
                  }}
                >
                  Invest from {formatCurrency(opportunity.min_investment)}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};