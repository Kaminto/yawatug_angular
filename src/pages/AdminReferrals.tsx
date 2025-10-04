import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Footer from '@/components/layout/Footer';
import { Users, DollarSign, TrendingUp, Coins, Search } from 'lucide-react';
import DrawManagement from '@/components/admin/referral/DrawManagement';
import CombinedReferralSettings from '@/components/admin/referral/CombinedReferralSettings';

const AdminReferrals = () => {
  const [referralStatistics, setReferralStatistics] = useState<any[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalCashEarnings: 0,
    totalCreditsIssued: 0,
    activeReferrers: 0
  });

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      // Load users who have referred others (referrers)
      // First get all referred_by IDs
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, referred_by')
        .not('referred_by', 'is', null);

      if (profilesError) throw profilesError;

      // Get unique referrer IDs
      const uniqueReferrerIds = [...new Set(allProfiles?.map(p => p.referred_by).filter(Boolean))];

      // Fetch referrer profiles with their stats
      const { data: referrers, error: referrersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, referral_code, created_at')
        .in('id', uniqueReferrerIds)
        .order('created_at', { ascending: false });

      if (referrersError) throw referrersError;

      // Count referrals for each referrer
      const referralCounts = allProfiles.reduce((acc: Record<string, number>, profile) => {
        if (profile.referred_by) {
          acc[profile.referred_by] = (acc[profile.referred_by] || 0) + 1;
        }
        return acc;
      }, {});

      // Load referral statistics to enrich the data
      const { data: statsData, error: statsError } = await supabase
        .from('referral_statistics')
        .select('*');

      if (statsError) console.error('Stats error:', statsError);

      // Enrich referrer data with stats
      const enrichedData = referrers?.map(referrer => {
        const stat = statsData?.find(s => s.user_id === referrer.id);
        return {
          id: referrer.id,
          user_id: referrer.id,
          profiles: {
            full_name: referrer.full_name,
            email: referrer.email,
            phone: referrer.phone
          },
          referral_code: referrer.referral_code,
          created_at: referrer.created_at,
          total_referrals: referralCounts[referrer.id] || 0,
          successful_referrals: stat?.successful_referrals || 0,
          total_earnings: stat?.total_earnings || 0,
          pending_earnings: stat?.pending_earnings || 0,
          last_activity_at: stat?.last_activity_at || null
        };
      }) || [];

      setReferralStatistics(enrichedData);

      // Load credit transactions for recent activity
      const { data: creditData, error: creditError } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          profiles!credit_transactions_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (creditError) throw creditError;
      setCreditTransactions(creditData || []);

      // Calculate aggregate stats
      const totalReferrals = Object.values(referralCounts).reduce((sum: number, count) => sum + (count as number), 0);
      const totalCashEarnings = enrichedData.reduce((sum, s) => sum + (s.total_earnings || 0), 0);
      const activeReferrers = enrichedData.length;

      // Get total credits issued
      const totalCreditsIssued = creditData
        ?.filter(t => t.transaction_type === 'referral_bonus')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      setStats({
        totalReferrals,
        totalCashEarnings,
        totalCreditsIssued,
        activeReferrers
      });

    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStatistics = referralStatistics.filter(stat => 
    stat.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stat.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stat.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCreditTransactions = creditTransactions.filter(tx => 
    tx.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.transaction_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AdminLayout title="Referral Management">
          <main className="flex-grow pt-20">
            <div className="container mx-auto px-4 py-12">
              <div className="animate-pulse">Loading referral data...</div>
            </div>
          </main>
        </AdminLayout>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminLayout title="Referral Management">
        <main className="flex-grow pt-20">
          <div className="container mx-auto px-4 py-12">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Referral Management</h1>
              <p className="text-muted-foreground">Monitor and manage the two-tier referral program</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalReferrals}</div>
                  <p className="text-xs text-muted-foreground">People referred</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Commissions</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">UGX {stats.totalCashEarnings.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Level 1 earnings</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Credits Issued</CardTitle>
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCreditsIssued.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Levels 2-5 rewards</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Referrers</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeReferrers}</div>
                  <p className="text-xs text-muted-foreground">With active referrals</p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users, emails, or codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="credit-activity">Credit Activity</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="draw-management">Draw Management</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Referral Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referrer Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Referral Code</TableHead>
                          <TableHead>Total Referrals</TableHead>
                          <TableHead>Successful</TableHead>
                          <TableHead>Cash Earnings</TableHead>
                          <TableHead>Pending</TableHead>
                          <TableHead>Last Activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStatistics.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              No referral data found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredStatistics.map((stat) => (
                            <TableRow key={stat.id}>
                              <TableCell className="font-medium">
                                {stat.profiles?.full_name || 'Unknown'}
                              </TableCell>
                              <TableCell>{stat.profiles?.email || 'Unknown'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{stat.referral_code}</Badge>
                              </TableCell>
                              <TableCell className="font-bold text-primary">
                                {stat.total_referrals}
                              </TableCell>
                              <TableCell>{stat.successful_referrals}</TableCell>
                              <TableCell>UGX {(stat.total_earnings || 0).toLocaleString()}</TableCell>
                              <TableCell>UGX {(stat.pending_earnings || 0).toLocaleString()}</TableCell>
                              <TableCell>
                                {stat.last_activity_at ? new Date(stat.last_activity_at).toLocaleDateString() : 'Never'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="credit-activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Credit Transactions</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Credits issued to referrers for Levels 2-5 referral activities
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Balance After</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCreditTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No credit transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCreditTransactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell>
                                {new Date(tx.created_at).toLocaleString()}
                              </TableCell>
                              <TableCell className="font-medium">
                                {tx.profiles?.full_name || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  tx.transaction_type === 'referral_bonus' ? 'default' :
                                  tx.transaction_type === 'conversion_to_shares' ? 'secondary' :
                                  tx.transaction_type === 'draw_entry' ? 'outline' : 'default'
                                }>
                                  {tx.transaction_type.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {tx.amount >= 0 ? '+' : ''}{tx.amount}
                              </TableCell>
                              <TableCell>{tx.balance_after}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {tx.description || 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <CombinedReferralSettings />
              </TabsContent>

              <TabsContent value="draw-management">
                <DrawManagement />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </AdminLayout>
      <Footer />
    </div>
  );
};

export default AdminReferrals;