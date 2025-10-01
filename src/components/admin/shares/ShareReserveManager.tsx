
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ShareReserveAllocation {
  id: string;
  purpose: string;
  percentage: number;
  quantity: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface ShareReserveManagerProps {
  shareData: any;
  onUpdate: () => void;
}

const ShareReserveManager: React.FC<ShareReserveManagerProps> = ({ shareData, onUpdate }) => {
  const [reserveAllocations, setReserveAllocations] = useState<ShareReserveAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm({
    defaultValues: {
      purpose: '',
      percentage: 0,
      description: '',
    },
  });

  useEffect(() => {
    loadReserveAllocations();
  }, []);

  const loadReserveAllocations = async () => {
    try {
      const { data, error } = await supabase
        .from('share_reserve_allocations')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setReserveAllocations(data || []);
    } catch (error) {
      console.error('Error loading reserve allocations:', error);
    }
  };

  const calculateQuantityFromPercentage = (percentage: number) => {
    return Math.floor((shareData.total_shares * percentage) / 100);
  };

  const handleCreateReserve = async (values: any) => {
    try {
      setIsLoading(true);
      
      const quantity = calculateQuantityFromPercentage(values.percentage);
      
      // Check if total reserves don't exceed reasonable limits
      const totalReservedPercentage = reserveAllocations.reduce((sum, allocation) => sum + allocation.percentage, 0) + values.percentage;
      
      if (totalReservedPercentage > 50) {
        toast({
          title: "Reserve limit exceeded",
          description: "Total reserves cannot exceed 50% of the share pool",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('share_reserve_allocations')
        .insert({
          purpose: values.purpose,
          percentage: values.percentage,
          quantity: quantity,
          description: values.description,
        });
        
      if (error) throw error;
      
      // Update the shares table with new reserved amount
      const totalReservedShares = reserveAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0) + quantity;
      
      const { error: updateError } = await supabase
        .from('shares')
        .update({ 
          reserved_shares: totalReservedShares,
          available_shares: shareData.total_shares - totalReservedShares - (shareData.total_shares - shareData.available_shares - shareData.reserved_shares)
        })
        .eq('name', 'Yawatu Ordinary Shares');
        
      if (updateError) throw updateError;
      
      toast({
        title: "Reserve created",
        description: `Reserved ${quantity.toLocaleString()} shares for ${values.purpose}`,
      });
      
      form.reset();
      loadReserveAllocations();
      onUpdate();
    } catch (error: any) {
      console.error('Error creating reserve:', error);
      toast({
        title: "Reserve creation failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalReservedShares = reserveAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  const totalReservedPercentage = reserveAllocations.reduce((sum, allocation) => sum + allocation.percentage, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Create New Reserve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateReserve)} className="space-y-4">
              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Employee Stock Options, Promotions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentage of Total Shares (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        max="50"
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional details about this reserve..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">
                  <strong>Calculated Quantity:</strong> {form.watch('percentage') ? calculateQuantityFromPercentage(form.watch('percentage')).toLocaleString() : 0} shares
                </p>
              </div>
              
              <Button type="submit" disabled={isLoading} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {isLoading ? 'Creating...' : 'Create Reserve'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Reserves</CardTitle>
          <div className="text-sm text-muted-foreground">
            Total Reserved: {totalReservedShares.toLocaleString()} shares ({totalReservedPercentage.toFixed(1)}%)
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purpose</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reserveAllocations.map((allocation) => (
                <TableRow key={allocation.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{allocation.purpose}</div>
                      {allocation.description && (
                        <div className="text-xs text-muted-foreground">{allocation.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{allocation.quantity.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{allocation.percentage}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {reserveAllocations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">No reserves allocated</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareReserveManager;
