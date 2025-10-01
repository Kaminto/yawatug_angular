import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShareData } from '@/types/custom';
import { Calculator, Plus, Minus, AlertTriangle, Activity, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { useReferralTracking } from '@/hooks/useReferralTracking';
import PoolValidationRules from './PoolValidationRules';
import PoolAuditLog from './PoolAuditLog';
import PoolStatsDashboard from './PoolStatsDashboard';

interface EnhancedSharePoolManagerProps {
  shareData?: ShareData | null;
  onUpdate: () => Promise<void>;
}

interface DropdownUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

const EnhancedSharePoolManager: React.FC<EnhancedSharePoolManagerProps> = ({ shareData, onUpdate }) => {
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'add',
    quantity: '',
    reason: ''
  });
  const [reserveForm, setReserveForm] = useState({
    percentage: '',
    reason: ''
  });
  const [issueForm, setIssueForm] = useState({
    quantity: '',
    pricePerShare: shareData?.price_per_share || 0,
    reason: '',
    recipientId: ''
  });
  const [loading, setLoading] = useState(false);
  const [poolStats, setPoolStats] = useState({
    totalSold: 0,
    reserveIssued: 0,
    availableForSale: 0
  });
  const [users, setUsers] = useState<DropdownUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { toast: useSonnerToast } = useToast();
  const { trackReferralCommission } = useReferralTracking();

  useEffect(() => {
    console.log('EnhancedSharePoolManager: shareData prop updated:', shareData);
    if (shareData) {
      setIssueForm(prev => ({ ...prev, pricePerShare: shareData.price_per_share }));
      loadPoolStats();
    }
    fetchUsersForDropdown();
  }, [shareData]);

  const fetchUsersForDropdown = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name', { ascending: true })
        .limit(25);

      if (error) {
        console.error('Error loading users:', error);
        useSonnerToast({ title: "Error", description: 'Failed to load users for reserve issue.', variant: "destructive" });
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Unexpected error loading users:', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadPoolStats = async () => {
    if (!shareData) return;
    
    try {
      // Calculate sold shares from completed transactions
      const { data: soldData } = await supabase
        .from('share_transactions')
        .select('quantity')
        .eq('transaction_type', 'purchase')
        .eq('status', 'completed');

      const totalSold = soldData?.reduce((sum, tx) => sum + tx.quantity, 0) || 0;
      const reserveIssued = shareData.reserved_issued || 0;
      const availableForSale = shareData.total_shares - (shareData.reserved_shares || 0);

      setPoolStats({ totalSold, reserveIssued, availableForSale });
    } catch (error) {
      console.error('Error loading pool stats:', error);
    }
  };

  const handlePoolAdjustment = async () => {
    if (!shareData || !shareData.id || !adjustmentForm.quantity) {
      useSonnerToast({ title: "Error", description: 'Share data or quantity is missing for adjustment.', variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const quantity = parseInt(adjustmentForm.quantity);
      if (quantity <= 0) {
        useSonnerToast({ title: "Error", description: 'Quantity must be greater than 0', variant: "destructive" });
        setLoading(false); return;
      }

      let newTotal: number;
      let newReserved: number = shareData.reserved_shares || 0;
      let newAvailable: number;

      if (adjustmentForm.type === 'add') {
        newTotal = shareData.total_shares + quantity;
      } else {
        newTotal = shareData.total_shares - quantity;
        const minimumRequired = (shareData.reserved_shares || 0) + poolStats.totalSold;
        if (newTotal < minimumRequired) {
          useSonnerToast({ title: "Error", description: `Cannot reduce pool below ${minimumRequired} shares (reserved + sold shares)`, variant: "destructive" });
          setLoading(false); return;
        }
      }
      newAvailable = newTotal - newReserved;

      const updatePayload = {
        total_shares: newTotal,
        available_shares: newAvailable,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('shares')
        .update(updatePayload)
        .eq('id', shareData.id);

      if (error) {
        useSonnerToast({ title: "Error", description: error.message || 'Failed to adjust pool', variant: "destructive" });
        setLoading(false); return;
      }
      useSonnerToast({ title: "Success", description: `Pool ${adjustmentForm.type === 'add' ? 'increased' : 'decreased'} by ${quantity.toLocaleString()} shares` });

      setAdjustmentForm({ type: 'add', quantity: '', reason: '' });

      // Properly refresh ALL relevant state & UI immediately after mutation
      await onUpdate();
      await loadPoolStats();
    } catch (error: any) {
      useSonnerToast({ title: "Error", description: error.message || 'Failed to adjust pool', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReserveUpdate = async () => {
    if (!shareData || !shareData.id || !reserveForm.percentage) {
      useSonnerToast({ title: "Error", description: 'Share data or percentage is missing for reserve update.', variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const percentage = parseFloat(reserveForm.percentage);
      if (percentage < 0 || percentage > 50) {
        useSonnerToast({ title: "Error", description: 'Reserve percentage must be between 0% and 50%', variant: "destructive" });
        setLoading(false); return;
      }
      const newReserved = Math.floor((shareData.total_shares * percentage) / 100);
      const newAvailable = shareData.total_shares - newReserved;

      const updatePayload = {
        reserved_shares: newReserved,
        available_shares: newAvailable,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('shares')
        .update(updatePayload)
        .eq('id', shareData.id);

      if (error) {
        useSonnerToast({ title: "Error", description: error.message || 'Failed to update reserves', variant: "destructive" });
        setLoading(false); return;
      }
      useSonnerToast({ title: "Success", description: `Reserve percentage set to ${percentage}% (${newReserved.toLocaleString()} shares)` });

      setReserveForm({ percentage: '', reason: '' });

      await onUpdate();
      await loadPoolStats();
    } catch (error: any) {
      useSonnerToast({ title: "Error", description: error.message || 'Failed to update reserves', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReserveIssue = async () => {
    if (!shareData || !shareData.id || !issueForm.quantity || !issueForm.recipientId) {
      useSonnerToast({ title: "Error", description: 'Share data, recipient, or quantity is missing for reserve issue.', variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const quantity = parseInt(issueForm.quantity);
      const availableReserve = (shareData.reserved_shares || 0) - (shareData.reserved_issued || 0);

      if (quantity <= 0) {
        useSonnerToast({ title: "Error", description: 'Quantity must be greater than 0', variant: "destructive" });
        setLoading(false); return;
      }
      if (quantity > availableReserve) {
        useSonnerToast({ title: "Error", description: `Cannot issue ${quantity} shares. Only ${availableReserve} available in reserve`, variant: "destructive" });
        setLoading(false); return;
      }

      // First, check current user auth status and role
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth error:', authError);
        useSonnerToast({ title: "Authentication Error", description: "Please ensure you're logged in as an admin", variant: "destructive" });
        setLoading(false); return;
      }

      // Create reserve allocation with better error handling
      console.log('Creating reserve allocation for quantity:', quantity);
      const { error: allocError, data: allocData } = await supabase
        .from('share_reserve_allocations')
        .insert({
          quantity,
          percentage: (quantity / shareData.total_shares) * 100,
          purpose: 'Direct Issue',
          description: issueForm.reason || 'Direct issue from reserve'
        })
        .select()
        .single();

      if (allocError) {
        console.error("Reserve allocation error:", allocError);
        useSonnerToast({ title: "Reserve Allocation Failed", description: allocError.message || 'Failed to allocate reserve. Please check admin permissions.', variant: "destructive" });
        setLoading(false); return;
      }

      console.log("Reserve allocation created successfully:", allocData);

      // Update reserved_issued
      const newReservedIssued = (shareData.reserved_issued || 0) + quantity;
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          reserved_issued: newReservedIssued,
          updated_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      if (updateError) {
        console.error("Update reserved_issued error:", updateError);
        useSonnerToast({ title: "Update Error", description: updateError.message || 'Failed to update reserved issued count', variant: "destructive" });
        setLoading(false); return;
      }

      // Record the share transaction
      const { error: txError } = await supabase
        .from('share_transactions')
        .insert({
          share_id: shareData.id,
          user_id: issueForm.recipientId,
          quantity,
          price_per_share: issueForm.pricePerShare,
          currency: shareData.currency,
          transaction_type: 'purchase',
          status: 'completed',
          source: 'admin_issued',
          total_amount: quantity * issueForm.pricePerShare,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (txError) {
        console.error("Transaction record error:", txError);
        useSonnerToast({ title: "Transaction Warning", description: "Shares issued but transaction record failed: " + (txError.message || 'Unknown error'), variant: "destructive" });
      } else {
        // Track referral commission for the issued shares
        const totalAmount = quantity * issueForm.pricePerShare;
        const referralResult = await trackReferralCommission(
          issueForm.recipientId,
          totalAmount,
          shareData.currency,
          'share_purchase'
        );
        
        if (referralResult.success && referralResult.commissionAmount) {
          console.log(`Referral commission tracked: ${shareData.currency} ${referralResult.commissionAmount.toLocaleString()}`);
        }
      }

      useSonnerToast({ title: "Success", description: `Successfully issued ${quantity.toLocaleString()} reserve shares to recipient.` });

      setIssueForm({ quantity: '', pricePerShare: shareData?.price_per_share || 0, reason: '', recipientId: '' });

      // Refresh data
      await onUpdate();
      await loadPoolStats();
    } catch (error: any) {
      console.error("Unexpected error in handleReserveIssue:", error);
      useSonnerToast({ title: "Unexpected Error", description: error.message || 'An unexpected error occurred while issuing reserve shares', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = () => {
    if (!shareData) return {};
    
    const reservePercentage = ((shareData.reserved_shares || 0) / shareData.total_shares) * 100;
    const issuedPercentage = ((shareData.reserved_issued || 0) / (shareData.reserved_shares || 1)) * 100;
    const availableReserve = (shareData.reserved_shares || 0) - (shareData.reserved_issued || 0);
    
    return { reservePercentage, issuedPercentage, availableReserve };
  };

  const metrics = calculateMetrics();

  if (!shareData) {
    return (
      <Card>
        <CardHeader><CardTitle>Share Pool Management</CardTitle></CardHeader>
        <CardContent><p>No share data available to manage. Please create or load a share pool.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Pool Management Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="adjust">Adjust Pool</TabsTrigger>
          <TabsTrigger value="reserve">Set Reserve</TabsTrigger>
          <TabsTrigger value="issue">Issue Reserve</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <PoolStatsDashboard shareData={shareData} />
            <PoolValidationRules shareData={shareData} />
          </div>
        </TabsContent>

        <TabsContent value="adjust">
          <Card>
            <CardHeader>
              <CardTitle>Pool Size Adjustment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PoolValidationRules 
                shareData={shareData}
                pendingChanges={{
                  totalShares: adjustmentForm.quantity ? 
                    shareData.total_shares + (adjustmentForm.type === 'add' ? 1 : -1) * parseInt(adjustmentForm.quantity) : 
                    undefined
                }}
              />
              
              <div className="flex space-x-4">
                <Button
                  variant={adjustmentForm.type === 'add' ? 'default' : 'outline'}
                  onClick={() => setAdjustmentForm(prev => ({ ...prev, type: 'add' }))}
                  className="flex items-center"
                  disabled={loading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Shares
                </Button>
                <Button
                  variant={adjustmentForm.type === 'subtract' ? 'default' : 'outline'}
                  onClick={() => setAdjustmentForm(prev => ({ ...prev, type: 'subtract' }))}
                  className="flex items-center"
                  disabled={loading}
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Remove Shares
                </Button>
              </div>

              <div>
                <Label htmlFor="adjQuantity">Quantity</Label>
                <Input
                  id="adjQuantity"
                  type="number"
                  value={adjustmentForm.quantity}
                  onChange={(e) => setAdjustmentForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter number of shares"
                  min="1"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="adjReason">Reason</Label>
                <Input
                  id="adjReason"
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Reason for adjustment"
                  disabled={loading}
                />
              </div>

              <Button 
                onClick={handlePoolAdjustment} 
                disabled={loading || !adjustmentForm.quantity}
                className="w-full"
              >
                {loading ? 'Processing...' : `${adjustmentForm.type === 'add' ? 'Add' : 'Remove'} Shares`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reserve">
          <Card>
            <CardHeader>
              <CardTitle>Reserve Percentage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PoolValidationRules 
                shareData={shareData}
                pendingChanges={{
                  reservedShares: reserveForm.percentage ? 
                    Math.floor((shareData.total_shares * parseFloat(reserveForm.percentage)) / 100) : 
                    undefined,
                  availableShares: reserveForm.percentage ? 
                    shareData.total_shares - Math.floor((shareData.total_shares * parseFloat(reserveForm.percentage)) / 100) : 
                    undefined
                }}
              />

              <div>
                <Label htmlFor="reservePercentage">Reserve Percentage (%)</Label>
                <Input
                  id="reservePercentage"
                  type="number"
                  step="0.1"
                  max="50"
                  min="0"
                  value={reserveForm.percentage}
                  onChange={(e) => setReserveForm(prev => ({ ...prev, percentage: e.target.value }))}
                  placeholder="Enter percentage (0-50%)"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="reserveReason">Reason</Label>
                <Input
                  id="reserveReason"
                  value={reserveForm.reason}
                  onChange={(e) => setReserveForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Reason for reserve adjustment"
                  disabled={loading}
                />
              </div>

              {reserveForm.percentage && shareData && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-200">
                    {parseFloat(reserveForm.percentage)}% of {shareData.total_shares.toLocaleString()} shares = {Math.floor((shareData.total_shares * parseFloat(reserveForm.percentage)) / 100).toLocaleString()} shares reserved
                  </p>
                </div>
              )}

              <Button 
                onClick={handleReserveUpdate} 
                disabled={loading || !reserveForm.percentage}
                className="w-full"
              >
                {loading ? 'Updating...' : 'Set Reserve Percentage'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issue">
          <Card>
            <CardHeader>
              <CardTitle>Issue from Reserve</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
                <p className="text-purple-800 dark:text-purple-200">
                  Available in Reserve: {(metrics.availableReserve || 0).toLocaleString()} shares
                </p>
              </div>
            
              <div>
                <Label htmlFor="recipientId">Recipient</Label>
                <Select
                  value={issueForm.recipientId}
                  onValueChange={(v) => setIssueForm(prev => ({ ...prev, recipientId: v }))}
                  disabled={loading || loadingUsers}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingUsers ? 'Loading users...' : 'Select recipient'} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email || u.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            
              <div>
                <Label htmlFor="issueQuantity">Quantity to Issue</Label>
                <Input
                  id="issueQuantity"
                  type="number"
                  max={metrics.availableReserve || 0}
                  min="1"
                  value={issueForm.quantity}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter number of shares to issue"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="issuePrice">Price per Share ({shareData.currency})</Label>
                <Input
                  id="issuePrice"
                  type="number"
                  value={issueForm.pricePerShare}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, pricePerShare: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="issueReason">Reason/Purpose</Label>
                <Input
                  id="issueReason"
                  value={issueForm.reason}
                  onChange={(e) => setIssueForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Purpose of this issue"
                  disabled={loading}
                />
              </div>

              {issueForm.quantity && (
                <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                  <p className="text-green-800 dark:text-green-200">
                    Total Value: {shareData.currency} {(parseInt(issueForm.quantity || '0') * issueForm.pricePerShare).toLocaleString()}
                  </p>
                </div>
              )}

              <Button 
                onClick={handleReserveIssue} 
                disabled={
                  loading ||
                  !issueForm.quantity ||
                  !issueForm.recipientId ||
                  (metrics.availableReserve || 0) < parseInt(issueForm.quantity || '0')
                }
                className="w-full"
              >
                {loading ? 'Issuing...' : 'Issue from Reserve'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <PoolAuditLog shareId={shareData.id} limit={20} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedSharePoolManager;
