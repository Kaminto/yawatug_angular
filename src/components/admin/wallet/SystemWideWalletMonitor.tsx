
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Download, RefreshCw, Wallet } from 'lucide-react';

interface WalletData {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  status: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name: string;
    email: string;
    status: string;
  };
}

const SystemWideWalletMonitor = () => {
  const [userWallets, setUserWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);

      // Load user wallets
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (walletsError) throw walletsError;

      // Get user profiles separately
      const userIds = [...new Set(walletsData?.map(w => w.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, status')
        .in('id', userIds);

      const processedWallets = (walletsData || []).map(wallet => ({
        ...wallet,
        user_profile: profiles?.find(p => p.id === wallet.user_id) || {
          full_name: 'Unknown User',
          email: 'No email',
          status: 'unknown'
        }
      }));

      setUserWallets(processedWallets);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWallets = userWallets.filter(wallet => {
    const matchesSearch = 
      wallet.user_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wallet.user_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wallet.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCurrency = currencyFilter === 'all' || wallet.currency === currencyFilter;
    const matchesStatus = statusFilter === 'all' || wallet.status === statusFilter;
    
    return matchesSearch && matchesCurrency && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Verified</Badge>;
      case 'pending_verification':
        return <Badge variant="secondary">Pending</Badge>;
      case 'unverified':
        return <Badge variant="outline">Unverified</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalBalance = filteredWallets.reduce((sum, wallet) => {
    return sum + (wallet.currency === 'UGX' ? wallet.balance : wallet.balance * 3800);
  }, 0);

  const totalUsers = new Set(filteredWallets.map(w => w.user_id)).size;

  if (loading) {
    return <div className="animate-pulse">Loading system-wide wallet data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total System Value</p>
                <p className="text-2xl font-bold">UGX {totalBalance.toLocaleString()}</p>
              </div>
              <Wallet className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Wallets</p>
                <p className="text-2xl font-bold">{filteredWallets.length}</p>
              </div>
              <Wallet className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Balance</p>
                <p className="text-2xl font-bold">UGX {totalUsers > 0 ? Math.round(totalBalance / totalUsers).toLocaleString() : '0'}</p>
              </div>
              <Filter className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>System-Wide Wallet Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by user name, email, or wallet ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                <SelectItem value="UGX">UGX</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={loadWalletData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Wallet List */}
          <div className="space-y-4">
            {filteredWallets.map((wallet) => (
              <div key={wallet.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium">{wallet.user_profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{wallet.user_profile?.email}</p>
                    {getUserStatusBadge(wallet.user_profile?.status || 'unknown')}
                    {getStatusBadge(wallet.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Currency</p>
                      <p className="font-medium">{wallet.currency}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className="font-medium">{wallet.currency} {wallet.balance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(wallet.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Updated</p>
                      <p className="font-medium">{new Date(wallet.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </div>
            ))}
            
            {filteredWallets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No wallets match the current filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemWideWalletMonitor;
