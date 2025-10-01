import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Clock, 
  CheckCircle,
  Calendar,
  Target
} from 'lucide-react';
import { useDividendSummary } from '@/hooks/useDividendSummary';

interface DividendSectionProps {
  userId: string;
  period: string;
  showValues: boolean;
}

const DividendSection: React.FC<DividendSectionProps> = ({
  userId,
  period,
  showValues
}) => {
  const { dividendSummary, loading } = useDividendSummary(userId, period);

  const formatCurrency = (amount: number) => {
    if (!showValues) return '••••••';
    return `UGX ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dividend Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Dividend Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expected Dividends */}
            <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">Expected Dividends</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Declared
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-orange-800 mb-1">
                  {formatCurrency(dividendSummary?.expectedDividends || 0)}
                </p>
                <p className="text-xs text-orange-600">
                  Declared but not paid
                </p>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    From {dividendSummary?.pendingDeclarations || 0} declarations
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Realised Dividends */}
            <Card className="border-green-200 bg-green-50/30 dark:bg-green-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Realised Dividends</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Paid
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-green-800 mb-1">
                  {formatCurrency(dividendSummary?.realisedDividends || 0)}
                </p>
                <p className="text-xs text-green-600">
                  Actually received
                </p>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    From {dividendSummary?.paidPayments || 0} payments
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dividend Metrics */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Declared</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(dividendSummary?.totalDeclared || 0)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Eligible Shares</p>
              <p className="text-lg font-bold">
                {showValues ? (dividendSummary?.eligibleShares || 0).toLocaleString() : '••••'}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Avg Per Share</p>
              <p className="text-lg font-bold">
                {formatCurrency(dividendSummary?.avgPerShare || 0)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Yield</p>
              <p className="text-lg font-bold text-primary">
                {showValues ? `${(dividendSummary?.yieldPercent || 0).toFixed(1)}%` : '••••'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Dividend Payments */}
      {dividendSummary?.recentPayments && dividendSummary.recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dividendSummary.recentPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Dividend Payment</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.sharesEligible} shares
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Dividend Declarations */}
      {dividendSummary?.upcomingDeclarations && dividendSummary.upcomingDeclarations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Dividends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dividendSummary.upcomingDeclarations.map((declaration, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-orange-50/30 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Expected Payment</p>
                      <p className="text-sm text-muted-foreground">
                        Declared: {new Date(declaration.declarationDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-orange-600">
                      {formatCurrency(declaration.expectedAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Est. payment date
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DividendSection;