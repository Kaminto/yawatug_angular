import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Unlock, Users, TrendingUp, Calculator, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PendingAllocation {
  id: string;
  club_member_id: string;
  allocated_shares: number;
  member_name: string;
  email: string;
  phone: string;
  user_id: string;
}

const BatchBasedShareReleaseManager: React.FC = () => {
  const [pendingAllocations, setPendingAllocations] = useState<PendingAllocation[]>([]);
  const [totalPendingShares, setTotalPendingShares] = useState(0);
  const [releaseQuantity, setReleaseQuantity] = useState<number>(0);
  const [releaseReason, setReleaseReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<Array<{
    member_name: string;
    pending_shares: number;
    release_shares: number;
    percentage: number;
  }>>([]);

  useEffect(() => {
    loadPendingAllocations();
  }, []);

  useEffect(() => {
    calculatePreview();
  }, [releaseQuantity, pendingAllocations]);

  const loadPendingAllocations = async () => {
    try {
      const { data, error } = await supabase
        .from('club_share_allocations')
        .select(`
          id,
          club_member_id,
          allocated_shares,
          investment_club_members (
            id,
            member_name,
            email,
            phone,
            user_id
          )
        `)
        .eq('allocation_status', 'accepted')
        .not('investment_club_members.user_id', 'is', null);

      if (error) throw error;

      const allocations: PendingAllocation[] = data?.map(allocation => ({
        id: allocation.id,
        club_member_id: allocation.club_member_id,
        allocated_shares: allocation.allocated_shares,
        member_name: allocation.investment_club_members?.member_name || '',
        email: allocation.investment_club_members?.email || '',
        phone: allocation.investment_club_members?.phone || '',
        user_id: allocation.investment_club_members?.user_id || ''
      })) || [];

      // Filter out allocations that don't have user accounts linked
      const validAllocations = allocations.filter(allocation => allocation.user_id);

      setPendingAllocations(validAllocations);
      
      const total = validAllocations.reduce((sum, allocation) => sum + allocation.allocated_shares, 0);
      setTotalPendingShares(total);

    } catch (error) {
      console.error('Error loading pending allocations:', error);
      toast.error('Failed to load pending allocations');
    } finally {
      setLoading(false);
    }
  };

  const calculatePreview = () => {
    if (!releaseQuantity || totalPendingShares === 0) {
      setPreview([]);
      return;
    }

    const previewData = pendingAllocations.map(allocation => {
      const percentage = allocation.allocated_shares / totalPendingShares;
      const releaseShares = Math.floor(percentage * releaseQuantity);
      
      return {
        member_name: allocation.member_name,
        pending_shares: allocation.allocated_shares,
        release_shares: releaseShares,
        percentage: percentage * 100
      };
    });

    setPreview(previewData);
  };

  const getTotalReleaseShares = () => {
    return preview.reduce((sum, item) => sum + item.release_shares, 0);
  };

  const processBatchRelease = async () => {
    if (!releaseQuantity || releaseQuantity <= 0) {
      toast.error('Please enter a valid release quantity');
      return;
    }

    if (!releaseReason.trim()) {
      toast.error('Please provide a release reason');
      return;
    }

    if (pendingAllocations.length === 0) {
      toast.error('No pending allocations found');
      return;
    }

    setProcessing(true);
    try {
      let successCount = 0;
      
      for (const allocation of pendingAllocations) {
        try {
          const percentage = allocation.allocated_shares / totalPendingShares;
          const sharesToRelease = Math.floor(percentage * releaseQuantity);
          
          if (sharesToRelease <= 0) continue;

          // Create holding account entry
          const { data: holdingAccount, error: holdingError } = await supabase
            .from('club_share_holding_account')
            .insert({
              club_member_id: allocation.club_member_id,
              club_allocation_id: allocation.id,
              shares_quantity: sharesToRelease,
              shares_released: 0,
              shares_remaining: sharesToRelease,
              status: 'holding',
              expected_release_date: null
            })
            .select('id')
            .single();

          if (holdingError) throw holdingError;

          // Log the batch release
          const { error: logError } = await supabase
            .from('club_share_release_log')
            .insert({
              club_allocation_id: allocation.id,
              club_holding_account_id: holdingAccount.id,
              shares_released: sharesToRelease,
              release_percentage: (sharesToRelease / allocation.allocated_shares) * 100,
              release_trigger: 'bulk_release',
              release_reason: releaseReason,
              market_ratio_data: {
                total_pending_shares: totalPendingShares,
                total_release_quantity: releaseQuantity,
                member_ratio: percentage,
                batch_release_date: new Date().toISOString()
              }
            });

          if (logError) throw logError;

          // Update allocation status to indicate partial processing
          const { error: updateError } = await supabase
            .from('club_share_allocations')
            .update({
              allocation_status: 'pending_release'
            })
            .eq('id', allocation.id);

          if (updateError) throw updateError;

          successCount++;
        } catch (error) {
          console.error(`Error processing allocation ${allocation.id}:`, error);
        }
      }

      toast.success(`Batch release completed: ${successCount} allocations processed`);
      
      // Reset form and reload data
      setReleaseQuantity(0);
      setReleaseReason('');
      setPreview([]);
      loadPendingAllocations();

    } catch (error) {
      console.error('Batch release processing error:', error);
      toast.error('Failed to process batch release');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading pending allocations...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Members</p>
                <p className="text-2xl font-bold">{pendingAllocations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Pending Shares</p>
                <p className="text-2xl font-bold">{totalPendingShares.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calculator className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Release Quantity</p>
                <p className="text-2xl font-bold">{getTotalReleaseShares().toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {totalPendingShares > 0 ? `${((getTotalReleaseShares() / totalPendingShares) * 100).toFixed(1)}% of pending` : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Release Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Batch Release Management
          </CardTitle>
          <CardDescription>
            Release shares proportionally to club members based on their allocated amounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="release-quantity">Total Shares to Release</Label>
              <Input
                id="release-quantity"
                type="number"
                value={releaseQuantity}
                onChange={(e) => setReleaseQuantity(Number(e.target.value))}
                placeholder="Enter total shares to release"
                min="0"
                max={totalPendingShares}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum: {totalPendingShares.toLocaleString()} shares
              </p>
            </div>

            <div>
              <Label htmlFor="release-reason">Release Reason</Label>
              <Textarea
                id="release-reason"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                placeholder="Enter reason for this batch release"
                rows={3}
              />
            </div>
          </div>

          {preview.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Release Preview:</strong> {getTotalReleaseShares().toLocaleString()} shares will be allocated 
                to holding accounts across {preview.length} members. Shares will remain in holding accounts until 
                individually released to circulation.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={processBatchRelease}
            disabled={processing || !releaseQuantity || !releaseReason.trim() || pendingAllocations.length === 0}
            className="w-full"
          >
            {processing ? 'Processing Batch Release...' : 'Process Batch Release'}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Table */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Release Preview</CardTitle>
            <CardDescription>
              Proportional allocation of {releaseQuantity.toLocaleString()} shares
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Pending Shares</TableHead>
                  <TableHead>Share %</TableHead>
                  <TableHead>Release Shares</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.member_name}</TableCell>
                    <TableCell>{item.pending_shares.toLocaleString()}</TableCell>
                    <TableCell>{item.percentage.toFixed(2)}%</TableCell>
                    <TableCell className="font-bold text-primary">
                      {item.release_shares.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress 
                          value={(item.release_shares / item.pending_shares) * 100} 
                          className="w-20" 
                        />
                        <span className="text-xs text-muted-foreground">
                          {((item.release_shares / item.pending_shares) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Current Pending Allocations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Allocations</CardTitle>
          <CardDescription>
            Club members with accepted allocations ready for release
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingAllocations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Allocated Shares</TableHead>
                  <TableHead>Share %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingAllocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell className="font-medium">{allocation.member_name}</TableCell>
                    <TableCell>{allocation.email}</TableCell>
                    <TableCell>{allocation.allocated_shares.toLocaleString()}</TableCell>
                    <TableCell>
                      {totalPendingShares > 0 
                        ? ((allocation.allocated_shares / totalPendingShares) * 100).toFixed(2) 
                        : 0}%
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Ready for Release</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No pending allocations found. Members need to sign consent first.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchBasedShareReleaseManager;