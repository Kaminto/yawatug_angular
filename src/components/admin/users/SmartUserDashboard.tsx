import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search, 
  Users, 
  UserCheck, 
  AlertTriangle, 
  TrendingUp,
  Wallet,
  Shield,
  Activity,
  Eye,
  MessageSquare,
  Ban,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  account_type: string;
  profile_completion_percentage: number;
  profile_picture_url?: string;
  created_at: string;
  last_login?: string;
  login_count: number;
  risk_score: number;
  wallet_balance: { [currency: string]: number };
  share_holdings: number;
  transaction_count: number;
  last_transaction_date?: string;
  verification_status: string;
}

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  pendingVerification: number;
  highRiskUsers: number;
  newUsersThisWeek: number;
  totalWalletValue: { [currency: string]: number };
  avgProfileCompletion: number;
}

const SmartUserDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<UserMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    pendingVerification: 0,
    highRiskUsers: 0,
    newUsersThisWeek: 0,
    totalWalletValue: {},
    avgProfileCompletion: 0
  });

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load users with basic info first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          status,
          account_type,
          profile_completion_percentage,
          profile_picture_url,
          created_at,
          last_login,
          login_count
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (profilesError) throw profilesError;

      // Load wallet data
      const userIds = (profiles || []).map(p => p.id);
      const { data: walletData } = await supabase
        .from('wallets')
        .select('user_id, currency, balance')
        .in('user_id', userIds);

      // Load share holdings
      const { data: shareData } = await supabase
        .from('user_share_holdings')
        .select('user_id, quantity')
        .in('user_id', userIds);

      // Process and combine data
      const enrichedUsers: UserProfile[] = (profiles || []).map(profile => {
        const userWallets = (walletData || []).filter(w => w.user_id === profile.id);
        const userShares = (shareData || []).filter(s => s.user_id === profile.id);

        const walletBalance: { [currency: string]: number } = {};
        userWallets.forEach(wallet => {
          walletBalance[wallet.currency] = (walletBalance[wallet.currency] || 0) + wallet.balance;
        });

        const shareHoldings = userShares.reduce((sum, holding) => sum + holding.quantity, 0);
        
        // Simple risk score calculation
        const riskScore = calculateRiskScore(profile, [], walletBalance);

        return {
          ...profile,
          risk_score: riskScore,
          wallet_balance: walletBalance,
          share_holdings: shareHoldings,
          transaction_count: 0, // Simplified for performance
          last_transaction_date: undefined,
          verification_status: mapVerificationStatus(profile.status)
        };
      });

      setUsers(enrichedUsers);
      calculateMetrics(enrichedUsers, walletData || []);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskScore = (profile: any, transactions: any[], walletBalance: { [currency: string]: number }) => {
    let score = 0;
    
    // Profile completion
    if ((profile.profile_completion_percentage || 0) < 50) score += 20;
    else if ((profile.profile_completion_percentage || 0) < 80) score += 10;
    
    // Account verification
    if (profile.status !== 'active') score += 30;
    
    // Transaction activity
    const recentTransactions = transactions.filter(t => 
      new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    if (recentTransactions.length > 20) score += 15;
    
    // High wallet balance without verification
    const totalBalance = Object.values(walletBalance).reduce((sum, balance) => sum + (balance || 0), 0);
    if (totalBalance > 1000000 && profile.status !== 'active') score += 25;
    
    return Math.min(score, 100);
  };

  const mapVerificationStatus = (status: string) => {
    switch (status) {
      case 'active': return 'verified';
      case 'pending_verification': return 'pending';
      case 'unverified': return 'unverified';
      case 'blocked': return 'blocked';
      default: return 'unverified';
    }
  };

  const calculateMetrics = (users: UserProfile[], walletData: any[]) => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const totalWalletValue: { [currency: string]: number } = {};
    walletData.forEach(wallet => {
      totalWalletValue[wallet.currency] = (totalWalletValue[wallet.currency] || 0) + wallet.balance;
    });

    const metrics: UserMetrics = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.last_login && new Date(u.last_login) > thirtyDaysAgo).length,
      verifiedUsers: users.filter(u => u.verification_status === 'verified').length,
      pendingVerification: users.filter(u => u.verification_status === 'pending').length,
      highRiskUsers: users.filter(u => u.risk_score >= 70).length,
      newUsersThisWeek: users.filter(u => new Date(u.created_at) > oneWeekAgo).length,
      totalWalletValue,
      avgProfileCompletion: users.reduce((sum, u) => sum + (u.profile_completion_percentage || 0), 0) / users.length
    };

    setMetrics(metrics);
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'verified': return user.verification_status === 'verified';
          case 'pending': return user.verification_status === 'pending';
          case 'high-risk': return user.risk_score >= 70;
          case 'active': return user.last_login && new Date(user.last_login) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          default: return true;
        }
      });
    }

    setFilteredUsers(filtered);
  };

  const getStatusBadge = (user: UserProfile) => {
    const status = user.verification_status;
    
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'blocked':
        return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Blocked</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Unverified</Badge>;
    }
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore < 30) return <Badge variant="secondary" className="bg-green-100 text-green-800">Low</Badge>;
    if (riskScore < 70) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge variant="destructive">High</Badge>;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  if (loading) {
    return <div className="animate-pulse">Loading user dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics.newUsersThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.verifiedUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingVerification} pending verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Users</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.highRiskUsers}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.avgProfileCompletion)}%</div>
            <Progress value={metrics.avgProfileCompletion} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Search & Management</CardTitle>
          <CardDescription>Find and manage user accounts with advanced filtering</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'verified' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('verified')}
              >
                Verified
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === 'high-risk' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('high-risk')}
              >
                High Risk
              </Button>
            </div>
          </div>

          {/* User Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.slice(0, 24).map(user => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar>
                      <AvatarImage src={user.profile_picture_url} />
                      <AvatarFallback>
                        {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{user.full_name || 'Unnamed User'}</h3>
                        {getStatusBadge(user)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.phone}</p>
                      
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Profile:</span>
                          <span>{user.profile_completion_percentage || 0}%</span>
                        </div>
                        <Progress value={user.profile_completion_percentage || 0} className="h-1" />
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Risk:</span>
                          {getRiskBadge(user.risk_score)}
                        </div>

                        {Object.keys(user.wallet_balance).length > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <Wallet className="h-3 w-3" />
                            {Object.entries(user.wallet_balance).map(([currency, amount]) => (
                              <span key={currency}>{formatCurrency(amount, currency)}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between pt-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Contact
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found matching your criteria</p>
            </div>
          )}

          {filteredUsers.length > 24 && (
            <div className="text-center mt-4">
              <Button variant="outline" onClick={() => {
                // Load more users with pagination
                const nextBatch = users.slice(24, 48);
                setFilteredUsers([...filteredUsers, ...nextBatch]);
              }}>
                Load More ({filteredUsers.length - 24} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartUserDashboard;