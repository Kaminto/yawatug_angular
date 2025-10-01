import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Trash2, AlertTriangle, FileText, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BatchInfo {
  import_batch_reference: string;
  allocation_count: number;
  total_shares: number;
  total_debt: number;
  total_fees: number;
  statuses: { [key: string]: number };
  created_at: string;
}

interface ClubBatchManagerProps {
  onBatchDeleted: () => void;
}

const ClubBatchManager: React.FC<ClubBatchManagerProps> = ({ onBatchDeleted }) => {
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('club_share_allocations')
        .select(`
          import_batch_reference,
          allocated_shares,
          debt_amount_settled,
          transfer_fee_paid,
          allocation_status,
          created_at
        `)
        .not('import_batch_reference', 'is', null);

      if (error) throw error;

      // Group by batch reference
      const batchMap = new Map<string, BatchInfo>();
      
      data?.forEach(allocation => {
        const batchRef = allocation.import_batch_reference;
        if (!batchMap.has(batchRef)) {
          batchMap.set(batchRef, {
            import_batch_reference: batchRef,
            allocation_count: 0,
            total_shares: 0,
            total_debt: 0,
            total_fees: 0,
            statuses: {},
            created_at: allocation.created_at
          });
        }
        
        const batch = batchMap.get(batchRef)!;
        batch.allocation_count++;
        batch.total_shares += allocation.allocated_shares;
        batch.total_debt += allocation.debt_amount_settled;
        batch.total_fees += allocation.transfer_fee_paid;
        batch.statuses[allocation.allocation_status] = (batch.statuses[allocation.allocation_status] || 0) + 1;
        
        // Keep the earliest created_at
        if (allocation.created_at < batch.created_at) {
          batch.created_at = allocation.created_at;
        }
      });

      setBatches(Array.from(batchMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (error) {
      console.error('Error loading batches:', error);
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const deleteBatch = async (batchReference: string) => {
    setDeleting(batchReference);
    try {
      // First get all allocations in this batch
      const { data: allocations, error: allocationsError } = await supabase
        .from('club_share_allocations')
        .select('id, club_member_id')
        .eq('import_batch_reference', batchReference);

      if (allocationsError) throw allocationsError;

      // Delete release logs first (due to foreign key constraints)
      const allocationIds = allocations?.map(a => a.id) || [];
      if (allocationIds.length > 0) {
        // First delete release logs that reference these holding accounts
        const { error: releaseLogError } = await supabase
          .from('club_share_release_log')
          .delete()
          .in('club_allocation_id', allocationIds);

        if (releaseLogError) console.warn('Release log deletion error:', releaseLogError);

        // Then delete holding accounts
        const { error: holdingError } = await supabase
          .from('club_share_holding_account')
          .delete()
          .in('club_allocation_id', allocationIds);

        if (holdingError) throw holdingError;
      }

      // Delete allocations
      const { error: allocationDeleteError } = await supabase
        .from('club_share_allocations')
        .delete()
        .eq('import_batch_reference', batchReference);

      if (allocationDeleteError) throw allocationDeleteError;

      // Get club member IDs to potentially clean up
      const clubMemberIds = allocations?.map(a => a.club_member_id) || [];
      
      // Check if any club members have no more allocations and delete them if they're orphaned
      for (const memberId of clubMemberIds) {
        const { data: remainingAllocations } = await supabase
          .from('club_share_allocations')
          .select('id')
          .eq('club_member_id', memberId);

        if (!remainingAllocations || remainingAllocations.length === 0) {
          // Delete orphaned club member
          await supabase
            .from('investment_club_members')
            .delete()
            .eq('id', memberId);
        }
      }

      toast.success(`Batch ${batchReference} deleted successfully`);
      loadBatches();
      onBatchDeleted();
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
    } finally {
      setDeleting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusSummary = (statuses: { [key: string]: number }) => {
    return Object.entries(statuses).map(([status, count]) => (
      <Badge key={status} variant="outline" className="mr-1 mb-1">
        {status}: {count}
      </Badge>
    ));
  };

  if (loading) {
    return <div className="p-6">Loading batches...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Import Batch Management
        </CardTitle>
        <CardDescription>
          Manage and delete imported allocation batches (useful for removing duplicate imports)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No import batches found
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Reference</TableHead>
                  <TableHead>Allocations</TableHead>
                  <TableHead>Total Shares</TableHead>
                  <TableHead>Total Debt</TableHead>
                  <TableHead>Import Date</TableHead>
                  <TableHead>Status Summary</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.import_batch_reference}>
                    <TableCell className="font-mono text-sm">
                      {batch.import_batch_reference}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {batch.allocation_count}
                      </div>
                    </TableCell>
                    <TableCell>{batch.total_shares.toLocaleString()}</TableCell>
                    <TableCell>{formatCurrency(batch.total_debt)}</TableCell>
                    <TableCell>{formatDate(batch.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap">
                        {getStatusSummary(batch.statuses)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={deleting === batch.import_batch_reference}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deleting === batch.import_batch_reference ? 'Deleting...' : 'Delete'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              Delete Import Batch
                            </DialogTitle>
                            <DialogDescription>
                              This will permanently delete all allocations and related data for batch:
                              <br />
                              <code className="bg-muted p-1 rounded mt-2 block">
                                {batch.import_batch_reference}
                              </code>
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                              <h4 className="font-medium text-destructive mb-2">What will be deleted:</h4>
                              <ul className="text-sm text-destructive space-y-1">
                                <li>• {batch.allocation_count} club share allocations</li>
                                <li>• Associated holding account records</li>
                                <li>• Orphaned club member records (if no other allocations exist)</li>
                                <li>• Total shares: {batch.total_shares.toLocaleString()}</li>
                                <li>• Total debt value: {formatCurrency(batch.total_debt)}</li>
                              </ul>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline">Cancel</Button>
                              <Button 
                                variant="destructive" 
                                onClick={() => deleteBatch(batch.import_batch_reference)}
                                disabled={deleting === batch.import_batch_reference}
                              >
                                {deleting === batch.import_batch_reference ? 'Deleting...' : 'Confirm Delete'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClubBatchManager;
