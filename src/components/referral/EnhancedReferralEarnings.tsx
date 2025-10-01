import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  Clock, 
  ChevronDown, 
  DollarSign,
  TrendingUp,
  Receipt,
  Calendar
} from 'lucide-react';
import { useReferralCommissions } from '@/hooks/useReferralCommissions';

interface EnhancedReferralEarningsProps {
  userId: string;
}

const EnhancedReferralEarnings: React.FC<EnhancedReferralEarningsProps> = ({ userId }) => {
  const { commissions, loading, enhancedEarnings } = useReferralCommissions(userId);
  const [realizedOpen, setRealizedOpen] = useState(true);
  const [expectedOpen, setExpectedOpen] = useState(true);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-40 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCommissions = enhancedEarnings.totalEarned + enhancedEarnings.totalExpected;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {totalCommissions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Realized + Expected</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realized Earnings</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              UGX {enhancedEarnings.totalEarned.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 mt-1">Paid to your account</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Earnings</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              UGX {enhancedEarnings.totalExpected.toLocaleString()}
            </div>
            <p className="text-xs text-orange-600 mt-1">From pending bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Earnings Breakdown
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed view of your referral commission earnings
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Realized Earnings Section */}
          <Collapsible open={realizedOpen} onOpenChange={setRealizedOpen}>
            <Card className="border-green-200 dark:border-green-900">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-lg">Realized Earnings</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {enhancedEarnings.breakdown.directPurchases.length + 
                           enhancedEarnings.breakdown.installmentPayments.length} transactions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-700">
                          UGX {enhancedEarnings.totalEarned.toLocaleString()}
                        </div>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 transition-transform duration-200 ${
                          realizedOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">
                        All ({enhancedEarnings.breakdown.directPurchases.length + 
                             enhancedEarnings.breakdown.installmentPayments.length})
                      </TabsTrigger>
                      <TabsTrigger value="direct">
                        Direct ({enhancedEarnings.breakdown.directPurchases.length})
                      </TabsTrigger>
                      <TabsTrigger value="installment">
                        Installments ({enhancedEarnings.breakdown.installmentPayments.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="all" className="space-y-3 mt-4">
                      {[...enhancedEarnings.breakdown.directPurchases, 
                        ...enhancedEarnings.breakdown.installmentPayments]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((commission) => (
                        <CommissionItem key={commission.id} commission={commission} type="realized" />
                      ))}
                      {(enhancedEarnings.breakdown.directPurchases.length + 
                        enhancedEarnings.breakdown.installmentPayments.length) === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No realized earnings yet
                        </p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="direct" className="space-y-3 mt-4">
                      {enhancedEarnings.breakdown.directPurchases.map((commission) => (
                        <CommissionItem key={commission.id} commission={commission} type="realized" />
                      ))}
                      {enhancedEarnings.breakdown.directPurchases.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No direct purchase commissions yet
                        </p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="installment" className="space-y-3 mt-4">
                      {enhancedEarnings.breakdown.installmentPayments.map((commission) => (
                        <CommissionItem key={commission.id} commission={commission} type="realized" />
                      ))}
                      {enhancedEarnings.breakdown.installmentPayments.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No installment payment commissions yet
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Realized Summary */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Direct Purchases</p>
                        <p className="font-bold text-green-700">
                          UGX {enhancedEarnings.directEarned.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Installment Payments</p>
                        <p className="font-bold text-green-700">
                          UGX {enhancedEarnings.installmentEarned.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Expected Earnings Section */}
          <Collapsible open={expectedOpen} onOpenChange={setExpectedOpen}>
            <Card className="border-orange-200 dark:border-orange-900">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Clock className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-lg">Expected Earnings</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {enhancedEarnings.breakdown.expectedFromBookings.length} pending bookings
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-bold text-orange-700">
                          UGX {enhancedEarnings.totalExpected.toLocaleString()}
                        </div>
                      </div>
                      <ChevronDown 
                        className={`h-5 w-5 transition-transform duration-200 ${
                          expectedOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {enhancedEarnings.breakdown.expectedFromBookings.map((commission) => (
                      <CommissionItem key={commission.id} commission={commission} type="expected" />
                    ))}
                    {enhancedEarnings.breakdown.expectedFromBookings.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No pending bookings
                      </p>
                    )}
                  </div>

                  {/* Expected Info */}
                  {enhancedEarnings.breakdown.expectedFromBookings.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          <strong>Note:</strong> These commissions will be paid as your referrals 
                          complete their installment payments on their share bookings.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
};

// Commission Item Component
interface CommissionItemProps {
  commission: any;
  type: 'realized' | 'expected';
}

const CommissionItem: React.FC<CommissionItemProps> = ({ commission, type }) => {
  const isRealized = type === 'realized';
  const bgColor = isRealized ? 'bg-green-50 dark:bg-green-950/20' : 'bg-orange-50 dark:bg-orange-950/20';
  const textColor = isRealized ? 'text-green-700' : 'text-orange-700';
  const badgeVariant = isRealized ? 'default' : 'secondary';

  return (
    <div className={`p-4 border rounded-lg ${bgColor} flex items-start justify-between gap-4`}>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">
            {commission.referred_profile?.full_name || 'User'}
          </p>
          <Badge variant={badgeVariant} className="text-xs">
            {commission.commission_type === 'direct_purchase' ? 'Direct' :
             commission.commission_type === 'installment_payment' ? 'Installment' :
             'Expected'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(commission.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {commission.commission_rate}% rate
          </div>
        </div>
        
        {commission.source_amount && (
          <p className="text-xs text-muted-foreground">
            Source: UGX {commission.source_amount.toLocaleString()}
          </p>
        )}
      </div>
      
      <div className="text-right">
        <p className={`text-lg font-bold ${textColor}`}>
          +UGX {commission.commission_amount.toLocaleString()}
        </p>
        {isRealized && commission.paid_at && (
          <p className="text-xs text-muted-foreground mt-1">
            Paid {new Date(commission.paid_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default EnhancedReferralEarnings;
