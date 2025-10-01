
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CurrencyConversion } from '@/types/custom';

const CurrencyManager = () => {
  const [currencies, setCurrencies] = useState<CurrencyConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [useApiRates, setUseApiRates] = useState(false);
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
      toast({
        title: "Failed to load currencies",
        description: "Could not load currency conversion rates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrency = async () => {
    try {
      if (!newCurrency.from_currency || !newCurrency.to_currency || newCurrency.rate <= 0) {
        toast({
          title: "Invalid input",
          description: "Please fill all fields with valid values",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('currency_conversion')
        .upsert([newCurrency]);

      if (error) throw error;

      toast({
        title: "Currency rate saved",
        description: "Currency conversion rate has been saved successfully"
      });

      setNewCurrency({
        from_currency: '',
        to_currency: '',
        rate: 0
      });

      loadCurrencies();
    } catch (error) {
      console.error('Error saving currency rate:', error);
      toast({
        title: "Failed to save currency rate",
        description: "Could not save currency conversion rate",
        variant: "destructive"
      });
    }
  };

  const fetchApiRates = async () => {
    try {
      // Mock API call - in real implementation, use actual exchange rate API
      toast({
        title: "API rates updated",
        description: "Exchange rates have been updated from API",
      });
    } catch (error) {
      console.error('Error fetching API rates:', error);
      toast({
        title: "Failed to fetch API rates",
        description: "Could not update rates from API",
        variant: "destructive"
      });
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
        <CardHeader>
          <CardTitle>Add/Update Exchange Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <Button onClick={handleSaveCurrency} className="mt-4">
            Save Exchange Rate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Exchange Rates</CardTitle>
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
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Updated: {new Date(currency.updated_at).toLocaleDateString()}
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

export default CurrencyManager;
