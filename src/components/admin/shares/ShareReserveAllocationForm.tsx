
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShareReserveAllocationFormProps {
  allocation?: any;
  onSubmit: () => void;
  totalShares: number;
}

const ShareReserveAllocationForm: React.FC<ShareReserveAllocationFormProps> = ({
  allocation,
  onSubmit,
  totalShares,
}) => {
  const form = useForm({
    defaultValues: {
      purpose: allocation?.purpose || '',
      percentage: allocation?.percentage || '',
      quantity: allocation?.quantity || '',
      description: allocation?.description || '',
    },
  });

  const isEditing = !!allocation;

  const handleCalculateQuantity = (percentage: number) => {
    if (percentage > 0 && totalShares > 0) {
      const quantity = Math.round((percentage / 100) * totalShares);
      form.setValue('quantity', quantity.toString());
    }
  };

  const handleCalculatePercentage = (quantity: number) => {
    if (quantity > 0 && totalShares > 0) {
      const percentage = ((quantity / totalShares) * 100).toFixed(2);
      form.setValue('percentage', percentage);
    }
  };

  const handleSaveAllocation = async (values: any) => {
    try {
      const data = {
        purpose: values.purpose,
        percentage: parseFloat(values.percentage),
        quantity: parseInt(values.quantity, 10),
        description: values.description,
      };

      let error;

      if (isEditing) {
        // Update existing allocation
        const { error: updateError } = await supabase
          .from('share_reserve_allocations')
          .update(data)
          .eq('id', allocation.id);
        error = updateError;
      } else {
        // Create new allocation
        const { error: insertError } = await supabase
          .from('share_reserve_allocations')
          .insert([data]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(`Allocation ${isEditing ? 'updated' : 'created'} successfully`);
      onSubmit();
    } catch (error: any) {
      console.error('Error saving allocation:', error);
      toast.error('Failed to save allocation');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSaveAllocation)} className="space-y-6">
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Employee Stock Options" {...field} />
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
              <FormLabel>Percentage of Total Shares</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="E.g., 5.00" 
                  {...field} 
                  onChange={(e) => {
                    field.onChange(e);
                    handleCalculateQuantity(parseFloat(e.target.value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity of Shares</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="E.g., 50000" 
                  {...field} 
                  onChange={(e) => {
                    field.onChange(e);
                    handleCalculatePercentage(parseInt(e.target.value, 10));
                  }}
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
                <Textarea 
                  placeholder="Add details about this allocation" 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onSubmit}>
            Cancel
          </Button>
          <Button type="submit">
            {isEditing ? 'Update' : 'Create'} Allocation
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ShareReserveAllocationForm;
