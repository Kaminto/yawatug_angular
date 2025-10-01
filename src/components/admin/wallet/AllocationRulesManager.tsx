
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AllocationRule } from '@/types/custom';

const AllocationRulesManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [currentRules, setCurrentRules] = useState<AllocationRule | null>(null);

  const form = useForm<AllocationRule>({
    defaultValues: {
      project_funding_percent: 60,
      expenses_percent: 20,
      buyback_percent: 20,
    },
  });

  useEffect(() => {
    loadCurrentRules();
  }, []);

  const loadCurrentRules = async () => {
    try {
      const { data, error } = await supabase
        .from('allocation_rules')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCurrentRules(data);
        form.reset(data);
      }
    } catch (error) {
      console.error('Error loading allocation rules:', error);
    }
  };

  const handleSaveRules = async (values: AllocationRule) => {
    // Validate that percentages add up to 100
    const total = values.project_funding_percent + values.expenses_percent + values.buyback_percent;
    if (total !== 100) {
      toast({
        title: "Invalid allocation",
        description: "Percentages must add up to 100%",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('allocation_rules')
        .insert(values);
        
      if (error) throw error;
      
      toast({
        title: "Allocation rules updated",
        description: "New allocation rules have been saved successfully",
      });
      
      loadCurrentRules();
    } catch (error: any) {
      console.error('Error updating allocation rules:', error);
      toast({
        title: "Failed to update rules",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const watchedValues = form.watch();
  const totalPercentage = (watchedValues.project_funding_percent || 0) + 
                         (watchedValues.expenses_percent || 0) + 
                         (watchedValues.buyback_percent || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Allocation Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">How Allocation Works</h3>
          <p className="text-sm text-muted-foreground">
            When users purchase shares, the payment is automatically distributed across three sub-accounts 
            based on the percentages set below. All transaction fees go directly to Admin Expenses.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveRules)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="project_funding_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Funding (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        max="100"
                        step="0.1"
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expenses_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Expenses (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        max="100"
                        step="0.1"
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="buyback_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share Buyback (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        max="100"
                        step="0.1"
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Total Percentage:</span>
              <span className={`text-lg font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPercentage.toFixed(1)}%
              </span>
            </div>
            
            <Button 
              type="submit" 
              disabled={loading || totalPercentage !== 100}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Allocation Rules'}
            </Button>
          </form>
        </Form>

        {currentRules && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Active Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {currentRules.project_funding_percent}%
                    </div>
                    <div className="text-sm text-muted-foreground">Project Funding</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {currentRules.expenses_percent}%
                    </div>
                    <div className="text-sm text-muted-foreground">Admin Expenses</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentRules.buyback_percent}%
                    </div>
                    <div className="text-sm text-muted-foreground">Share Buyback</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AllocationRulesManager;
