import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, CheckCircle, Unlock, Upload, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ClubShareAllocation } from '@/interfaces/ClubShareInterfaces';
import ClubShareAllocationImporter from './ClubShareAllocationImporter';
import ClubBatchManager from './ClubBatchManager';

const ClubShareSimplifiedManager: React.FC = () => {
  const [allocations, setAllocations] = useState<ClubShareAllocation[]>([]);
  const [selectedAllocations, setSelectedAllocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    accepted: 0,
    totalShares: 0,
    totalFees: 0,
    totalDebt: 0
  });

  useEffect(() => {
    loadAllocations();
  }, []);

  const loadAllocations = async () => {
    try {
      const { data, error } = await supabase
        .from('club_share_allocations')
        .select(`
          *,
          investment_club_members (
            id,
            member_name,
            email,
            phone,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllocations(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading allocations:', error);
      toast.error('Failed to load allocations');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: ClubShareAllocation[]) => {
    const stats = {
      total: data.length,
      accepted: data.filter(a => a.allocation_status === 'accepted').length,
      totalShares: data.reduce((sum, a) => sum + a.allocated_shares, 0),
      totalFees: data.reduce((sum, a) => sum + a.transfer_fee_paid, 0),
      totalDebt: data.reduce((sum, a) => sum + a.debt_amount_settled, 0)
    };
    setStats(stats);
  };

  const handleReleaseShares = async () => {
    if (selectedAllocations.length === 0) {
      toast.error('Please select allocations to release');
      return;
    }

    setReleasing(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const allocationId of selectedAllocations) {
        try {
          const allocation = allocations.find(a => a.id === allocationId);
          if (!allocation) continue;

          // Check if holding account exists
          const { data: holdingAccount } = await supabase
            .from('club_share_holding_account')
            .select('*')
            .eq('club_allocation_id', allocationId)
            .single();

          if (!holdingAccount) {
            console.warn(`No holding account found for allocation ${allocationId}`);
            continue;
          }

          // Check if user_id exists
          if (!allocation.investment_club_members?.user_id) {
            console.warn(`No user_id for allocation ${allocationId}`);
            continue;
          }

          // Create user share holding - release all shares at once
          const { data: userShareHolding, error: userShareError } = await supabase
            .from('user_shares')
            .insert({
              user_id: allocation.investment_club_members.user_id,
              share_id: '00000000-0000-0000-0000-000000000000',
              quantity: holdingAccount.shares_remaining,
              purchase_price_per_share: 0,
              currency: 'UGX'
            })
            .select('id')
            .single();

          if (userShareError) throw userShareError;

          // Update holding account to fully released
          const { error: updateError } = await supabase
            .from('club_share_holding_account')
            .update({
              shares_released: holdingAccount.shares_quantity,
              status: 'fully_released'
            })
            .eq('id', holdingAccount.id);

          if (updateError) throw updateError;

          // Log the release
          const { error: logError } = await supabase
            .from('club_share_release_log')
            .insert({
              club_allocation_id: allocationId,
              club_holding_account_id: holdingAccount.id,
              shares_released: holdingAccount.shares_remaining,
              release_percentage: 100,
              release_trigger: 'manual_admin',
              release_reason: 'Admin bulk release',
              user_share_holding_id: userShareHolding.id
            });

          if (logError) throw logError;

          successCount++;
        } catch (error) {
          console.error(`Error processing allocation ${allocationId}:`, error);
          errorCount++;
        }
      }

      toast.success(`Release completed: ${successCount} successful, ${errorCount} errors`);
      setSelectedAllocations([]);
      loadAllocations();

    } catch (error) {
      console.error('Release error:', error);
      toast.error('Failed to release shares');
    } finally {
      setReleasing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      accepted: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      pending: { variant: 'outline', icon: AlertCircle, color: 'text-orange-600' },
      rejected: { variant: 'destructive', icon: AlertCircle, color: 'text-red-600' }
    };

    const config = variants[status as keyof typeof variants] || variants.accepted;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="h-3 w-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-6">Loading club share management...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Allocations</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Ready to Release</p>
                <p className="text-2xl font-bold">{stats.accepted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Shares</p>
                <p className="text-2xl font-bold">{stats.totalShares.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Debt Settled</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalDebt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview & Release</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="batches">Manage Batches</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Club Share Allocations</CardTitle>
              <CardDescription>
                Import allocations are automatically accepted. Select and release shares to users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedAllocations.length > 0 && (
                <div className="mb-4 p-4 bg-muted rounded-lg flex justify-between items-center">
                  <span>{selectedAllocations.length} allocations selected</span>
                  <Button 
                    onClick={handleReleaseShares} 
                    disabled={releasing}
                    className="flex items-center gap-2"
                  >
                    <Unlock className="h-4 w-4" />
                    {releasing ? 'Releasing...' : 'Release Shares'}
                  </Button>
                </div>
              )}

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAllocations(allocations.filter(a => a.allocation_status === 'accepted').map(a => a.id));
                            } else {
                              setSelectedAllocations([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Shares</TableHead>
                      <TableHead>Transfer Fee</TableHead>
                      <TableHead>Debt Settled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Import Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell>
                          {allocation.allocation_status === 'accepted' && (
                            <input 
                              type="checkbox" 
                              checked={selectedAllocations.includes(allocation.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAllocations([...selectedAllocations, allocation.id]);
                                } else {
                                  setSelectedAllocations(selectedAllocations.filter(id => id !== allocation.id));
                                }
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {allocation.investment_club_members?.member_name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{allocation.investment_club_members?.email}</div>
                            <div className="text-muted-foreground">
                              {allocation.investment_club_members?.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{allocation.allocated_shares.toLocaleString()}</TableCell>
                        <TableCell>{formatCurrency(allocation.transfer_fee_paid)}</TableCell>
                        <TableCell>{formatCurrency(allocation.debt_amount_settled)}</TableCell>
                        <TableCell>{getStatusBadge(allocation.allocation_status)}</TableCell>
                        <TableCell>{formatDate(allocation.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <ClubShareAllocationImporter onImportComplete={loadAllocations} />
        </TabsContent>

        <TabsContent value="batches">
          <ClubBatchManager onBatchDeleted={loadAllocations} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClubShareSimplifiedManager;