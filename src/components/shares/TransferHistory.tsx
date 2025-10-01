import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useShareTransfer } from '@/hooks/useShareTransfer';
import { formatDistanceToNow } from 'date-fns';

interface TransferHistoryProps {
  userId: string;
}

const TransferHistory: React.FC<TransferHistoryProps> = ({ userId }) => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  const { getTransferHistory } = useShareTransfer();

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await getTransferHistory(userId);
      setTransfers(history);
    } catch (error) {
      console.error('Error loading transfer history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'completed':
        return 'success';
      case 'rejected':
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const filteredTransfers = transfers.filter(transfer => {
    if (filter === 'sent') return transfer.sender_id === userId;
    if (filter === 'received') return transfer.recipient_id === userId;
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading transfer history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transfer History</CardTitle>
            <CardDescription>
              View your share transfer history - both sent and received
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all">All Transfers</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-4">
            {filteredTransfers.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-2">
                  {filter === 'sent' ? 'No shares sent yet' : 
                   filter === 'received' ? 'No shares received yet' : 
                   'No transfer history yet'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {filter === 'sent' ? 'Transfers you send will appear here' :
                   filter === 'received' ? 'Shares received from others will appear here' :
                   'Your transfer activity will appear here'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransfers.map((transfer) => {
                  const isSent = transfer.sender_id === userId;
                  const otherParty = isSent ? transfer.recipient : transfer.sender;
                  
                  return (
                    <div
                      key={transfer.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isSent ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {isSent ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {isSent ? 'Sent to' : 'Received from'} {otherParty?.full_name}
                            </span>
                            <Badge variant={getStatusColor(transfer.status) as any}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(transfer.status)}
                                {transfer.status}
                              </span>
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            {transfer.quantity.toLocaleString()} shares of {transfer.share?.name}
                            {transfer.reason && (
                              <span className="ml-2">• {transfer.reason}</span>
                            )}
                          </div>
                          
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(transfer.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">
                          UGX {transfer.transfer_value?.toLocaleString() || 'N/A'}
                        </div>
                        {transfer.transfer_fee > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Fee: UGX {transfer.transfer_fee.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TransferHistory;