import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Clock, Users, DollarSign, FileText, Download, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ConsentStatusSummary {
  total_members: number;
  accepted_consents: number;
  rejected_consents: number;
  pending_consents: number;
  total_debt_settled: number;
  total_shares_allocated: number;
  average_cost_per_share: number;
}

interface ConsentRecord {
  id: string;
  member_name: string;
  email: string;
  allocated_shares: number;
  debt_amount_settled: number;
  total_cost: number;
  cost_per_share: number;
  transfer_fee_paid: number;
  allocation_status: string;
  consent_signed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const ConsentStatusReport: React.FC = () => {
  const [summary, setSummary] = useState<ConsentStatusSummary | null>(null);
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadConsentData();
  }, []);

  const loadConsentData = async () => {
    try {
      // Fetch all consent records
      const { data: allocationData, error } = await supabase
        .from('club_share_allocations')
        .select(`
          id,
          allocated_shares,
          debt_amount_settled,
          total_cost,
          cost_per_share,
          transfer_fee_paid,
          allocation_status,
          consent_signed_at,
          rejection_reason,
          created_at,
          investment_club_members (
            member_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data
      const processedRecords: ConsentRecord[] = allocationData.map((item: any) => ({
        id: item.id,
        member_name: item.investment_club_members?.member_name || 'Unknown',
        email: item.investment_club_members?.email || '',
        allocated_shares: item.allocated_shares || 0,
        debt_amount_settled: item.debt_amount_settled || 0,
        total_cost: item.total_cost || 0,
        cost_per_share: item.cost_per_share || 0,
        transfer_fee_paid: item.transfer_fee_paid || 0,
        allocation_status: item.allocation_status || 'pending',
        consent_signed_at: item.consent_signed_at,
        rejection_reason: item.rejection_reason,
        created_at: item.created_at
      }));

      setRecords(processedRecords);

      // Calculate summary
      const totalMembers = processedRecords.length;
      const acceptedConsents = processedRecords.filter(r => r.allocation_status === 'accepted').length;
      const rejectedConsents = processedRecords.filter(r => r.allocation_status === 'rejected').length;
      const pendingConsents = processedRecords.filter(r => r.allocation_status === 'pending').length;
      
      const totalDebtSettled = processedRecords
        .filter(r => r.allocation_status === 'accepted')
        .reduce((sum, r) => sum + r.debt_amount_settled, 0);
      
      const totalSharesAllocated = processedRecords
        .filter(r => r.allocation_status === 'accepted')
        .reduce((sum, r) => sum + r.allocated_shares, 0);
      
      const averageCostPerShare = acceptedConsents > 0 
        ? processedRecords
            .filter(r => r.allocation_status === 'accepted')
            .reduce((sum, r) => sum + r.cost_per_share, 0) / acceptedConsents
        : 0;

      setSummary({
        total_members: totalMembers,
        accepted_consents: acceptedConsents,
        rejected_consents: rejectedConsents,
        pending_consents: pendingConsents,
        total_debt_settled: totalDebtSettled,
        total_shares_allocated: totalSharesAllocated,
        average_cost_per_share: averageCostPerShare
      });

    } catch (error) {
      console.error('Error loading consent data:', error);
      toast.error('Failed to load consent status report');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const filteredRecords = getFilteredRecords();
    
    const headers = [
      'Member Name', 'Email', 'Allocation Status', 'Allocated Shares', 
      'Debt Settled', 'Total Cost', 'Cost Per Share', 'Transfer Fee',
      'Consent Date', 'Rejection Reason', 'Created Date'
    ];

    const csvData = filteredRecords.map(record => [
      record.member_name,
      record.email,
      record.allocation_status,
      record.allocated_shares,
      record.debt_amount_settled,
      record.total_cost,
      record.cost_per_share,
      record.transfer_fee_paid,
      record.consent_signed_at ? new Date(record.consent_signed_at).toLocaleDateString() : '',
      record.rejection_reason || '',
      new Date(record.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consent_status_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFilteredRecords = () => {
    return records.filter(record => {
      const matchesSearch = record.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || record.allocation_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG');
  };

  const filteredRecords = getFilteredRecords();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{summary.total_members}</p>
                  <p className="text-xs text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{summary.accepted_consents}</p>
                  <p className="text-xs text-muted-foreground">Consents Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_debt_settled).replace('UGX ', '')}</p>
                  <p className="text-xs text-muted-foreground">Total Debt Settled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{summary.total_shares_allocated.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Shares Allocated</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Consent Status Report
          </CardTitle>
          <CardDescription>
            Track and manage member consent status for debt-to-share conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search Members</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="sm:w-48">
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={exportReport} variant="outline" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Results Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Debt Settled</TableHead>
                  <TableHead>Cost/Share</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Consent Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No records found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.member_name}</div>
                          <div className="text-xs text-muted-foreground">{record.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.allocation_status)}</TableCell>
                      <TableCell>{record.allocated_shares.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(record.debt_amount_settled)}</TableCell>
                      <TableCell>{formatCurrency(record.cost_per_share)}</TableCell>
                      <TableCell>{formatCurrency(record.total_cost)}</TableCell>
                      <TableCell>
                        {record.consent_signed_at ? formatDate(record.consent_signed_at) : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {record.rejection_reason ? (
                          <div className="text-xs text-red-600 truncate" title={record.rejection_reason}>
                            {record.rejection_reason}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredRecords.length} of {records.length} records
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsentStatusReport;