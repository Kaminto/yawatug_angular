
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Edit, Trash2, Plus } from 'lucide-react';

interface CurrencyConversion {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

const EditableCurrencyManager = () => {
  const [currencies, setCurrencies] = useState<CurrencyConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [useApiRates, setUseApiRates] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<CurrencyConversion | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCurrency, setNewCurrency] = useState({
    from_currency: '',
    to_currency: '',
    rate: 0
  });

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      const { data, error } = await supabase
        .from('currency_conversion')
        .select('*')
        .order('from_currency');
        
      if (error) throw error;
      setCurrencies(data || []);
    } catch (error) {
      console.error('Error loading currencies:', error);
      toast.error('Failed to load currencies');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrency = async () => {
    try {
      if (!newCurrency.from_currency || !newCurrency.to_currency || newCurrency.rate <= 0) {
        toast.error('Please fill all fields with valid values');
        return;
      }

      const { error } = await supabase
        .from('currency_conversion')
        .insert([newCurrency]);

      if (error) throw error;

      toast.success('Currency rate added successfully');
      setNewCurrency({ from_currency: '', to_currency: '', rate: 0 });
      setShowAddDialog(false);
      loadCurrencies();
    } catch (error) {
      console.error('Error saving currency rate:', error);
      toast.error('Failed to save currency rate');
    }
  };

  const handleUpdateCurrency = async () => {
    if (!editingCurrency) return;

    try {
      const { error } = await supabase
        .from('currency_conversion')
        .update({
          rate: editingCurrency.rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCurrency.id);

      if (error) throw error;

      toast.success('Currency rate updated successfully');
      setEditingCurrency(null);
      loadCurrencies();
    } catch (error) {
      console.error('Error updating currency rate:', error);
      toast.error('Failed to update currency rate');
    }
  };

  const handleDeleteCurrency = async (id: string) => {
    try {
      const { error } = await supabase
        .from('currency_conversion')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Currency rate deleted successfully');
      loadCurrencies();
    } catch (error) {
      console.error('Error deleting currency rate:', error);
      toast.error('Failed to delete currency rate');
    }
  };

  const fetchApiRates = async () => {
    try {
      // Mock API call - in real implementation, use actual exchange rate API
      toast.success('API rates updated');
    } catch (error) {
      console.error('Error fetching API rates:', error);
      toast.error('Failed to fetch API rates');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading currency settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={useApiRates}
                onCheckedChange={setUseApiRates}
              />
              <Label>Use API for exchange rates</Label>
            </div>
            
            {useApiRates && (
              <Button onClick={fetchApiRates} variant="outline">
                Update Rates from API
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exchange Rates</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rate
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currencies.length === 0 ? (
              <p className="text-center text-muted-foreground">No exchange rates configured</p>
            ) : (
              currencies.map((currency) => (
                <div key={currency.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <span className="font-medium">
                      1 {currency.from_currency} = {currency.rate} {currency.to_currency}
                    </span>
                    <div className="text-sm text-muted-foreground">
                      Updated: {new Date(currency.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCurrency(currency)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCurrency(currency.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Currency Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exchange Rate</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>From Currency</Label>
              <Input
                value={newCurrency.from_currency}
                onChange={(e) => setNewCurrency({...newCurrency, from_currency: e.target.value.toUpperCase()})}
                placeholder="USD"
                maxLength={3}
              />
            </div>
            <div>
              <Label>To Currency</Label>
              <Input
                value={newCurrency.to_currency}
                onChange={(e) => setNewCurrency({...newCurrency, to_currency: e.target.value.toUpperCase()})}
                placeholder="UGX"
                maxLength={3}
              />
            </div>
            <div>
              <Label>Exchange Rate</Label>
              <Input
                type="number"
                step="0.0001"
                value={newCurrency.rate}
                onChange={(e) => setNewCurrency({...newCurrency, rate: Number(e.target.value)})}
                placeholder="0.0000"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCurrency}>
              Add Rate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Currency Dialog */}
      <Dialog open={!!editingCurrency} onOpenChange={() => setEditingCurrency(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exchange Rate</DialogTitle>
          </DialogHeader>
          {editingCurrency && (
            <div className="space-y-4">
              <div>
                <Label>Currency Pair</Label>
                <Input
                  value={`${editingCurrency.from_currency} → ${editingCurrency.to_currency}`}
                  disabled
                />
              </div>
              <div>
                <Label>Exchange Rate</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={editingCurrency.rate}
                  onChange={(e) => setEditingCurrency({
                    ...editingCurrency,
                    rate: Number(e.target.value)
                  })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingCurrency(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCurrency}>
                  Update Rate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditableCurrencyManager;
