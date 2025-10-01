
import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BuybackSettings {
  id: string;
  buy_back_limit: number;
  buy_back_fund: number;
  buy_back_mode: string;
  currency: string;
}

interface BuybackManagerProps {
  shareData: BuybackSettings;
  onUpdate: () => void;
}

const BuybackManager: React.FC<BuybackManagerProps> = ({ shareData, onUpdate }) => {
  const form = useForm({
    defaultValues: {
      buy_back_limit: shareData.buy_back_limit,
      buy_back_fund: shareData.buy_back_fund,
      buy_back_mode: shareData.buy_back_mode,
    },
  });

  const handleSubmit = async (values: any) => {
    try {
      const { buy_back_limit, buy_back_fund, buy_back_mode } = values;
      
      const { error } = await supabase
        .from('shares')
        .update({
          buy_back_limit,
          buy_back_fund,
          buy_back_mode,
        })
        .eq('id', shareData.id);
        
      if (error) throw error;
      
      toast({ 
        title: "Buyback Settings Updated", 
        description: "Buyback configuration has been successfully updated" 
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error updating buyback settings:', error);
      toast({ 
        title: "Update Failed", 
        description: "There was a problem updating the buyback settings", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="mr-2 h-5 w-5" />
          Buyback Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="buy_back_limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyback Limit (shares)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={e => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of shares that can be bought back
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="buy_back_fund"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyback Fund ({shareData.currency})</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field}
                      onChange={e => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Total funds allocated for share buybacks
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="buy_back_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyback Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual Approval</SelectItem>
                      <SelectItem value="auto">Automatic</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Manual requires admin approval, automatic processes requests instantly
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit">
              Update Buyback Settings
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BuybackManager;
