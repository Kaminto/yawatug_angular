
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calculator, Plus, TrendingUp } from 'lucide-react';
import { ShareData } from '@/types/custom';

interface EnhancedDividendManagerProps {
  shareData: ShareData;
  onUpdate: () => Promise<void>;
}

const EnhancedDividendManager: React.FC<EnhancedDividendManagerProps> = ({ shareData, onUpdate }) => {
  const [dividendDeclarations, setDividendDeclarations] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    per_share_amount: '',
    total_dividend: '',
    payment_type: 'cash',
    description: '',
    company_valuation: '',
    market_cap: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDividendDeclarations();
  }, []);

  const loadDividendDeclarations = async () => {
    try {
      const { data, error } = await supabase
        .from('dividend_declarations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDividendDeclarations(data || []);
    } catch (error) {
      console.error('Error loading dividend declarations:', error);
    }
  };

  const calculateDividend = () => {
    const perShareAmount = parseFloat(formData.per_share_amount);
    if (perShareAmount > 0 && shareData.total_shares) {
      const totalDividend = perShareAmount * shareData.total_shares;
      setFormData(prev => ({ ...prev, total_dividend: totalDividend.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.per_share_amount || !formData.total_dividend) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const dividendData = {
        per_share_amount: parseFloat(formData.per_share_amount),
        total_dividend: parseFloat(formData.total_dividend),
        payment_type: formData.payment_type,
        description: formData.description,
        company_valuation: formData.company_valuation ? parseFloat(formData.company_valuation) : null,
        market_cap: formData.market_cap ? parseFloat(formData.market_cap) : null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        status: 'pending'
      };

      const { error } = await supabase
        .from('dividend_declarations')
        .insert(dividendData);

      if (error) throw error;

      toast.success('Dividend declaration created successfully');
      setFormData({
        per_share_amount: '',
        total_dividend: '',
        payment_type: 'cash',
        description: '',
        company_valuation: '',
        market_cap: ''
      });
      
      loadDividendDeclarations();
    } catch (error: any) {
      console.error('Error creating dividend declaration:', error);
      toast.error(error.message || 'Failed to create dividend declaration');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (declarationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('dividend_declarations')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', declarationId);

      if (error) throw error;
      toast.success(`Dividend declaration ${newStatus}`);
      loadDividendDeclarations();
    } catch (error: any) {
      console.error('Error updating dividend status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      pending: "outline",
      approved: "default",
      paid: "secondary",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Dividend Declaration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            Create Dividend Declaration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="per_share_amount">Per Share Amount ({shareData.currency}) *</Label>
                <Input
                  id="per_share_amount"
                  type="number"
                  step="0.01"
                  value={formData.per_share_amount}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, per_share_amount: e.target.value }));
                    setTimeout(calculateDividend, 100);
                  }}
                  placeholder="Amount per share"
                  required
                />
              </div>
              <div>
                <Label htmlFor="total_dividend">Total Dividend ({shareData.currency})</Label>
                <div className="flex">
                  <Input
                    id="total_dividend"
                    type="number"
                    value={formData.total_dividend}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_dividend: e.target.value }))}
                    placeholder="Total dividend amount"
                    readOnly
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={calculateDividend}
                    className="ml-2"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Payment Type</Label>
                <Select 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_type: value }))}
                  value={formData.payment_type}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bonus_shares">Bonus Shares</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="company_valuation">Company Valuation ({shareData.currency})</Label>
                <Input
                  id="company_valuation"
                  type="number"
                  value={formData.company_valuation}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_valuation: e.target.value }))}
                  placeholder="Current company valuation"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="market_cap">Market Cap ({shareData.currency})</Label>
              <Input
                id="market_cap"
                type="number"
                value={formData.market_cap}
                onChange={(e) => setFormData(prev => ({ ...prev, market_cap: e.target.value }))}
                placeholder="Market capitalization"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Dividend description or notes"
                rows={3}
              />
            </div>

            {formData.per_share_amount && (
              <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                <div className="flex items-center mb-2">
                  <TrendingUp className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-800 dark:text-green-200">Dividend Summary</span>
                </div>
                <div className="text-green-800 dark:text-green-200 space-y-1">
                  <p>Per Share: {shareData.currency} {parseFloat(formData.per_share_amount).toLocaleString()}</p>
                  <p>Total Shares: {shareData.total_shares.toLocaleString()}</p>
                  <p>Total Dividend: {shareData.currency} {parseFloat(formData.total_dividend || '0').toLocaleString()}</p>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Dividend Declaration'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dividend Declarations History */}
      <Card>
        <CardHeader>
          <CardTitle>Dividend Declarations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Per Share</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dividendDeclarations.map((declaration) => (
                <TableRow key={declaration.id}>
                  <TableCell>{new Date(declaration.declaration_date).toLocaleDateString()}</TableCell>
                  <TableCell>{shareData.currency} {declaration.per_share_amount.toLocaleString()}</TableCell>
                  <TableCell>{shareData.currency} {declaration.total_dividend.toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{declaration.payment_type.replace('_', ' ')}</TableCell>
                  <TableCell>{getStatusBadge(declaration.status)}</TableCell>
                  <TableCell>
                    {declaration.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleStatusUpdate(declaration.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleStatusUpdate(declaration.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    {declaration.status === 'approved' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStatusUpdate(declaration.id, 'paid')}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {dividendDeclarations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No dividend declarations found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedDividendManager;
