
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Clock, User, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface PoolAuditLogProps {
  shareId?: string;
  limit?: number;
}

interface AuditLogEntry {
  id: string;
  transaction_type: string;
  quantity: number;
  price_per_share: number;
  currency: string;
  status: string;
  user_id: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

const PoolAuditLog: React.FC<PoolAuditLogProps> = ({ shareId, limit = 10 }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shareId) {
      loadAuditLogs();
    }
  }, [shareId]);

  const loadAuditLogs = async () => {
    if (!shareId) return;
    
    try {
      console.log('Loading audit logs for share ID:', shareId);
      
      // First, get share transactions
      const { data: transactions, error: txError } = await supabase
        .from('share_transactions')
        .select('*')
        .eq('share_id', shareId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (txError) {
        console.error('Error loading transactions:', txError);
        setAuditLogs([]);
        return;
      }

      console.log('Fetched transactions:', transactions);

      if (!transactions || transactions.length === 0) {
        setAuditLogs([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(transactions.map(tx => tx.user_id))];
      
      // Fetch user profiles separately
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profileError) {
        console.error('Error loading profiles:', profileError);
      }

      // Combine transaction data with user data
      const enrichedLogs: AuditLogEntry[] = transactions.map(tx => ({
        ...tx,
        user_name: profiles?.find(p => p.id === tx.user_id)?.full_name || 'Unknown User',
        user_email: profiles?.find(p => p.id === tx.user_id)?.email || ''
      }));

      console.log('Enriched audit logs:', enrichedLogs);
      setAuditLogs(enrichedLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'purchase': return '🛒';
      case 'sale': return '💰';
      case 'transfer': return '↔️';
      case 'issue': return '🎁';
      case 'buyback': return '🔄';
      default: return '📝';
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      purchase: 'default',
      sale: 'secondary',
      transfer: 'outline',
      issue: 'default',
      buyback: 'destructive'
    };
    return variants[type] || 'outline';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Pool Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading audit logs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Pool Activity
          {auditLogs.length > 0 && (
            <Badge variant="secondary">{auditLogs.length} entries</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No recent activity found</p>
            <p className="text-sm text-gray-400 mt-2">
              Transaction logs will appear here when activities occur on this share pool.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getTransactionTypeIcon(log.transaction_type)}</span>
                      <Badge variant={getTransactionTypeBadge(log.transaction_type)}>
                        {log.transaction_type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{log.user_name}</div>
                        {log.user_email && (
                          <div className="text-xs text-gray-500">{log.user_email}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{log.quantity.toLocaleString()}</TableCell>
                  <TableCell>{log.currency} {log.price_per_share.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'completed' ? 'default' : 'secondary'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PoolAuditLog;
