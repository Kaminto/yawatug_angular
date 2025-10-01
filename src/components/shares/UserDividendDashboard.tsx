
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Calendar, TrendingUp, History, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserDividendDashboardProps {
  userId: string;
  userShares: any[];
}

const UserDividendDashboard: React.FC<UserDividendDashboardProps> = ({
  userId,
  userShares
}) => {
  const [dividendPayments, setDividendPayments] = useState<any[]>([]);
  const [dividendDeclarations, setDividendDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDividendData();
  }, [userId]);

  const loadDividendData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Load user's dividend payments
      const { data: payments, error: paymentsError } = await supabase
        .from('dividend_payments')
        .select(`
          *,
          dividend_declaration_id (
            declaration_date,
            per_share_amount,
            payment_type,
            description
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!paymentsError) {
        setDividendPayments(payments || []);
      }

      // Load all dividend declarations
      const { data: declarations, error: declarationsError } = await supabase
        .from('dividend_declarations')
        .select('*')
        .eq('status', 'approved')
        .order('declaration_date', { ascending: false });

      if (!declarationsError) {
        setDividendDeclarations(declarations || []);
      }
    } catch (error) {
      console.error('Error loading dividend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDividendStats = () => {
    const totalReceived = dividendPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalShares = userShares.reduce((sum, share) => sum + share.quantity, 0);
    const avgDividendPerShare = totalShares > 0 ? totalReceived / totalShares : 0;
    
    return {
      totalReceived,
      totalShares,
      avgDividendPerShare,
      paymentsCount: dividendPayments.length
    };
  };

  const stats = calculateDividendStats();

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dividend Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dividend Center</h2>
          <p className="text-muted-foreground">Track your dividend payments and upcoming distributions</p>
        </div>
        <Button variant="outline" onClick={loadDividendData}>
          <Gift className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Dividend Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">Total Received</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                  UGX {stats.totalReceived.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eligible Shares</p>
                <p className="text-2xl font-bold">{stats.totalShares.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Per Share</p>
                <p className="text-2xl font-bold">UGX {stats.avgDividendPerShare.toFixed(2)}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{stats.paymentsCount}</p>
              </div>
              <History className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dividend Tabs */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="payments">My Payments</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Dividend Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {dividendPayments.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No dividend payments received yet</p>
                  <p className="text-sm text-gray-400">You'll see your dividend payments here when they're processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dividendPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Dividend Payment</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.shares_owned.toLocaleString()} shares × UGX {(payment.amount / payment.shares_owned).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">
                          UGX {payment.amount.toLocaleString()}
                        </p>
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Dividend Declarations</CardTitle>
            </CardHeader>
            <CardContent>
              {dividendDeclarations.filter(d => d.status === 'approved' && new Date(d.payment_date) > new Date()).length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No upcoming dividend payments</p>
                  <p className="text-sm text-gray-400">Check back later for new dividend announcements</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dividendDeclarations
                    .filter(d => d.status === 'approved' && new Date(d.payment_date) > new Date())
                    .map((declaration) => {
                      const eligibleShares = stats.totalShares;
                      const estimatedAmount = eligibleShares * declaration.per_share_amount;
                      
                      return (
                        <div key={declaration.id} className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Upcoming Dividend</p>
                              <p className="text-sm text-muted-foreground">
                                UGX {declaration.per_share_amount} per share
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Payment Date: {new Date(declaration.payment_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-600">
                                Est. UGX {estimatedAmount.toLocaleString()}
                              </p>
                              <Badge variant="outline">
                                {eligibleShares.toLocaleString()} shares
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dividend Declaration History</CardTitle>
            </CardHeader>
            <CardContent>
              {dividendDeclarations.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No dividend history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dividendDeclarations.map((declaration) => (
                    <div key={declaration.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {new Date(declaration.declaration_date).getFullYear()} Dividend
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Declared: {new Date(declaration.declaration_date).toLocaleDateString()}
                          </p>
                          {declaration.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {declaration.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            UGX {declaration.per_share_amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">per share</p>
                          <Badge variant={declaration.status === 'paid' ? 'default' : 'secondary'}>
                            {declaration.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDividendDashboard;
