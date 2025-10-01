
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { DividendDeclaration, DividendPaymentType, DividendStatus } from '@/types/custom';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface DividendHistoryProps {
  userId?: string | null;
}

const DividendHistory: React.FC<DividendHistoryProps> = ({ userId }) => {
  const [dividends, setDividends] = useState<DividendDeclaration[]>([]);
  const [userPayments, setUserPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDividendData();
  }, [userId]);

  const loadDividendData = async () => {
    try {
      // Load dividend declarations
      const { data: dividendData, error: dividendError } = await supabase
        .from('dividend_declarations')
        .select('*')
        .order('declaration_date', { ascending: false });

      if (dividendError) throw dividendError;
      
      // Type assertion with proper casting
      const typedDividends = (dividendData || []).map(item => ({
        ...item,
        payment_type: item.payment_type as DividendPaymentType,
        status: item.status as DividendStatus
      }));
      
      setDividends(typedDividends);

      // Load user's dividend payments if userId provided
      if (userId) {
        const { data: paymentData, error: paymentError } = await supabase
          .from('dividend_payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!paymentError) {
          setUserPayments(paymentData || []);
        }
      }
    } catch (error) {
      console.error('Error loading dividend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'paid': return 'bg-blue-500';
      default: return 'bg-yellow-500';
    }
  };

  const getPaymentTypeIcon = (paymentType: string) => {
    switch (paymentType) {
      case 'cash': return <DollarSign className="h-4 w-4" />;
      case 'shares': return <TrendingUp className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading dividend history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="mr-2 h-5 w-5" />
          Dividend History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dividends.length > 0 ? (
          <div className="space-y-4">
            {dividends.map((dividend) => (
              <Card key={dividend.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getPaymentTypeIcon(dividend.payment_type)}
                      <span className="font-medium">
                        UGX {dividend.per_share_amount.toLocaleString()} per share
                      </span>
                      <Badge className={getStatusColor(dividend.status)}>
                        {dividend.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(dividend.declaration_date).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Total Dividend Pool: UGX {dividend.total_dividend.toLocaleString()}</div>
                    <div>Payment Type: {dividend.payment_type}</div>
                    {dividend.cut_off_date && (
                      <div>Cut-off Date: {new Date(dividend.cut_off_date).toLocaleDateString()}</div>
                    )}
                    {dividend.payment_date && (
                      <div>Payment Date: {new Date(dividend.payment_date).toLocaleDateString()}</div>
                    )}
                    {dividend.description && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        {dividend.description}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Dividends Yet</h3>
            <p className="text-muted-foreground">
              Dividend declarations will appear here when announced by the company.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DividendHistory;
