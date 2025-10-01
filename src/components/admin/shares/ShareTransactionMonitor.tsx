
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ShareTransactionMonitorProps {
  shareData: any;
}

const ShareTransactionMonitor: React.FC<ShareTransactionMonitorProps> = ({ shareData }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transferRequests, setTransferRequests] = useState<any[]>([]);
  const [userShares, setUserShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load share transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('share_transactions')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .eq('share_id', shareData.id)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (transactionError) throw transactionError;
      setTransactions(transactionData || []);
      
      // Load transfer requests
      const { data: transferData, error: transferError } = await supabase
        .from('share_transfer_requests')
        .select(`
          *,
          sender:sender_id (full_name, email),
          recipient:recipient_id (full_name, email)
        `)
        .eq('share_id', shareData.id)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (transferError) throw transferError;
      setTransferRequests(transferData || []);
      
      // Load user shares summary
      const { data: sharesData, error: sharesError } = await supabase
        .from('user_shares')
        .select(`
          *,
          profiles:user_id (full_name, email, phone)
        `)
        .eq('share_id', shareData.id)
        .order('quantity', { ascending: false })
        .limit(20);
        
      if (sharesError) throw sharesError;
      setUserShares(sharesData || []);
      
    } catch (error: any) {
      console.error('Error loading transaction data:', error);
      toast({
        title: "Failed to load data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-green-100 text-green-800';
      case 'sale': return 'bg-red-100 text-red-800';
      case 'transfer': return 'bg-blue-100 text-blue-800';
      case 'buyback': return 'bg-purple-100 text-purple-800';
      case 'dividend': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
      transaction.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || transaction.transaction_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Holdings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Top Shareholders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Shares Owned</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Current Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userShares.map((userShare) => (
                <TableRow key={userShare.id}>
                  <TableCell>{userShare.profiles?.full_name || 'Unknown'}</TableCell>
                  <TableCell>{userShare.profiles?.email || 'N/A'}</TableCell>
                  <TableCell>{userShare.quantity.toLocaleString()}</TableCell>
                  <TableCell>
                    {shareData.currency} {userShare.purchase_price_per_share.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {shareData.currency} {(userShare.quantity * shareData.price_per_share).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {userShares.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No shareholders found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="buyback">Buyback</SelectItem>
                <SelectItem value="dividend">Dividend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{transaction.profiles?.full_name || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                      {transaction.transaction_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.quantity.toLocaleString()}</TableCell>
                  <TableCell>
                    {transaction.currency} {transaction.price_per_share.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {transaction.currency} {(transaction.quantity * transaction.price_per_share).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No transactions found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transfer Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Share Transfer Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transferRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    {format(new Date(request.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{request.sender?.full_name || 'Unknown'}</TableCell>
                  <TableCell>{request.recipient?.full_name || 'Unknown'}</TableCell>
                  <TableCell>{request.quantity.toLocaleString()}</TableCell>
                  <TableCell>
                    {shareData.currency} {(request.transfer_fee || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.reason || 'N/A'}</TableCell>
                </TableRow>
              ))}
              {transferRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No transfer requests found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareTransactionMonitor;
