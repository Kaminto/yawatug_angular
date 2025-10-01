import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface LargeHolderQueueEntry {
  id: string;
  user_id: string;
  total_quantity: number;
  remaining_quantity: number;
  requested_price?: number;
  market_price_at_submission: number;
  queue_position?: number;
  daily_release_limit: number;
  status: 'queued' | 'processing' | 'partial' | 'completed' | 'cancelled';
  submitted_at: string;
  processing_started_at?: string;
  last_release_at?: string;
  completed_at?: string;
  admin_notes?: string;
  // Profile data
  profiles?: {
    full_name: string;
    email: string;
  };
}

const LargeHolderManagement: React.FC = () => {
  const [queueEntries, setQueueEntries] = useState<LargeHolderQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LargeHolderQueueEntry | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const loadQueueEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('large_holder_sell_queue')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('queue_position', { ascending: true });

      if (error) throw error;
      setQueueEntries((data as any[])?.map(item => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      })) || []);
    } catch (error) {
      console.error('Error loading queue entries:', error);
      toast({
        title: "Error",
        description: "Failed to load large holder queue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQueueEntry = async (id: string, updates: Partial<LargeHolderQueueEntry>) => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('large_holder_sell_queue')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadQueueEntries();
      setSelectedEntry(null);
      setAdminNotes('');

      toast({
        title: "Success",
        description: "Queue entry updated successfully",
      });
    } catch (error) {
      console.error('Error updating queue entry:', error);
      toast({
        title: "Error",
        description: "Failed to update queue entry",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (id: string, status: string, notes?: string) => {
    const updates: any = { status };
    
    if (notes) {
      updates.admin_notes = notes;
    }

    if (status === 'processing') {
      updates.processing_started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.remaining_quantity = 0;
    }

    await updateQueueEntry(id, updates);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary">Queued</Badge>;
      case 'processing':
        return <Badge variant="default">Processing</Badge>;
      case 'partial':
        return <Badge variant="outline">Partial</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const getProgressPercentage = (entry: LargeHolderQueueEntry) => {
    return ((entry.total_quantity - entry.remaining_quantity) / entry.total_quantity) * 100;
  };

  useEffect(() => {
    loadQueueEntries();
  }, []);

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Large Holder Sell Queue</CardTitle>
          </div>
          <CardDescription>
            Manage large share sell orders with controlled daily release limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queueEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No large holder queue entries found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Total Shares</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Daily Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline">#{entry.queue_position || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entry.profiles?.full_name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{entry.profiles?.email || 'No email'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{entry.total_quantity.toLocaleString()}</TableCell>
                    <TableCell>{entry.remaining_quantity.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${getProgressPercentage(entry)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {getProgressPercentage(entry).toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell>{entry.daily_release_limit}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell className="text-sm">{formatDate(entry.submitted_at)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setAdminNotes(entry.admin_notes || '');
                            }}
                          >
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Manage Queue Entry</DialogTitle>
                            <DialogDescription>
                              Update status and add admin notes for {entry.profiles?.full_name || 'Unknown User'}
                            </DialogDescription>
                          </DialogHeader>

                          {selectedEntry && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">Total Shares</Label>
                                  <p className="text-sm">{selectedEntry.total_quantity.toLocaleString()}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Remaining Shares</Label>
                                  <p className="text-sm">{selectedEntry.remaining_quantity.toLocaleString()}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Requested Price</Label>
                                  <p className="text-sm">
                                    {selectedEntry.requested_price 
                                      ? `UGX ${selectedEntry.requested_price.toLocaleString()}`
                                      : 'Market Price'
                                    }
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Market Price at Submission</Label>
                                  <p className="text-sm">UGX {selectedEntry.market_price_at_submission.toLocaleString()}</p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="admin-notes">Admin Notes</Label>
                                <Textarea
                                  id="admin-notes"
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Add notes about this queue entry..."
                                  rows={3}
                                />
                              </div>

                              <div className="flex gap-2 flex-wrap">
                                {selectedEntry.status === 'queued' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(selectedEntry.id, 'processing', adminNotes)}
                                    disabled={isUpdating}
                                  >
                                    <Clock className="h-4 w-4 mr-2" />
                                    Start Processing
                                  </Button>
                                )}

                                {(selectedEntry.status === 'processing' || selectedEntry.status === 'partial') && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(selectedEntry.id, 'completed', adminNotes)}
                                    disabled={isUpdating}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Complete
                                  </Button>
                                )}

                                {selectedEntry.status !== 'completed' && selectedEntry.status !== 'cancelled' && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleStatusChange(selectedEntry.id, 'cancelled', adminNotes)}
                                    disabled={isUpdating}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQueueEntry(selectedEntry.id, { admin_notes: adminNotes })}
                                  disabled={isUpdating}
                                >
                                  Save Notes
                                </Button>
                              </div>
                            </div>
                          )}

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                              Close
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Queued</p>
                <p className="text-2xl font-bold">
                  {queueEntries.filter(e => e.status === 'queued').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Processing</p>
                <p className="text-2xl font-bold">
                  {queueEntries.filter(e => e.status === 'processing' || e.status === 'partial').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">
                  {queueEntries.filter(e => e.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Cancelled</p>
                <p className="text-2xl font-bold">
                  {queueEntries.filter(e => e.status === 'cancelled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LargeHolderManagement;