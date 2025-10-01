import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRightLeft, Clock, CheckCircle, XCircle, User, Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
interface TransferHistoryDashboardProps {
  userId: string;
}
const TransferHistoryDashboard: React.FC<TransferHistoryDashboardProps> = ({
  userId
}) => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  useEffect(() => {
    loadTransferHistory();
  }, [userId, filter]);
  const loadTransferHistory = async () => {
    try {
      setLoading(true);

      // Check if table exists and has the required columns
      const {
        data: tableCheck
      } = await supabase.from('share_transfer_requests').select('id').limit(1);
      if (!tableCheck) {
        console.log('Share transfer requests table not properly configured');
        setTransfers([]);
        return;
      }

      // Try with sender_id/receiver_id first, then fallback to from_user_id/to_user_id
      let query = supabase.from('share_transfer_requests').select('*').order('created_at', {
        ascending: false
      }).limit(20);
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      // Try different column name combinations
      try {
        const {
          data,
          error
        } = await query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
        if (error && error.message.includes('sender_id')) {
          // Try with from_user_id/to_user_id
          const {
            data: fallbackData,
            error: fallbackError
          } = await supabase.from('share_transfer_requests').select('*').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`).order('created_at', {
            ascending: false
          }).limit(20);
          if (fallbackError) throw fallbackError;
          setTransfers(fallbackData || []);
        } else {
          if (error) throw error;
          setTransfers(data || []);
        }
      } catch (queryError) {
        console.log('Transfer history query failed, using empty data:', queryError);
        setTransfers([]);
      }
    } catch (error) {
      console.error('Error loading transfer history:', error);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Approved</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'approved':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  const isOutgoing = (transfer: any) => transfer.from_user_id === userId;
  const filters = [{
    key: 'all',
    label: 'All'
  }, {
    key: 'pending',
    label: 'Pending'
  }, {
    key: 'completed',
    label: 'Completed'
  }, {
    key: 'rejected',
    label: 'Rejected'
  }];
  if (loading) {
    return <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading transfer history...</div>
        </CardContent>
      </Card>;
  }
  return;
};
export default TransferHistoryDashboard;