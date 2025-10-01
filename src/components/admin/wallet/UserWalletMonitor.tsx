
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExtendedWallet } from '@/types/custom';

const UserWalletMonitor = () => {
  const [wallets, setWallets] = useState<ExtendedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUserWallets();
  }, []);

  const loadUserWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      // Get user profiles for each wallet
      const walletsWithUsers = await Promise.all(
        (data || []).map(async (wallet) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', wallet.user_id)
            .single();

          return {
            ...wallet,
            user_name: profile?.full_name || 'Unknown',
            user_email: profile?.email || 'Unknown'
          };
        })
      );

      setWallets(walletsWithUsers);
    } catch (error) {
      console.error('Error loading user wallets:', error);
      toast.error('Failed to load user wallets');
    } finally {
      setLoading(false);
    }
  };

  const filteredWallets = wallets.filter(wallet => 
    wallet.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wallet.currency.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-500',
      suspended: 'bg-yellow-500',
      blocked: 'bg-red-500'
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="animate-pulse">Loading user wallets...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Wallet Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search by user name, email, or currency..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button onClick={loadUserWallets}>
              Refresh
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWallets.map((wallet) => (
                <TableRow key={wallet.id}>
                  <TableCell className="font-medium">
                    {wallet.user_name}
                  </TableCell>
                  <TableCell>{wallet.user_email}</TableCell>
                  <TableCell>{wallet.currency}</TableCell>
                  <TableCell>
                    {wallet.balance.toLocaleString()} {wallet.currency}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(wallet.status || 'active')}
                  </TableCell>
                  <TableCell>
                    {new Date(wallet.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredWallets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No wallets found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserWalletMonitor;
