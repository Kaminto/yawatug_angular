
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Wallet, Users, DollarSign, TrendingUp, Eye, Edit } from 'lucide-react';
import WalletActionsModal from './WalletActionsModal';

interface UserWallet {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  status: string;
  created_at: string;
  updated_at: string;
  user: {
    full_name: string;
    email: string;
    phone: string;
    status: string;
  };
}

const UserWalletsOverview = () => {
  const [userWallets, setUserWallets] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);

  useEffect(() => {
    loadUserWallets();
  }, []);

  const loadUserWallets = async () => {
    try {
      // First get all wallets
      const { data: walletsData, error: walletsError } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false });

      if (walletsError) throw walletsError;

      // Then get all profiles  
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, status');

      if (profilesError) throw profilesError;

      // Create a map of profiles by user_id for efficient lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
      
      // Transform the data to match our interface
      const transformedData = (walletsData || []).map(wallet => {
        const profile = profilesMap.get(wallet.user_id);
        return {
          ...wallet,
          user: {
            full_name: profile?.full_name || 'Unknown',
            email: profile?.email || 'Unknown', 
            phone: profile?.phone || 'Unknown',
            status: profile?.status || 'unknown'
          }
        };
      });
      
      setUserWallets(transformedData);
    } catch (error) {
      console.error('Error loading user wallets:', error);
      toast.error('Failed to load user wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleViewWallet = (wallet: UserWallet) => {
    setSelectedWallet(wallet);
    setShowActionsModal(true);
  };

  const filteredWallets = userWallets.filter(wallet => {
    const matchesSearch = 
      wallet.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wallet.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wallet.user.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || wallet.status === statusFilter;
    const matchesCurrency = currencyFilter === 'all' || wallet.currency === currencyFilter;
    
    return matchesSearch && matchesStatus && matchesCurrency;
  });

  const totalBalance = userWallets.reduce((sum, wallet) => {
    if (wallet.currency === 'UGX') {
      return sum + wallet.balance;
    }
    return sum + (wallet.balance * 3700); // Rough USD to UGX conversion
  }, 0);

  const activeUsers = new Set(userWallets.map(w => w.user_id)).size;
  const totalWallets = userWallets.length;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-500', text: 'Active' },
      inactive: { color: 'bg-gray-500', text: 'Inactive' },
      suspended: { color: 'bg-red-500', text: 'Suspended' },
      blocked: { color: 'bg-red-600', text: 'Blocked' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (loading) {
    return <div className="animate-pulse">Loading user wallets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">User Wallets Overview</h3>
        <Button onClick={loadUserWallets}>
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Wallets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWallets.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Balance (UGX)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {totalBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Balance per User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {activeUsers > 0 ? Math.round(totalBalance / activeUsers).toLocaleString() : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            <SelectItem value="UGX">UGX</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Wallets Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Wallets ({filteredWallets.length} of {totalWallets})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>User Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWallets.map((wallet) => (
                <TableRow key={wallet.id}>
                  <TableCell className="font-medium">
                    {wallet.user.full_name}
                  </TableCell>
                  <TableCell>{wallet.user.email}</TableCell>
                  <TableCell>{wallet.user.phone}</TableCell>
                  <TableCell>{wallet.currency}</TableCell>
                  <TableCell className="font-mono">
                    {wallet.currency} {wallet.balance.toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(wallet.status)}</TableCell>
                  <TableCell>{getStatusBadge(wallet.user.status)}</TableCell>
                  <TableCell>
                    {new Date(wallet.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewWallet(wallet)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Wallet Actions Modal */}
      <WalletActionsModal
        wallet={selectedWallet}
        isOpen={showActionsModal}
        onClose={() => {
          setShowActionsModal(false);
          setSelectedWallet(null);
        }}
        onUpdate={loadUserWallets}
      />
    </div>
  );
};

export default UserWalletsOverview;
