import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Search, Eye, Download } from 'lucide-react';

const UserReportsManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userReportData, setUserReportData] = useState<any>(null);
  const [reportType, setReportType] = useState('portfolio');
  const [loading, setLoading] = useState(false);

  const userReportTypes = [
    { value: 'portfolio', label: 'Portfolio Summary' },
    { value: 'transactions', label: 'Transaction History' },
    { value: 'dividends', label: 'Dividend History' },
    { value: 'bookings', label: 'Share Bookings' }
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      generateUserReport();
    }
  }, [selectedUser, reportType]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, account_type')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const generateUserReport = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      switch (reportType) {
        case 'portfolio':
          await generatePortfolioReport();
          break;
        case 'transactions':
          await generateTransactionHistory();
          break;
        case 'dividends':
          await generateDividendHistory();
          break;
        case 'bookings':
          await generateBookingHistory();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error generating user report:', error);
      toast.error('Failed to generate user report');
    } finally {
      setLoading(false);
    }
  };

  const generatePortfolioReport = async () => {
    const [userShares, wallets, userProfile] = await Promise.all([
      supabase
        .from('user_shares')
        .select(`
          *,
          shares(name, price_per_share, currency)
        `)
        .eq('user_id', selectedUser),
      
      supabase
        .from('wallets')
        .select('*')
        .eq('user_id', selectedUser),
      
      supabase
        .from('profiles')
        .select('*')
        .eq('id', selectedUser)
        .single()
    ]);

    if (userShares.error) throw userShares.error;
    if (wallets.error) throw wallets.error;
    if (userProfile.error) throw userProfile.error;

    const totalShareValue = userShares.data?.reduce((sum, share) => 
      sum + (share.quantity * (share.shares?.price_per_share || 0)), 0) || 0;

    const totalWalletBalance = wallets.data?.reduce((sum, wallet) => 
      sum + wallet.balance, 0) || 0;

    setUserReportData({
      type: 'portfolio',
      profile: userProfile.data,
      shares: userShares.data,
      wallets: wallets.data,
      summary: {
        totalShareValue,
        totalWalletBalance,
        totalPortfolioValue: totalShareValue + totalWalletBalance,
        shareCount: userShares.data?.reduce((sum, share) => sum + share.quantity, 0) || 0
      }
    });
  };

  const generateTransactionHistory = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', selectedUser)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    setUserReportData({
      type: 'transactions',
      data: data || [],
      summary: {
        totalTransactions: data?.length || 0,
        totalDeposits: data?.filter(t => t.transaction_type === 'deposit').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0,
        totalWithdrawals: data?.filter(t => t.transaction_type === 'withdrawal').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
      }
    });
  };

  const generateDividendHistory = async () => {
    const { data, error } = await supabase
      .from('dividend_payments')
      .select(`
        *,
        dividend_declarations(declaration_date, per_share_amount)
      `)
      .eq('user_id', selectedUser)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setUserReportData({
      type: 'dividends',
      data: data || [],
      summary: {
        totalDividends: data?.length || 0,
        totalAmount: data?.reduce((sum, d) => sum + d.amount, 0) || 0
      }
    });
  };

  const generateBookingHistory = async () => {
    const { data, error } = await supabase
      .from('share_bookings')
      .select(`
        *,
        shares(name)
      `)
      .eq('user_id', selectedUser)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setUserReportData({
      type: 'bookings',
      data: data || [],
      summary: {
        totalBookings: data?.length || 0,
        totalValue: data?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0,
        activeBookings: data?.filter(b => b.status === 'active').length || 0
      }
    });
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'active':
        return <Badge variant="secondary">Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Generate User Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userReportTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {userReportData && (
        <>
          {/* Summary Cards */}
          {userReportData.summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(userReportData.summary).map(([key, value]) => (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <div className="ml-2">
                        <p className="text-2xl font-bold">
                          {typeof value === 'number' && key.toLowerCase().includes('amount') 
                            ? `UGX ${(value as number).toLocaleString()}` 
                            : typeof value === 'number' 
                            ? (value as number).toLocaleString() 
                            : value as string}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Portfolio Details */}
          {userReportData.type === 'portfolio' && userReportData.shares && (
            <Card>
              <CardHeader>
                <CardTitle>Share Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Share</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userReportData.shares.map((share: any) => (
                      <TableRow key={share.id}>
                        <TableCell>{share.shares?.name || 'Unknown'}</TableCell>
                        <TableCell>{share.quantity.toLocaleString()}</TableCell>
                        <TableCell>UGX {(share.shares?.price_per_share || 0).toLocaleString()}</TableCell>
                        <TableCell>UGX {(share.quantity * (share.shares?.price_per_share || 0)).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Other Report Data */}
          {userReportData.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {userReportTypes.find(t => t.value === reportType)?.label} Data
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {userReportData.data.length > 0 && Object.keys(userReportData.data[0]).slice(0, 5).map((key: string) => (
                        <TableHead key={key} className="capitalize">
                          {key.replace(/_/g, ' ')}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userReportData.data.slice(0, 20).map((row: any, index: number) => (
                      <TableRow key={index}>
                        {Object.values(row).slice(0, 5).map((value: any, cellIndex: number) => (
                          <TableCell key={cellIndex}>
                            {typeof value === 'object' && value !== null 
                              ? getStatusBadge(value.toString())
                              : typeof value === 'number' && value > 1000
                              ? value.toLocaleString()
                              : value?.toString() || 'N/A'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default UserReportsManager;
