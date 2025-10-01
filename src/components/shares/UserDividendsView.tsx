
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Calendar, TrendingUp, Gift, Info, Award, Sparkles } from 'lucide-react';

interface UserDividendsViewProps {
  userId: string;
  userShares: any[];
}

const UserDividendsView: React.FC<UserDividendsViewProps> = ({ userId, userShares }) => {
  const [dividendPayments, setDividendPayments] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [totalDividendsReceived, setTotalDividendsReceived] = useState<number>(0);
  const [totalBonusShares, setTotalBonusShares] = useState<number>(0);
  const [totalPromotionalBenefits, setTotalPromotionalBenefits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [userId]);

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadDividendData(),
        loadPromotionalData()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDividendData = async () => {
    try {
      // Load dividend payments for the user
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('dividend_payments')
        .select(`
          *,
          dividend_declarations(
            declaration_date,
            payment_type,
            per_share_amount,
            company_valuation,
            market_cap,
            description
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      setDividendPayments(paymentsData || []);

      // Calculate totals
      const totalCash = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const totalShares = paymentsData?.reduce((sum, payment) => sum + (payment.bonus_shares || 0), 0) || 0;

      setTotalDividendsReceived(totalCash);
      setTotalBonusShares(totalShares);

    } catch (error) {
      console.error('Error loading dividend data:', error);
    }
  };

  const loadPromotionalData = async () => {
    try {
      // Load promotional transactions and benefits
      const { data: promoData, error: promoError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .like('admin_notes', '%promotion%')
        .order('created_at', { ascending: false });

      if (!promoError) {
        setPromotions(promoData || []);
        const totalPromoValue = promoData?.reduce((sum, promo) => sum + Math.abs(promo.amount || 0), 0) || 0;
        setTotalPromotionalBenefits(totalPromoValue);
      }
    } catch (error) {
      console.error('Error loading promotional data:', error);
    }
  };

  const totalSharesOwned = userShares.reduce((sum, share) => sum + share.quantity, 0);

  if (loading) {
    return <div className="animate-pulse">Loading dividend and promotional information...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dividends</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {totalDividendsReceived.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Cash dividends received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonus Shares</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBonusShares.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Additional shares received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promotional Benefits</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {totalPromotionalBenefits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total promotional value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSharesOwned.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current holdings</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="dividends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dividends">Dividend History</TabsTrigger>
          <TabsTrigger value="promotions">Promotional Benefits</TabsTrigger>
        </TabsList>

        <TabsContent value="dividends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Dividend History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dividendPayments.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No dividend payments received yet. Dividends will appear here when declared and distributed.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {dividendPayments.map((payment) => {
                    const declaration = payment.dividend_declarations;
                    return (
                      <div key={payment.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">
                              Dividend Declaration - {new Date(declaration.declaration_date).toLocaleDateString()}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {declaration.description}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {declaration.payment_type}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Shares Owned</p>
                            <p className="font-medium">{payment.shares_owned.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Per Share Amount</p>
                            <p className="font-medium">UGX {declaration.per_share_amount.toLocaleString()}</p>
                          </div>
                          {payment.amount > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground">Cash Received</p>
                              <p className="font-medium text-green-600">UGX {payment.amount.toLocaleString()}</p>
                            </div>
                          )}
                          {payment.bonus_shares > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground">Bonus Shares</p>
                              <p className="font-medium text-blue-600">{payment.bonus_shares.toLocaleString()}</p>
                            </div>
                          )}
                        </div>

                        <div className="mt-2">
                          <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {payment.status === 'paid' ? 'Paid to wallet' : 'Processing'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Promotional Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {promotions.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No promotional benefits received yet. Special offers and bonuses will appear here when credited to your account.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {promotions.map((promo) => {
                    const adminNotes = promo.admin_notes ? JSON.parse(promo.admin_notes) : {};
                    return (
                      <div key={promo.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-yellow-500" />
                              Promotional Credit
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(promo.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                            Promotion
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Amount</p>
                            <p className="font-medium text-green-600">
                              +{promo.currency} {Math.abs(promo.amount).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Reference</p>
                            <p className="font-medium">{promo.reference}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge variant={promo.status === 'completed' ? 'default' : 'secondary'}>
                              {promo.status}
                            </Badge>
                          </div>
                        </div>

                        {adminNotes.promotion_type && (
                          <div className="mt-3 p-2 bg-muted rounded text-sm">
                            <strong>Promotion Type:</strong> {adminNotes.promotion_type}
                            {adminNotes.description && (
                              <div className="mt-1">
                                <strong>Details:</strong> {adminNotes.description}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDividendsView;
