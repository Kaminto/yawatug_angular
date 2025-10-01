import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SimplifiedDividendDashboardProps {
  userId: string;
  totalShares: number;
}

const SimplifiedDividendDashboard: React.FC<SimplifiedDividendDashboardProps> = ({ userId, totalShares }) => {
  const [dividendStats, setDividendStats] = useState({
    received: 0,
    expected: 0,
    roi: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadDividendStats();
    }
  }, [userId]);

  const loadDividendStats = async () => {
    try {
      setLoading(true);
      
      // Load completed dividend payments (received)
      const { data: payments, error: paymentsError } = await supabase
        .from('dividend_payments')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (paymentsError && paymentsError.code !== 'PGRST116') {
        console.error('Error loading dividend payments:', paymentsError);
      }

      // Load declared but unpaid dividends (expected)
      const { data: declarations, error: declarationsError } = await supabase
        .from('dividend_declarations')
        .select('id')
        .eq('status', 'approved');

      if (declarationsError && declarationsError.code !== 'PGRST116') {
        console.error('Error loading dividend declarations:', declarationsError);
      }

      const received = (payments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const expected = (declarations || []).length * 1000; // Placeholder estimate for declared dividends
      
      // Calculate ROI as a simple percentage based on received dividends vs investment
      // Using a rough estimate of investment value
      const estimatedInvestment = totalShares * 50000; // Assuming average share price
      const roi = estimatedInvestment > 0 ? (received / estimatedInvestment) * 100 : 0;

      setDividendStats({
        received,
        expected,
        roi
      });

    } catch (error) {
      console.error('Error loading dividend stats:', error);
      toast.error('Failed to load dividend information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-primary">
      <CardContent className="p-3 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="text-center p-3 sm:p-0 rounded-lg bg-success/5 sm:bg-transparent">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Received</p>
            <p className="text-lg sm:text-2xl font-bold text-success truncate">
              UGX {dividendStats.received.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 sm:p-0 rounded-lg bg-primary/5 sm:bg-transparent">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Expected</p>
            <p className="text-lg sm:text-2xl font-bold text-primary truncate">
              UGX {dividendStats.expected.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">(declared but not paid)</p>
          </div>
          <div className="text-center p-3 sm:p-0 rounded-lg bg-accent/5 sm:bg-transparent">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">ROI</p>
            <p className="text-lg sm:text-2xl font-bold text-accent">
              {dividendStats.roi.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedDividendDashboard;