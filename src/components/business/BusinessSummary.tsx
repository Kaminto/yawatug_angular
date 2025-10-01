import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Users, 
  Target,
  Eye,
  EyeOff,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Building
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSummary } from '@/hooks/useBusinessSummary';
import SharePerformanceSection from './SharePerformanceSection';
import DividendSection from './DividendSection';
import ReferralSection from './ReferralSection';
import AgentSection from './AgentSection';

type Period = '7d' | '30d' | '90d' | '1y' | 'all';

interface BusinessSummaryProps {
  className?: string;
  showExport?: boolean;
}

const BusinessSummary: React.FC<BusinessSummaryProps> = ({ 
  className = '', 
  showExport = true 
}) => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30d');
  const [showValues, setShowValues] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const {
    summary,
    loading,
    refreshSummary
  } = useBusinessSummary(user?.id!, selectedPeriod);

  const formatCurrency = (amount: number, showSign = false) => {
    if (!showValues) return '••••••';
    const sign = showSign && amount > 0 ? '+' : '';
    return `${sign}UGX ${amount.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    if (!showValues) return '••••';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const periodLabels = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days', 
    '90d': 'Last 90 Days',
    '1y': 'Last Year',
    'all': 'All Time'
  };

  const handleExport = () => {
    // Export functionality would go here
    console.log('Exporting business summary for period:', selectedPeriod);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/3 to-secondary/5">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
                <Building className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Business Summary
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Comprehensive view of your investment gains and losses
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Select value={selectedPeriod} onValueChange={(value: Period) => setSelectedPeriod(value)}>
                <SelectTrigger className="w-full sm:w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(periodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowValues(!showValues)}
                  className="flex-1 sm:flex-none"
                >
                  {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="ml-2 sm:hidden">{showValues ? 'Hide' : 'Show'}</span>
                </Button>
                {showExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="flex-1 sm:flex-none"
                  >
                    <Download className="w-4 h-4" />
                    <span className="ml-2 sm:hidden">Export</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            {/* Total Released Earnings */}
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 truncate">
                      Total Realised Earnings
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-green-800 dark:text-green-200 truncate">
                      {formatCurrency(summary?.totalRealised || 0)}
                    </p>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      <span className="truncate">Realized gains & income</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Expected Earnings */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                      Total Expected Earnings
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-800 dark:text-blue-200 truncate">
                      {formatCurrency(summary?.totalExpected || 0)}
                    </p>
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      <span className="truncate">Unrealized potential</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Period Performance Summary */}
          <div className="mt-3 sm:mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-xs sm:text-sm text-muted-foreground">Net P&L</p>
              <p className={`text-sm sm:text-lg font-bold truncate ${(summary?.totalRealised + summary?.totalExpected) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency((summary?.totalRealised || 0) + (summary?.totalExpected || 0), true)}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-xs sm:text-sm text-muted-foreground">Portfolio ROI</p>
              <p className={`text-sm sm:text-lg font-bold ${summary?.portfolioRoi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(summary?.portfolioRoi || 0)}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-xs sm:text-sm text-muted-foreground">Active Streams</p>
              <p className="text-sm sm:text-lg font-bold">
                {summary?.activeStreams || 0}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-xs sm:text-sm text-muted-foreground">Period</p>
              <p className="text-sm sm:text-lg font-bold truncate">
                {periodLabels[selectedPeriod]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Streams Breakdown */}
      <Tabs defaultValue="shares" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="shares" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5 px-2">
            <PieChart className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Shares</span>
          </TabsTrigger>
          <TabsTrigger value="dividends" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5 px-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Dividends</span>
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5 px-2">
            <Users className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Referrals</span>
          </TabsTrigger>
          <TabsTrigger value="agent" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5 px-2">
            <Building className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Agent</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shares">
          <SharePerformanceSection 
            userId={user?.id!}
            period={selectedPeriod}
            showValues={showValues}
          />
        </TabsContent>

        <TabsContent value="dividends">
          <DividendSection 
            userId={user?.id!}
            period={selectedPeriod}
            showValues={showValues}
          />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralSection 
            userId={user?.id!}
            period={selectedPeriod}
            showValues={showValues}
          />
        </TabsContent>

        <TabsContent value="agent">
          <AgentSection 
            userId={user?.id!}
            period={selectedPeriod}
            showValues={showValues}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessSummary;