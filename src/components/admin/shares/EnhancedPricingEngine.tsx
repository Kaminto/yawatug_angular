import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Calculator, TrendingUp, DollarSign, Activity, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface ShareData {
  id: string;
  name: string;
  price_per_share: number;
  currency: string;
  available_shares: number;
  total_shares: number;
  last_price_calculation_date?: string;
  pricing_metadata?: any;
}

interface PriceCalculation {
  id: string;
  calculation_date: string;
  calculation_method: string;
  previous_price: number;
  mining_profit_factor: number;
  dividend_impact_factor: number;
  market_activity_factor: number;
  supply_demand_factor: number;
  calculated_price: number;
  approved_price?: number;
  price_change_percent: number;
  admin_notes?: string;
  auto_applied: boolean;
  approved_at?: string;
}

interface EnhancedPricingEngineProps {
  shareData: ShareData;
  onUpdate: () => void;
}

const EnhancedPricingEngine: React.FC<EnhancedPricingEngineProps> = ({ shareData, onUpdate }) => {
  const [calculations, setCalculations] = useState<PriceCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('calculate');
  
  const [calculationForm, setCalculationForm] = useState({
    mining_profit_per_share: 0,
    dividend_impact: 0,
    market_activity_score: 0,
    manual_adjustment: 0,
    calculation_method: 'manual',
    admin_notes: ''
  });

  const [previewPrice, setPreviewPrice] = useState<number | null>(null);

  useEffect(() => {
    loadPriceCalculations();
  }, [shareData.id]);

  const loadPriceCalculations = async () => {
    try {
      const { data, error } = await supabase
        .from('enhanced_share_price_calculations')
        .select('*')
        .eq('share_id', shareData.id)
        .order('calculation_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setCalculations(data || []);
    } catch (error) {
      console.error('Error loading price calculations:', error);
      toast.error('Failed to load price calculations');
    }
  };

  const calculatePreviewPrice = async () => {
    try {
      setLoading(true);
      
      const miningData = calculationForm.mining_profit_per_share > 0 ? 
        { profit_per_share: calculationForm.mining_profit_per_share } : {};
      
      const dividendData = calculationForm.dividend_impact !== 0 ?
        { dividend_impact: calculationForm.dividend_impact } : {};
        
      const marketData = calculationForm.market_activity_score !== 0 ?
        { activity_score: calculationForm.market_activity_score } : {};

      const { data, error } = await supabase.rpc('calculate_enhanced_share_price', {
        p_share_id: shareData.id,
        p_mining_profit_data: miningData,
        p_dividend_data: dividendData,
        p_market_data: marketData,
        p_manual_adjustment: calculationForm.manual_adjustment,
        p_calculation_method: calculationForm.calculation_method
      });

      if (error) throw error;
      
      // Fetch the latest calculation to get the calculated price
      const { data: latestCalc, error: calcError } = await supabase
        .from('enhanced_share_price_calculations')
        .select('calculated_price')
        .eq('id', data)
        .single();

      if (calcError) throw calcError;
      
      setPreviewPrice(latestCalc.calculated_price);
      loadPriceCalculations();
      toast.success('Price calculation completed');
    } catch (error) {
      console.error('Error calculating price:', error);
      toast.error('Failed to calculate price');
    } finally {
      setLoading(false);
    }
  };

  const applyPriceCalculation = async (calculationId: string, calculatedPrice: number) => {
    try {
      setLoading(true);
      
      // Update the share price
      const { error: shareError } = await supabase
        .from('shares')
        .update({
          price_per_share: calculatedPrice,
          last_price_calculation_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      if (shareError) throw shareError;

      // Update the calculation as approved and applied
      const { error: calcError } = await supabase
        .from('enhanced_share_price_calculations')
        .update({
          approved_price: calculatedPrice,
          auto_applied: true,
          approved_at: new Date().toISOString()
        })
        .eq('id', calculationId);

      if (calcError) throw calcError;

      toast.success('Price updated successfully');
      onUpdate();
      loadPriceCalculations();
      setPreviewPrice(null);
    } catch (error) {
      console.error('Error applying price calculation:', error);
      toast.error('Failed to apply price calculation');
    } finally {
      setLoading(false);
    }
  };

  const getMethodBadge = (method: string) => {
    const variants: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
      'manual': 'default',
      'auto_dynamic': 'secondary', 
      'market_activity': 'outline',
      'dividend_adjusted': 'destructive'
    };
    return <Badge variant={variants[method] || 'default'}>{method}</Badge>;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            Enhanced Pricing Engine
          </h2>
          <p className="text-muted-foreground">
            Unified pricing for all share types with dynamic calculations
          </p>
          <Badge variant="outline" className="mt-2">
            Single Price Model - Different Buying Limits per Type/Period
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(shareData.price_per_share, shareData.currency)}
          </div>
          <p className="text-sm text-muted-foreground">Universal Price</p>
          <p className="text-xs text-muted-foreground">
            Applied to all share types
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculate">Price Calculator</TabsTrigger>
          <TabsTrigger value="buying-limits">Buying Limits by Type</TabsTrigger>
          <TabsTrigger value="history">Calculation History</TabsTrigger>
        </TabsList>

        <TabsContent value="calculate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Calculate New Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Current Price Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(shareData.price_per_share, shareData.currency)}
                    </div>
                    <p className="text-sm text-muted-foreground">Current Price</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold">
                      {((shareData.available_shares / shareData.total_shares) * 100).toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Availability</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold">
                      {shareData.last_price_calculation_date 
                        ? new Date(shareData.last_price_calculation_date).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                  </div>
                </div>

                {/* Price Factors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Mining Profit per Share ({shareData.currency})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={calculationForm.mining_profit_per_share}
                      onChange={(e) => setCalculationForm(prev => ({ ...prev, mining_profit_per_share: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Recent mining profits distributed per share
                    </p>
                  </div>

                  <div>
                    <Label>Dividend Impact ({shareData.currency})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={calculationForm.dividend_impact}
                      onChange={(e) => setCalculationForm(prev => ({ ...prev, dividend_impact: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Positive for dividend payments, negative for upcoming dividends
                    </p>
                  </div>

                  <div>
                    <Label>Market Activity Score (0-10)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={calculationForm.market_activity_score}
                      onChange={(e) => setCalculationForm(prev => ({ ...prev, market_activity_score: parseFloat(e.target.value) || 0 }))}
                      placeholder="5.0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Market demand and trading activity (5 = neutral)
                    </p>
                  </div>

                  <div>
                    <Label>Manual Adjustment ({shareData.currency})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={calculationForm.manual_adjustment}
                      onChange={(e) => setCalculationForm(prev => ({ ...prev, manual_adjustment: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Direct price adjustment (positive or negative)
                    </p>
                  </div>

                  <div>
                    <Label>Calculation Method</Label>
                    <Select 
                      value={calculationForm.calculation_method} 
                      onValueChange={(value) => setCalculationForm(prev => ({ ...prev, calculation_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="auto_dynamic">Auto Dynamic</SelectItem>
                        <SelectItem value="market_activity">Market Activity</SelectItem>
                        <SelectItem value="dividend_adjusted">Dividend Adjusted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={calculationForm.admin_notes}
                    onChange={(e) => setCalculationForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                    placeholder="Optional notes about this price calculation..."
                  />
                </div>

                {/* Preview Price */}
                {previewPrice && (
                  <Card className="border-dashed border-2 border-primary">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">Calculated Price</h3>
                          <p className="text-sm text-muted-foreground">Preview of new price calculation</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">
                            {formatCurrency(previewPrice, shareData.currency)}
                          </div>
                          <div className={`text-sm font-medium ${getPriceChangeColor(previewPrice - shareData.price_per_share)}`}>
                            {previewPrice > shareData.price_per_share ? '+' : ''}
                            {formatCurrency(previewPrice - shareData.price_per_share, shareData.currency)} 
                            ({(((previewPrice - shareData.price_per_share) / shareData.price_per_share) * 100).toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => applyPriceCalculation(calculations[0]?.id, previewPrice)}
                          disabled={loading}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Apply This Price
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setPreviewPrice(null)}
                        >
                          Discard
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  onClick={calculatePreviewPrice}
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {loading ? 'Calculating...' : 'Calculate Price'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buying-limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Buying Limits & Rewards by Share Type
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Same price for all types, but different buying limits and reward periods
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Price Model Explanation */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Unified Pricing Model</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    All share types use the same price ({formatCurrency(shareData.price_per_share, shareData.currency)}) but have different:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 ml-4">
                    <li>• Minimum and maximum buying limits</li>
                    <li>• Down payment requirements for credit purchases</li>
                    <li>• Reward percentages and vesting periods</li>
                    <li>• Transaction fees and processing charges</li>
                  </ul>
                </div>

                {/* Share Type Buying Limits Table */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Current Share Types & Their Limits</h3>
                  <div className="grid gap-4">
                    {/* Common Shares */}
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              Common Shares
                              <Badge variant="default">Most Popular</Badge>
                            </h4>
                            <p className="text-sm text-muted-foreground">Standard investment option for all users</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(shareData.price_per_share, shareData.currency)}
                            </div>
                            <p className="text-xs text-muted-foreground">Per Share</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Min Buy:</span>
                            <br />
                            <span className="font-semibold">{formatCurrency(50000, shareData.currency)}</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Max Buy:</span>
                            <br />
                            <span className="font-semibold">{formatCurrency(5000000, shareData.currency)}</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Down Payment:</span>
                            <br />
                            <span className="font-semibold">30%</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Credit Period:</span>
                            <br />
                            <span className="font-semibold">30 days</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* VIP Shares */}
                    <Card className="border-l-4 border-l-purple-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              VIP Shares
                              <Badge variant="secondary">Premium</Badge>
                            </h4>
                            <p className="text-sm text-muted-foreground">Enhanced benefits and longer credit terms</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-purple-600">
                              {formatCurrency(shareData.price_per_share, shareData.currency)}
                            </div>
                            <p className="text-xs text-muted-foreground">Per Share</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Min Buy:</span>
                            <br />
                            <span className="font-semibold">{formatCurrency(200000, shareData.currency)}</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Max Buy:</span>
                            <br />
                            <span className="font-semibold">{formatCurrency(20000000, shareData.currency)}</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Down Payment:</span>
                            <br />
                            <span className="font-semibold">20%</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Credit Period:</span>
                            <br />
                            <span className="font-semibold">60 days</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Club Shares */}
                    <Card className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              Club Shares
                              <Badge variant="outline">Exclusive</Badge>
                            </h4>
                            <p className="text-sm text-muted-foreground">Investment club members with special terms</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-orange-600">
                              {formatCurrency(shareData.price_per_share, shareData.currency)}
                            </div>
                            <p className="text-xs text-muted-foreground">Per Share</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Min Buy:</span>
                            <br />
                            <span className="font-semibold">{formatCurrency(100000, shareData.currency)}</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Max Buy:</span>
                            <br />
                            <span className="font-semibold">Unlimited</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Down Payment:</span>
                            <br />
                            <span className="font-semibold">0%</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Credit Period:</span>
                            <br />
                            <span className="font-semibold">90 days</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-muted">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-2">Reward Periods & Incentives</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Early Bird (First 30 days):</span>
                          <br />
                          <span className="text-green-600 font-semibold">+5% bonus shares</span>
                        </div>
                        <div>
                          <span className="font-medium">Volume Bonus (&gt;1M UGX):</span>
                          <br />
                          <span className="text-blue-600 font-semibold">+2% bonus shares</span>
                        </div>
                        <div>
                          <span className="font-medium">Referral Reward:</span>
                          <br />
                          <span className="text-purple-600 font-semibold">3% of referee purchase</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Price Calculation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {calculations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No price calculations yet
                  </p>
                ) : (
                  calculations.map((calc) => (
                    <Card key={calc.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {formatCurrency(calc.calculated_price, shareData.currency)}
                            </h3>
                            {getMethodBadge(calc.calculation_method)}
                            {calc.approved_price && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Applied
                              </Badge>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {new Date(calc.calculation_date).toLocaleString()}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Previous:</span>
                            <br />
                            <span className="font-medium">{formatCurrency(calc.previous_price, shareData.currency)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Change:</span>
                            <br />
                            <span className={`font-medium ${getPriceChangeColor(calc.price_change_percent)}`}>
                              {calc.price_change_percent > 0 ? '+' : ''}{calc.price_change_percent.toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Mining Factor:</span>
                            <br />
                            <span className="font-medium">{formatCurrency(calc.mining_profit_factor, shareData.currency)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Market Factor:</span>
                            <br />
                            <span className="font-medium">{formatCurrency(calc.market_activity_factor, shareData.currency)}</span>
                          </div>
                        </div>

                        {calc.admin_notes && (
                          <div className="text-sm text-muted-foreground border-t pt-2">
                            <strong>Notes:</strong> {calc.admin_notes}
                          </div>
                        )}

                        {!calc.approved_price && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm"
                              onClick={() => applyPriceCalculation(calc.id, calc.calculated_price)}
                              disabled={loading}
                            >
                              Apply Price
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedPricingEngine;