import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Calendar, Percent, Bell, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DividendPayment {
  id: string;
  amount: number;
  bonus_shares?: number;
  created_at: string;
  dividend_declaration_id?: string;
  shares_owned?: number;
  status: string;
  updated_at: string;
  user_id: string;
  wallet_id?: string;
}

interface DividendDeclaration {
  id: string;
  company_valuation?: number;
  created_at: string;
  created_by?: string;
  cut_off_date?: string;
  declaration_date?: string;
  description?: string;
  eligible_shareholders_count?: number;
  payment_date?: string;
  per_share_dividend_amount?: number;
  status: string;
  total_dividend_amount?: number;
  updated_at: string;
}

interface DividendDashboardProps {
  userId: string;
  totalShares: number;
}

const DividendDashboard: React.FC<DividendDashboardProps> = ({ userId, totalShares }) => {
  const [dividendPayments, setDividendPayments] = useState<DividendPayment[]>([]);
  const [dividendDeclarations, setDividendDeclarations] = useState<DividendDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    reinvestmentEnabled: false,
    reinvestmentPercentage: 100
  });

  useEffect(() => {
    if (userId) {
      loadDividendData();
    }
  }, [userId]);

  const loadDividendData = async () => {
    try {
      setLoading(true);
      
      // Load user's dividend payments
      const { data: payments, error: paymentsError } = await supabase
        .from('dividend_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (paymentsError && paymentsError.code !== 'PGRST116') {
        console.error('Error loading dividend payments:', paymentsError);
      } else {
        setDividendPayments(payments || []);
      }

      // Load all dividend declarations to show upcoming dividends
      const { data: declarations, error: declarationsError } = await supabase
        .from('dividend_declarations')
        .select('*')
        .order('created_at', { ascending: false });

      if (declarationsError && declarationsError.code !== 'PGRST116') {
        console.error('Error loading dividend declarations:', declarationsError);
      } else {
        setDividendDeclarations(declarations || []);
      }

    } catch (error) {
      console.error('Error loading dividend data:', error);
      toast.error('Failed to load dividend information');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalReceived = dividendPayments
      .filter(payment => payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    const totalPending = dividendPayments
      .filter(payment => payment.status === 'pending')
      .reduce((sum, payment) => sum + payment.amount, 0);

    const currentYearPayments = dividendPayments
      .filter(payment => {
        const paymentYear = new Date(payment.created_at).getFullYear();
        return paymentYear === new Date().getFullYear() && payment.status === 'completed';
      })
      .reduce((sum, payment) => sum + payment.amount, 0);

    const lastDividendPerShare = dividendDeclarations.length > 0 
      ? dividendDeclarations[0].per_share_dividend_amount || 0
      : 0;

    const annualizedDividendYield = lastDividendPerShare > 0 && totalShares > 0
      ? (lastDividendPerShare * 4 / 50000) * 100 // Assuming quarterly dividends and share price of 50,000
      : 0;

    return {
      totalReceived,
      totalPending,
      currentYearPayments,
      lastDividendPerShare,
      annualizedDividendYield,
      paymentsCount: dividendPayments.length
    };
  };

  const getUpcomingDividends = () => {
    const today = new Date();
    return dividendDeclarations.filter(declaration => {
      const cutOffDate = declaration.cut_off_date ? new Date(declaration.cut_off_date) : null;
      return cutOffDate && cutOffDate > today && declaration.status === 'approved';
    });
  };

  const getProjectedDividend = (dividendPerShare: number) => {
    return dividendPerShare * totalShares;
  };

  const stats = calculateStats();
  const upcomingDividends = getUpcomingDividends();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dividend Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dividend Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Received</p>
                <p className="text-2xl font-bold">UGX {stats.totalReceived.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Year</p>
                <p className="text-2xl font-bold">UGX {stats.currentYearPayments.toLocaleString()}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Yield (Est.)</p>
                <p className="text-2xl font-bold">{stats.annualizedDividendYield.toFixed(2)}%</p>
              </div>
              <Percent className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Payments</p>
                <p className="text-2xl font-bold">{stats.paymentsCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Dividends</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Dividend Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {dividendPayments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No dividend payments received yet.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    You'll see your dividend payments here once they're distributed.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dividendPayments.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={
                              payment.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }>
                              {payment.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <p className="font-medium">
                            Dividend Payment
                          </p>
                          <p className="text-sm text-gray-600">
                            {payment.shares_owned || 0} shares @ UGX {(payment.amount / Math.max(payment.shares_owned || 1, 1)).toLocaleString()}/share (est.)
                          </p>
                          <p className="text-xs text-gray-500">
                            Declaration ID: {payment.dividend_declaration_id || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-green-600">
                            +UGX {payment.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Dividend Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDividends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No upcoming dividend payments scheduled.</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Check back later for announcements about future dividend distributions.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingDividends.map((declaration) => (
                    <div key={declaration.id} className="border rounded-lg p-4 bg-blue-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              Scheduled
                            </Badge>
                            <span className="text-sm text-gray-600">
                              Cut-off Date: {declaration.cut_off_date ? format(new Date(declaration.cut_off_date), 'MMM dd, yyyy') : 'TBD'}
                            </span>
                          </div>
                          <p className="font-medium">
                            Upcoming Dividend
                          </p>
                          <p className="text-sm text-gray-600">
                            UGX {(declaration.per_share_dividend_amount || 0).toLocaleString()}/share
                          </p>
                          <p className="text-xs text-gray-500">
                            Payment Date: {declaration.payment_date ? format(new Date(declaration.payment_date), 'MMM dd, yyyy') : 'TBD'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-blue-600">
                            ~UGX {getProjectedDividend(declaration.per_share_dividend_amount || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Based on {totalShares} shares
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle>Dividend Projections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Annual Projection</h4>
                  <div className="border rounded-lg p-4">
                    <p className="text-2xl font-bold text-green-600">
                      UGX {(stats.lastDividendPerShare * totalShares * 4).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Based on last dividend of UGX {stats.lastDividendPerShare.toLocaleString()}/share quarterly
                    </p>
                    <Progress value={75} className="mt-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      Estimated yield: {stats.annualizedDividendYield.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Reinvestment Impact</h4>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">
                      If you reinvest dividends at current share price:
                    </p>
                    <p className="text-lg font-semibold">
                      +{Math.floor((stats.lastDividendPerShare * totalShares) / 50000)} shares/quarter
                    </p>
                    <p className="text-xs text-gray-500">
                      Compounding effect over time
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Historical Performance</h4>
                <div className="text-sm text-gray-600">
                  <p>• Total dividends received: UGX {stats.totalReceived.toLocaleString()}</p>
                  <p>• Average per payment: UGX {stats.paymentsCount > 0 ? (stats.totalReceived / stats.paymentsCount).toLocaleString() : '0'}</p>
                  <p>• Current year progress: UGX {stats.currentYearPayments.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Dividend Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-gray-600">Get notified about dividend announcements and payments</p>
                  </div>
                  <Button
                    variant={preferences.emailNotifications ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreferences(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                  >
                    {preferences.emailNotifications ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Automatic Reinvestment</h4>
                      <p className="text-sm text-gray-600">Automatically reinvest dividend payments into more shares</p>
                    </div>
                    <Button
                      variant={preferences.reinvestmentEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreferences(prev => ({ ...prev, reinvestmentEnabled: !prev.reinvestmentEnabled }))}
                    >
                      {preferences.reinvestmentEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  
                  {preferences.reinvestmentEnabled && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reinvestment Percentage</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={preferences.reinvestmentPercentage}
                        onChange={(e) => setPreferences(prev => ({ ...prev, reinvestmentPercentage: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0%</span>
                        <span>{preferences.reinvestmentPercentage}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Bell className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-yellow-800">Tax Considerations</p>
                      <p className="text-xs text-yellow-700">
                        Dividend payments may be subject to taxation. Please consult with a tax advisor for guidance on your specific situation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DividendDashboard;