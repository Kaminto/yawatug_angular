import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, BarChart3, DollarSign, Users, TrendingUp } from 'lucide-react';
import { DateRange } from 'react-day-picker';

const AdminReportsManager: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reportType, setReportType] = useState('share_transactions');
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { value: 'share_transactions', label: 'Share Transactions' },
    { value: 'dividend_payments', label: 'Dividend Payments' },
    { value: 'user_activity', label: 'User Activity' },
    { value: 'financial_summary', label: 'Financial Summary' },
    { value: 'market_activity', label: 'Market Activity' }
  ];

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [reportType, dateRange]);

  const generateReport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select a date range');
      return;
    }

    setLoading(true);
    try {
      switch (reportType) {
        case 'share_transactions':
          await generateShareTransactionsReport();
          break;
        case 'dividend_payments':
          await generateDividendPaymentsReport();
          break;
        case 'user_activity':
          await generateUserActivityReport();
          break;
        case 'financial_summary':
          await generateFinancialSummaryReport();
          break;
        case 'market_activity':
          await generateMarketActivityReport();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const generateShareTransactionsReport = async () => {
    const { data, error } = await supabase
      .from('share_transactions')
      .select(`
        *,
        profiles(full_name, email),
        shares(name)
      `)
      .gte('created_at', dateRange?.from?.toISOString())
      .lte('created_at', dateRange?.to?.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    setReportData(data || []);

    const totalTransactions = data?.length || 0;
    const totalVolume = data?.reduce((sum, t) => sum + (t.quantity || 0), 0) || 0;
    const totalValue = data?.reduce((sum, t) => sum + (t.price_per_share * t.quantity || 0), 0) || 0;

    setSummary({
      totalTransactions,
      totalVolume,
      totalValue,
      averageTransactionSize: totalTransactions > 0 ? totalValue / totalTransactions : 0
    });
  };

  const generateDividendPaymentsReport = async () => {
    const { data, error } = await supabase
      .from('dividend_payments')
      .select(`
        *,
        profiles(full_name, email),
        dividend_declarations(declaration_date, per_share_amount)
      `)
      .gte('created_at', dateRange?.from?.toISOString())
      .lte('created_at', dateRange?.to?.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    setReportData(data || []);

    const totalPayments = data?.length || 0;
    const totalAmount = data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    setSummary({
      totalPayments,
      totalAmount,
      averagePayment: totalPayments > 0 ? totalAmount / totalPayments : 0
    });
  };

  const generateUserActivityReport = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .gte('last_login', dateRange?.from?.toISOString())
      .lte('last_login', dateRange?.to?.toISOString())
      .order('last_login', { ascending: false });

    if (error) throw error;

    setReportData(data || []);

    setSummary({
      activeUsers: data?.length || 0,
      totalUsers: data?.length || 0
    });
  };

  const generateFinancialSummaryReport = async () => {
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', dateRange?.from?.toISOString())
      .lte('created_at', dateRange?.to?.toISOString());

    if (transError) throw transError;

    setReportData(transactions || []);

    const totalDeposits = transactions?.filter(t => t.transaction_type === 'deposit').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const totalWithdrawals = transactions?.filter(t => t.transaction_type === 'withdrawal').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    setSummary({
      totalDeposits,
      totalWithdrawals,
      netFlow: totalDeposits - totalWithdrawals
    });
  };

  const generateMarketActivityReport = async () => {
    const { data, error } = await supabase
      .from('market_activity_log')
      .select('*')
      .gte('activity_date', dateRange?.from?.toISOString().split('T')[0])
      .lte('activity_date', dateRange?.to?.toISOString().split('T')[0])
      .order('activity_date', { ascending: false });

    if (error) throw error;

    setReportData(data || []);

    const totalBuyVolume = data?.reduce((sum, m) => sum + (m.buy_volume || 0), 0) || 0;
    const totalSellVolume = data?.reduce((sum, m) => sum + (m.sell_volume || 0), 0) || 0;

    setSummary({
      totalBuyVolume,
      totalSellVolume,
      averageBuyVolume: data?.length ? totalBuyVolume / data.length : 0
    });
  };

  const exportReport = () => {
    if (reportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map(row => 
      Object.values(row).map(value => 
        typeof value === 'object' ? JSON.stringify(value) : String(value || '')
      ).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Generate Admin Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={generateReport} disabled={loading} className="flex-1">
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button variant="outline" onClick={exportReport} disabled={reportData.length === 0}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(summary).map(([key, value]) => (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="ml-2">
                    <p className="text-2xl font-bold">
                      {typeof value === 'number' && key.toLowerCase().includes('amount') 
                        ? `UGX ${value.toLocaleString()}` 
                        : typeof value === 'number' 
                        ? value.toLocaleString() 
                        : String(value || '')}
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

      {/* Report Data Table */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(reportData[0]).slice(0, 6).map(key => (
                    <TableHead key={key} className="capitalize">
                      {key.replace(/_/g, ' ')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.slice(0, 20).map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).slice(0, 6).map((value: any, cellIndex) => (
                      <TableCell key={cellIndex}>
                        {typeof value === 'object' && value !== null 
                          ? JSON.stringify(value).substring(0, 50) + '...'
                          : typeof value === 'number' && value > 1000000
                          ? value.toLocaleString()
                          : String(value || 'N/A')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {reportData.length > 20 && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing first 20 of {reportData.length} records. Export for full data.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminReportsManager;
