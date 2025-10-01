
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SharePricingMode } from '@/types/custom';
import { triggerGlobalPriceUpdate } from '@/hooks/usePriceUpdateCoordinator';

interface SharePrice {
  id: string;
  price_per_share: number;
  price_calculation_mode: string;
  currency: string;
}

interface SharePriceManagerProps {
  shareData: SharePrice;
  onUpdate: () => void;
}

const SharePriceManager: React.FC<SharePriceManagerProps> = ({ shareData, onUpdate }) => {
  const [isAutomatic, setIsAutomatic] = useState(shareData.price_calculation_mode === 'auto');
  
  const form = useForm({
    defaultValues: {
      price_per_share: shareData.price_per_share,
      calculation_mode: shareData.price_calculation_mode as SharePricingMode,
    },
  });

  const handleModeToggle = (checked: boolean) => {
    setIsAutomatic(checked);
    form.setValue('calculation_mode', checked ? 'auto' : 'manual');
  };
  
  const calculateAutomaticPrice = async () => {
    try {
      // Get last 7 days of pool history
      const { data: poolHistory, error: historyError } = await supabase
        .from('share_pool_history')
        .select('*')
        .order('date', { ascending: false })
        .limit(7);
        
      if (historyError) throw historyError;
      
      if (!poolHistory || poolHistory.length < 2) {
        toast({ 
          title: "Insufficient Data",
          description: "Not enough historical data to calculate automatic price",
          variant: "destructive" 
        });
        return;
      }
      
      // Calculate net movement and percentage change
      const latest = poolHistory[0];
      const previous = poolHistory[1];
      
      const netMovement = latest.shares_sold - latest.shares_bought_back;
      const previousNet = previous.shares_sold - previous.shares_bought_back;
      const percentageChange = previousNet ? (netMovement - previousNet) / previousNet : 0;
      
      // Cap movement at ±10%
      const cappedChange = Math.max(Math.min(percentageChange, 0.1), -0.1);
      
      // Calculate new price
      const newPrice = shareData.price_per_share * (1 + cappedChange);
      form.setValue('price_per_share', parseFloat(newPrice.toFixed(2)));
    } catch (error) {
      console.error('Error calculating automatic price:', error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate automatic price",
        variant: "destructive"
      });
    }
  };
  
  const handleSubmitPrice = async (values: any) => {
    try {
      const { price_per_share, calculation_mode } = values;
      
      // Update share price in database
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          price_per_share,
          price_calculation_mode: calculation_mode,
        })
        .eq('id', shareData.id);
        
      if (updateError) throw updateError;
      
      // Record in price history
      const { error: historyError } = await supabase
        .from('share_price_history')
        .insert({
          price_per_share,
          calculation_method: calculation_mode,
          currency: shareData.currency,
        });
        
      if (historyError) throw historyError;
      
      toast({ 
        title: "Price Updated", 
        description: `Share price updated to ${shareData.currency} ${price_per_share.toLocaleString()}`
      });
      
      // Trigger global price update for all pricing hooks
      triggerGlobalPriceUpdate();
      onUpdate();
    } catch (error) {
      console.error('Error updating share price:', error);
      toast({ 
        title: "Update Failed", 
        description: "There was a problem updating the share price", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Share Price Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitPrice)} className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch 
                id="automatic-pricing"
                checked={isAutomatic}
                onCheckedChange={handleModeToggle}
              />
              <FormLabel htmlFor="automatic-pricing">
                Automatic Price Calculation
              </FormLabel>
            </div>
            
            {isAutomatic && (
              <div className="bg-muted/50 p-3 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Automatic pricing uses market activity to determine share price changes.
                  Price can fluctuate by max ±10% in a 30-day period.
                </p>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="price_per_share"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Per Share ({shareData.currency})</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field} 
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                      disabled={isAutomatic}
                    />
                  </FormControl>
                  {isAutomatic && (
                    <FormDescription>
                      Price is calculated automatically based on market activity
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="calculation_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Calculation Mode</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="auto">Automatic</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-between">
              {isAutomatic && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={calculateAutomaticPrice}
                >
                  Calculate Price
                </Button>
              )}
              <Button type="submit">
                Update Price
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default SharePriceManager;
