
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';

const ShareDividendManager: React.FC = () => {
  const [dividends, setDividends] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    per_share_amount: '',
    total_dividend: '',
    company_valuation: '',
    market_cap: '',
    description: '',
    payment_type: 'cash',
    cut_off_date: '',
    payment_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total_shareholders: 0,
    total_shares_outstanding: 0,
    projected_total_payment: 0
  });

  useEffect(() => {
    loadDividends();
    loadStats();
  }, []);

  const loadDividends = async () => {
    try {
      const { data, error } = await supabase
        .from('dividend_declarations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDividends(data || []);
    } catch (error) {
      console.error('Error loading dividends:', error);
      toast.error('Failed to load dividend declarations');
    }
  };

  const loadStats = async () => {
    try {
      // Get total shareholders
      const { data: shareholdersData, error: shareholdersError } = await supabase
        .from('user_shares')
        .select('user_id')
        .not('quantity', 'eq', 0);

      if (shareholdersError) throw shareholdersError;

      const uniqueShareholders = new Set(shareholdersData?.map(s => s.user_id) || []).size;

      // Get total shares outstanding
      const { data: sharesData, error: sharesError } = await supabase
        .from('shares')
        .select('total_shares, available_shares')
        .single();

      if (sharesError) throw sharesError;

      const outstandingShares = (sharesData?.total_shares || 0) - (sharesData?.available_shares || 0);

      setStats({
        total_shareholders: uniqueShareholders,
        total_shares_outstanding: outstandingShares,
        projected_total_payment: parseFloat(formData.per_share_amount) * outstandingShares || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    if (formData.per_share_amount && formData.company_valuation) {
      const projectedTotal = parseFloat(formData.per_share_amount) * stats.total_shares_outstanding;
      // Auto-calculate market cap: outstanding shares × current price
      const autoMarketCap = stats.total_shares_outstanding * 50000; // Use current share price
      
      setStats(prev => ({ ...prev, projected_total_payment: projectedTotal }));
      setFormData(prev => ({ 
        ...prev, 
        total_dividend: projectedTotal.toString(),
        market_cap: autoMarketCap.toString()
      }));
    }
  }, [formData.per_share_amount, formData.company_valuation, stats.total_shares_outstanding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('dividend_declarations')
        .insert({
          per_share_amount: parseFloat(formData.per_share_amount),
          total_dividend: parseFloat(formData.total_dividend),
          company_valuation: parseFloat(formData.company_valuation),
          market_cap: parseFloat(formData.market_cap),
          description: formData.description,
          payment_type: formData.payment_type,
          cut_off_date: formData.cut_off_date || null,
          payment_date: formData.payment_date || null,
          eligible_shareholders_count: stats.total_shareholders,
          total_eligible_shares: stats.total_shares_outstanding,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast.success('Dividend declaration created successfully');
      setFormData({
        per_share_amount: '',
        total_dividend: '',
        company_valuation: '',
        market_cap: '',
        description: '',
        payment_type: 'cash',
        cut_off_date: '',
        payment_date: ''
      });
      loadDividends();
    } catch (error: any) {
      console.error('Error creating dividend:', error);
      toast.error(`Failed to create dividend declaration: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'paid':
        return <Badge variant="secondary">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.total_shareholders}</p>
                <p className="text-xs text-muted-foreground">Total Shareholders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{stats.total_shares_outstanding.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Shares Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">UGX {stats.projected_total_payment.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Projected Total Payment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{dividends.length}</p>
                <p className="text-xs text-muted-foreground">Total Declarations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dividend Declaration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Create Dividend Declaration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Amount per Share (UGX)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount per share"
                  value={formData.per_share_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, per_share_amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Total Dividend Amount (UGX)</Label>
                <Input
                  type="number"
                  placeholder="Auto-calculated"
                  value={formData.total_dividend}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Company Valuation (UGX)</Label>
                <Input
                  type="number"
                  placeholder="Enter company valuation"
                  value={formData.company_valuation}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_valuation: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Market Cap (UGX)</Label>
                <Input
                  type="number"
                  placeholder="Auto-calculated from outstanding shares"
                  value={formData.market_cap}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-calculated: {stats.total_shares_outstanding.toLocaleString()} shares × current price
                </p>
              </div>
            </div>

            <div>
              <Label>Payment Type</Label>
              <Select 
                value={formData.payment_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash Dividend</SelectItem>
                  <SelectItem value="stock">Stock Dividend</SelectItem>
                  <SelectItem value="mixed">Mixed (Cash + Stock)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cut-off Date</Label>
                <Input
                  type="date"
                  value={formData.cut_off_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, cut_off_date: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shareholders eligible as of this date
                </p>
              </div>
              <div>
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Expected dividend payment date
                </p>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Enter dividend description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Dividend Declaration'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dividend Declarations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dividend Declarations History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Per Share</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dividends.map((dividend) => (
                <TableRow key={dividend.id}>
                  <TableCell>
                    {new Date(dividend.declaration_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>UGX {dividend.per_share_amount.toLocaleString()}</TableCell>
                  <TableCell>UGX {dividend.total_dividend.toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{dividend.payment_type}</TableCell>
                  <TableCell>{getStatusBadge(dividend.status)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {dividends.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No dividend declarations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareDividendManager;
