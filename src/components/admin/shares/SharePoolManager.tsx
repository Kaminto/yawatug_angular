import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Settings, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const poolUpdateSchema = z.object({
  total_shares: z.number().min(1, 'Total shares must be greater than 0'),
  additional_shares: z.number().min(0, 'Additional shares cannot be negative'),
  reason: z.string().min(1, 'Reason is required'),
});

interface SharePoolManagerProps {
  shareData: {
    id: string;
    name: string;
    total_shares: number;
    available_shares: number;
    price_per_share: number;
    currency: string;
  };
  onUpdate: () => void;
}

const SharePoolManager: React.FC<SharePoolManagerProps> = ({ shareData, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'set_total' | 'add_shares'>('set_total');

  const form = useForm({
    resolver: zodResolver(poolUpdateSchema),
    defaultValues: {
      total_shares: shareData.total_shares || 0,
      additional_shares: 0,
      reason: '',
    }
  });

  const handlePoolUpdate = async (values: z.infer<typeof poolUpdateSchema>) => {
    try {
      setLoading(true);

      // Calculate issued/sold shares (these cannot be changed)
      const issuedShares = shareData.total_shares - shareData.available_shares;
      
      let newTotalShares = shareData.total_shares;
      let newAvailableShares = shareData.available_shares;

      if (action === 'set_total') {
        // Validate that new total doesn't go below issued shares
        if (values.total_shares < issuedShares) {
          toast.error(`Cannot set total below ${issuedShares.toLocaleString()} already issued shares`);
          return;
        }
        
        newTotalShares = values.total_shares;
        // Available = New Total - Already Issued
        newAvailableShares = values.total_shares - issuedShares;
      } else {
        // Add additional shares (always safe)
        newTotalShares = shareData.total_shares + values.additional_shares;
        newAvailableShares = shareData.available_shares + values.additional_shares;
      }

      // Update share pool
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          total_shares: newTotalShares,
          available_shares: newAvailableShares,
          updated_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      if (updateError) throw updateError;

      toast.success(action === 'set_total' ? 'Total shares updated successfully' : 'Shares added successfully');
      setDialogOpen(false);
      form.reset();
      onUpdate();
    } catch (error) {
      console.error('Error updating share pool:', error);
      toast.error('Failed to update share pool');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (actionType: 'set_total' | 'add_shares') => {
    setAction(actionType);
    if (actionType === 'set_total') {
      form.setValue('total_shares', shareData.total_shares || 0);
    }
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Share Pool Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Pool Relationship Explanation */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How Pool Management Works:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Each <strong>share type</strong> ({shareData.name}) has its own separate pool</li>
              <li>• When users <strong>buy shares</strong>, "Available" decreases and "Issued" increases</li>
              <li>• Pool size can be <strong>increased</strong> anytime, but cannot go <strong>below</strong> already issued shares</li>
              <li>• Price is unified across all share types, but each has different buying limits/rewards</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {shareData.total_shares?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Pool Size</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {shareData.available_shares?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-muted-foreground">Available for Sale</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {((shareData.total_shares - shareData.available_shares) || 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Already Issued/Sold</div>
            </div>
          </div>

          {shareData.total_shares === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">No shares in pool</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Set the initial total shares to start managing your share pool.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => openDialog('set_total')}
                  variant={shareData.total_shares === 0 ? 'default' : 'outline'}
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {shareData.total_shares === 0 ? 'Set Total Shares' : 'Update Total'}
                </Button>
              </DialogTrigger>

              {shareData.total_shares > 0 && (
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => openDialog('add_shares')}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More Shares
                  </Button>
                </DialogTrigger>
              )}

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {action === 'set_total' ? 'Set Total Shares' : 'Add Shares to Pool'}
                  </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handlePoolUpdate)} className="space-y-4">
                    {action === 'set_total' ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                          <strong>Constraint:</strong> Total cannot go below {((shareData.total_shares - shareData.available_shares) || 0).toLocaleString()} already issued shares.
                        </div>
                        <FormField
                          control={form.control}
                          name="total_shares"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Shares in Pool</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  placeholder="Enter total shares"
                                  min={shareData.total_shares - shareData.available_shares}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="additional_shares"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Shares to Add</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                placeholder="Enter number of shares to add"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for Change</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Explain why you're making this change..."
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Updating...' : (action === 'set_total' ? 'Set Total' : 'Add Shares')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SharePoolManager;