
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, DollarSign } from 'lucide-react';

interface DividendDeclaration {
  id: string;
  declaration_date: string;
  per_share_amount: number;
  total_dividend: number;
  market_cap: number;
  company_valuation: number;
  payment_type: 'cash' | 'shares';
  status: 'pending' | 'approved' | 'paid';
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const DividendManager = () => {
  const [dividends, setDividends] = useState<DividendDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    per_share_amount: '',
    total_dividend: '',
    market_cap: '',
    company_valuation: '',
    payment_type: 'cash' as 'cash' | 'shares',
    description: ''
  });

  useEffect(() => {
    loadDividends();
  }, []);

  const loadDividends = async () => {
    try {
      const { data, error } = await supabase
        .from('dividend_declarations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type assertion since we know the data structure matches
      setDividends(data as DividendDeclaration[]);
    } catch (error) {
      console.error('Error loading dividends:', error);
      toast.error('Failed to load dividend declarations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('dividend_declarations')
        .insert({
          per_share_amount: parseFloat(formData.per_share_amount),
          total_dividend: parseFloat(formData.total_dividend),
          market_cap: parseFloat(formData.market_cap),
          company_valuation: parseFloat(formData.company_valuation),
          payment_type: formData.payment_type,
          description: formData.description || null,
          created_by: user.id,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Dividend declaration created successfully');
      setShowForm(false);
      setFormData({
        per_share_amount: '',
        total_dividend: '',
        market_cap: '',
        company_valuation: '',
        payment_type: 'cash',
        description: ''
      });
      loadDividends();
    } catch (error) {
      console.error('Error creating dividend:', error);
      toast.error('Failed to create dividend declaration');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500',
      approved: 'bg-blue-500',
      paid: 'bg-green-500'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return <div className="animate-pulse">Loading dividends...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Dividend Management
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              New Declaration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Per Share Amount (UGX)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.per_share_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, per_share_amount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Total Dividend (UGX)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.total_dividend}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_dividend: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Market Cap (UGX)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.market_cap}
                    onChange={(e) => setFormData(prev => ({ ...prev, market_cap: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Company Valuation (UGX)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.company_valuation}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_valuation: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Payment Type</Label>
                  <Select value={formData.payment_type} onValueChange={(value: 'cash' | 'shares') => setFormData(prev => ({ ...prev, payment_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="shares">Shares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this dividend declaration"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Declaration</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {dividends.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No dividend declarations found. Create your first dividend declaration.
              </p>
            ) : (
              dividends.map((dividend) => (
                <div key={dividend.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium">
                        Dividend Declaration - {new Date(dividend.declaration_date).toLocaleDateString()}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {dividend.description || 'No description provided'}
                      </p>
                    </div>
                    {getStatusBadge(dividend.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Per Share:</span>
                      <p>UGX {dividend.per_share_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Total Dividend:</span>
                      <p>UGX {dividend.total_dividend.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Market Cap:</span>
                      <p>UGX {dividend.market_cap.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Payment Type:</span>
                      <p className="capitalize">{dividend.payment_type}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DividendManager;
