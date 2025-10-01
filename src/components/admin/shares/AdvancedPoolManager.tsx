
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, PlusCircle, Settings, Users, Gift, Briefcase } from 'lucide-react';
import { useReferralTracking } from '@/hooks/useReferralTracking';

interface AdvancedPoolManagerProps {
  shareData: any;
  onUpdate: () => void;
  reserveAllocations: any[];
  onReserveUpdate: () => void;
}

const AdvancedPoolManager: React.FC<AdvancedPoolManagerProps> = ({
  shareData,
  onUpdate,
  reserveAllocations,
  onReserveUpdate
}) => {
  const { trackReferralCommission } = useReferralTracking();
  const [newReserve, setNewReserve] = useState({
    reserve_type: '',
    quantity: '',
    purpose: '',
    description: ''
  });
  const [issueForm, setIssueForm] = useState({
    user_id: '',
    quantity: '',
    issue_price: '',
    issue_type: '', // promotion, staff, negotiable
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  const handleCreateReserve = async () => {
    if (!newReserve.reserve_type || !newReserve.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const allocatedQuantity = parseInt(newReserve.quantity);

      const reserveData = {
        reserve_type: newReserve.reserve_type,
        allocated_quantity: allocatedQuantity,
        used_quantity: 0,
        remaining_quantity: allocatedQuantity,
        notes: `${newReserve.purpose} - ${newReserve.description}`,
        created_by: user.id
      };

      // Use type assertion to bypass TypeScript checking for new table
      const { error } = await (supabase as any)
        .from('share_reserve_tracking')
        .insert(reserveData);

      if (error) throw error;

      // Update main shares table reserved shares
      const totalReserved = reserveAllocations.reduce((sum, alloc) => sum + alloc.allocated_quantity, 0) + allocatedQuantity;
      
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          reserved_shares: totalReserved,
          available_shares: shareData.available_shares - allocatedQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      if (updateError) throw updateError;

      setNewReserve({
        reserve_type: '',
        quantity: '',
        purpose: '',
        description: ''
      });

      toast.success('Reserve allocation created successfully');
      onReserveUpdate();
      onUpdate();
    } catch (error) {
      console.error('Error creating reserve allocation:', error);
      toast.error('Failed to create reserve allocation');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueReserveShares = async () => {
    if (!issueForm.user_id || !issueForm.quantity || !issueForm.issue_price || !issueForm.issue_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const quantity = parseInt(issueForm.quantity);
      const issuePrice = parseFloat(issueForm.issue_price);

      // Create share transaction
      const { error: transactionError } = await supabase
        .from('share_transactions')
        .insert({
          user_id: issueForm.user_id,
          share_id: shareData.id,
          transaction_type: 'purchase',
          quantity: quantity,
          price_per_share: issuePrice,
          currency: shareData.currency,
          status: 'completed',
          source: 'admin_reserve',
          total_amount: quantity * issuePrice,
          transfer_reason: `${issueForm.issue_type} issue - ${issueForm.notes}`
        });

      if (transactionError) throw transactionError;

      // Track referral commission for the issued shares
      const totalAmount = quantity * issuePrice;
      const referralResult = await trackReferralCommission(
        issueForm.user_id,
        totalAmount,
        shareData.currency,
        'share_purchase'
      );
      
      if (referralResult.success && referralResult.commissionAmount) {
        console.log(`Referral commission tracked: ${shareData.currency} ${referralResult.commissionAmount.toLocaleString()}`);
      }

      // Update user shares
      const { error: userSharesError } = await supabase
        .from('user_shares')
        .upsert({
          user_id: issueForm.user_id,
          share_id: shareData.id,
          quantity: quantity,
          purchase_price_per_share: issuePrice,
          currency: shareData.currency
        });

      if (userSharesError) throw userSharesError;

      // Update reserved issued count
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          reserved_issued: (shareData.reserved_issued || 0) + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      if (updateError) throw updateError;

      setIssueForm({
        user_id: '',
        quantity: '',
        issue_price: '',
        issue_type: '',
        notes: ''
      });
      setShowIssueModal(false);

      toast.success(`Successfully issued ${quantity} shares`);
      onUpdate();
    } catch (error) {
      console.error('Error issuing reserve shares:', error);
      toast.error('Failed to issue shares from reserve');
    } finally {
      setLoading(false);
    }
  };

  const getIssueTypeIcon = (type: string) => {
    switch (type) {
      case 'promotion': return <Gift className="h-4 w-4" />;
      case 'staff': return <Briefcase className="h-4 w-4" />;
      case 'negotiable': return <Users className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Share Pool Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Share Pool Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {shareData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{shareData.total_shares.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Shares</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{shareData.available_shares.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{shareData.reserved_shares.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Reserved</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{(shareData.reserved_issued || 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Reserved Issued</div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Current Price:</span>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {shareData.currency} {shareData.price_per_share.toLocaleString()}
                  </Badge>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No share pool created yet
            </div>
          )}
        </CardContent>
      </Card>

      {shareData && (
        <>
          {/* Create Reserve Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Create Reserve Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Reserve Type</Label>
                <Select
                  value={newReserve.reserve_type}
                  onValueChange={(value) => setNewReserve({ ...newReserve, reserve_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reserve type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general_reserve">General Reserve</SelectItem>
                    <SelectItem value="promotion_pool">Promotion Pool</SelectItem>
                    <SelectItem value="staff_allocation">Staff Allocation</SelectItem>
                    <SelectItem value="strategic_reserve">Strategic Reserve</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    placeholder="Number of shares"
                    value={newReserve.quantity}
                    onChange={(e) => setNewReserve({ ...newReserve, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Purpose</Label>
                  <Input
                    placeholder="Purpose of this reserve"
                    value={newReserve.purpose}
                    onChange={(e) => setNewReserve({ ...newReserve, purpose: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Optional description"
                  value={newReserve.description}
                  onChange={(e) => setNewReserve({ ...newReserve, description: e.target.value })}
                />
              </div>

              <Button 
                onClick={handleCreateReserve}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Creating...' : 'Create Reserve'}
              </Button>
            </CardContent>
          </Card>

          {/* Reserve Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Reserve Management
                </div>
                <Button 
                  onClick={() => setShowIssueModal(true)}
                  className="flex items-center gap-2"
                >
                  <Gift className="h-4 w-4" />
                  Issue Shares
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reserveAllocations.length > 0 ? (
                  reserveAllocations.map((reserve) => (
                    <div key={reserve.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <Badge variant="outline" className="capitalize">
                            {reserve.reserve_type.replace('_', ' ')}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-1">
                            {reserve.notes}
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="font-medium">{reserve.allocated_quantity.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Allocated</div>
                        </div>

                        <div className="text-center">
                          <div className="font-medium text-green-600">{reserve.remaining_quantity.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Available</div>
                        </div>

                        <div className="text-center">
                          <div className="font-medium text-blue-600">{reserve.used_quantity.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Used</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No reserve allocations created yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Issue Shares Modal */}
          {showIssueModal && (
            <Card className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
              <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background p-6 shadow-lg duration-200">
                <CardHeader>
                  <CardTitle>Issue Reserve Shares</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>User ID/Email</Label>
                    <Input
                      placeholder="Enter user ID or email"
                      value={issueForm.user_id}
                      onChange={(e) => setIssueForm({ ...issueForm, user_id: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        placeholder="Number of shares"
                        value={issueForm.quantity}
                        onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Issue Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price per share"
                        value={issueForm.issue_price}
                        onChange={(e) => setIssueForm({ ...issueForm, issue_price: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Issue Type</Label>
                    <Select
                      value={issueForm.issue_type}
                      onValueChange={(value) => setIssueForm({ ...issueForm, issue_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promotion">
                          <div className="flex items-center gap-2">
                            {getIssueTypeIcon('promotion')}
                            Promotion Issue
                          </div>
                        </SelectItem>
                        <SelectItem value="staff">
                          <div className="flex items-center gap-2">
                            {getIssueTypeIcon('staff')}
                            Company Staff Issue
                          </div>
                        </SelectItem>
                        <SelectItem value="negotiable">
                          <div className="flex items-center gap-2">
                            {getIssueTypeIcon('negotiable')}
                            User Negotiable Issue
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Input
                      placeholder="Additional notes"
                      value={issueForm.notes}
                      onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleIssueReserveShares}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Issuing...' : 'Issue Shares'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowIssueModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AdvancedPoolManager;
