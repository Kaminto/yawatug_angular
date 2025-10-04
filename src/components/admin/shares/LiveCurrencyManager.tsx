
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  spread_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CurrencyPair {
  from: string;
  to: string;
  rate: number;
  spread: number;
  lastUpdated: string;
  isActive: boolean;
  change24h?: number;
}

const LiveCurrencyManager: React.FC = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newRate, setNewRate] = useState({ from: 'USD', to: 'UGX', rate: 0, spread: 0 });
  const [autoRefresh, setAutoRefresh] = useState(false);

  const majorCurrencies = ['USD', 'UGX', 'EUR', 'GBP', 'KES', 'TZS'];

  useEffect(() => {
    loadExchangeRates();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadExchangeRates, 300000); // 5 minutes
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadExchangeRates = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading exchange rates:', error);
        toast.error('Failed to load exchange rates');
        return;
      }

      setExchangeRates(data || []);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      toast.error('Failed to load exchange rates');
    } finally {
      setLoading(false);
    }
  };

  const updateExchangeRate = async (rateId: string, newRateValue: number, spread: number) => {
    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from('exchange_rates')
        .update({
          rate: newRateValue,
          spread_percentage: spread,
          updated_at: new Date().toISOString()
        })
        .eq('id', rateId);

      if (error) {
        console.error('Error updating exchange rate:', error);
        toast.error('Failed to update exchange rate');
        return;
      }

      toast.success('Exchange rate updated successfully');
      await loadExchangeRates();
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      toast.error('Failed to update exchange rate');
    } finally {
      setUpdating(false);
    }
  };

  const addNewRate = async () => {
    if (!newRate.from || !newRate.to || newRate.rate <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from('exchange_rates')
        .insert({
          from_currency: newRate.from,
          to_currency: newRate.to,
          rate: newRate.rate,
          spread_percentage: newRate.spread,
          is_active: true
        });

      if (error) {
        console.error('Error adding exchange rate:', error);
        toast.error('Failed to add exchange rate');
        return;
      }

      toast.success('Exchange rate added successfully');
      setNewRate({ from: 'USD', to: 'UGX', rate: 0, spread: 0 });
      await loadExchangeRates();
    } catch (error) {
      console.error('Error adding exchange rate:', error);
      toast.error('Failed to add exchange rate');
    } finally {
      setUpdating(false);
    }
  };

  const toggleRateStatus = async (rateId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('exchange_rates')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', rateId);

      if (error) {
        console.error('Error toggling rate status:', error);
        toast.error('Failed to update rate status');
        return;
      }

      toast.success(`Exchange rate ${!currentStatus ? 'activated' : 'deactivated'}`);
      await loadExchangeRates();
    } catch (error) {
      console.error('Error toggling rate status:', error);
      toast.error('Failed to update rate status');
    }
  };

  const getChangeIndicator = (change?: number) => {
    if (!change) return null;
    
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(rate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-center">
          <DollarSign className="h-8 w-8 mx-auto mb-2" />
          <p>Loading currency exchange rates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Currency Exchange Management</h3>
              <p className="text-sm text-blue-800">
                Exchange rates configured here are used for all user currency exchanges in their wallets. 
                Keep rates updated regularly to ensure fair market value.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Live Currency Exchange Manager
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-refresh">Auto Refresh</Label>
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
          <Button onClick={loadExchangeRates} disabled={updating} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Add New Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Exchange Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="from-currency">From Currency</Label>
              <select
                id="from-currency"
                className="w-full p-2 border rounded-md"
                value={newRate.from}
                onChange={(e) => setNewRate({ ...newRate, from: e.target.value })}
              >
                {majorCurrencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="to-currency">To Currency</Label>
              <select
                id="to-currency"
                className="w-full p-2 border rounded-md"
                value={newRate.to}
                onChange={(e) => setNewRate({ ...newRate, to: e.target.value })}
              >
                {majorCurrencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="rate">Exchange Rate</Label>
              <Input
                id="rate"
                type="number"
                step="0.000001"
                value={newRate.rate}
                onChange={(e) => setNewRate({ ...newRate, rate: parseFloat(e.target.value) || 0 })}
                placeholder="0.000000"
              />
            </div>
            <div>
              <Label htmlFor="spread">Spread %</Label>
              <Input
                id="spread"
                type="number"
                step="0.01"
                value={newRate.spread}
                onChange={(e) => setNewRate({ ...newRate, spread: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addNewRate} disabled={updating} className="w-full">
                Add Rate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Exchange Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exchangeRates.map((rate) => (
          <Card key={rate.id} className={`${rate.is_active ? '' : 'opacity-60'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {rate.from_currency} → {rate.to_currency}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {rate.is_active ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <Switch
                    checked={rate.is_active}
                    onCheckedChange={() => toggleRateStatus(rate.id, rate.is_active)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Rate</span>
                  {getChangeIndicator()}
                </div>
                <div className="text-2xl font-bold">
                  {formatRate(rate.rate)}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Spread</span>
                <Badge variant="outline">
                  {rate.spread_percentage}%
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(rate.updated_at).toLocaleString()}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.000001"
                  defaultValue={rate.rate}
                  placeholder="New rate"
                  id={`rate-${rate.id}`}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const input = document.getElementById(`rate-${rate.id}`) as HTMLInputElement;
                    const newRateValue = parseFloat(input.value);
                    if (newRateValue > 0) {
                      updateExchangeRate(rate.id, newRateValue, rate.spread_percentage);
                    }
                  }}
                  disabled={updating}
                >
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {exchangeRates.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No exchange rates configured</p>
            <p className="text-sm text-muted-foreground">Add your first exchange rate above</p>
          </CardContent>
        </Card>
      )}

      {/* Exchange Rate Analytics */}
      {exchangeRates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Exchange Rate Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{exchangeRates.length}</div>
                <div className="text-sm text-muted-foreground">Total Rates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {exchangeRates.filter(r => r.is_active).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Rates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {exchangeRates.filter(r => !r.is_active).length}
                </div>
                <div className="text-sm text-muted-foreground">Inactive Rates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(exchangeRates.reduce((sum, r) => sum + r.spread_percentage, 0) / exchangeRates.length * 100) / 100}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Spread</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveCurrencyManager;
