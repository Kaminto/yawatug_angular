import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Minus, TrendingUp, AlertTriangle, History } from 'lucide-react';

interface ShareData {
  id: string;
  name: string;
  total_shares: number;
  available_shares: number;
  price_per_share: number;
  currency: string;
  issued_shares?: number;
}

interface ShareCreationManagerProps {
  shareData: ShareData;
  onUpdate: () => void;
}

interface ShareAdjustmentHistory {
  id: string;
  adjustment_type: 'increase' | 'decrease';
  quantity_changed: number;
  previous_total: number;
  new_total: number;
  reason: string;
  created_at: string;
  created_by: string;
  profiles?: {
    full_name: string;
  };
}

const ShareCreationManager: React.FC<ShareCreationManagerProps> = ({ 
  shareData, 
  onUpdate 
}) => {
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ShareAdjustmentHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const issuedShares = shareData.total_shares - shareData.available_shares;
  const canDecrease = shareData.total_shares - adjustmentQuantity >= issuedShares;

  useEffect(() => {
    loadAdjustmentHistory();
  }, [shareData.id]);

  const loadAdjustmentHistory = async () => {
    try {
      // Temporarily disable history loading until types are updated
      // This will prevent errors while the database types refresh
      setHistory([]);
    } catch (error) {
      console.error('Error loading adjustment history:', error);
      setHistory([]);
    }
  };

  const handleAdjustment = async (type: 'increase' | 'decrease') => {
    if (adjustmentQuantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (type === 'decrease' && !canDecrease) {
      toast.error(`Cannot decrease below issued shares (${issuedShares.toLocaleString()})`);
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for this adjustment');
      return;
    }

    setLoading(true);
    try {
      const previousTotal = shareData.total_shares;
      const newTotal = type === 'increase' 
        ? previousTotal + adjustmentQuantity 
        : previousTotal - adjustmentQuantity;

      // Update the shares table
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          total_shares: newTotal,
          available_shares: shareData.available_shares + (type === 'increase' ? adjustmentQuantity : -adjustmentQuantity),
          updated_at: new Date().toISOString()
        })
        .eq('id', shareData.id);

      if (updateError) throw updateError;

      // Record the adjustment in history - temporarily use direct insert
      // This will be updated once the database types refresh
      try {
        const { data: currentUser } = await supabase.auth.getUser();
        
        // For now, we'll record in admin_actions as an alternative
        await supabase.from('admin_actions').insert({
          user_id: shareData.id, // Using share_id as reference
          admin_id: currentUser.user?.id,
          action_type: `share_pool_${type}`,
          reason: `${type} shares by ${adjustmentQuantity}: ${reason.trim()}`
        });
        
        // TODO: Replace with share_pool_adjustments insert once types are updated
      } catch (historyError) {
        console.error('Error recording adjustment history:', historyError);
        // Don't fail the transaction if history recording fails
      }

      toast.success(
        `Successfully ${type}d pool by ${adjustmentQuantity.toLocaleString()} shares`
      );

      // Reset form
      setAdjustmentQuantity(0);
      setReason('');
      
      // Reload data
      onUpdate();
      loadAdjustmentHistory();
    } catch (error) {
      console.error('Error adjusting share pool:', error);
      toast.error('Failed to adjust share pool');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Pool Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {shareData.total_shares.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Total Pool Size</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {shareData.available_shares.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Available for Sale</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {issuedShares.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Issued Shares</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {shareData.currency} {shareData.price_per_share.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Current Price</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pool Adjustment Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Adjust Share Pool Size
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Pool adjustments affect total share count. 
              Cannot reduce below {issuedShares.toLocaleString()} issued shares.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Adjustment Quantity</Label>
              <Input
                type="number"
                min="1"
                value={adjustmentQuantity || ''}
                onChange={(e) => setAdjustmentQuantity(Number(e.target.value))}
                placeholder="Enter number of shares"
              />
            </div>

            <div>
              <Label>Reason for Adjustment</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Board approval for pool expansion"
              />
            </div>
          </div>

          {adjustmentQuantity > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Preview Changes:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Current Total:</span>
                  <span className="ml-2 font-medium">{shareData.total_shares.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">New Total (Increase):</span>
                  <span className="ml-2 font-medium text-green-600">
                    {(shareData.total_shares + adjustmentQuantity).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Available After Increase:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {(shareData.available_shares + adjustmentQuantity).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">New Total (Decrease):</span>
                  <span className={`ml-2 font-medium ${canDecrease ? 'text-orange-600' : 'text-red-600'}`}>
                    {(shareData.total_shares - adjustmentQuantity).toLocaleString()}
                  </span>
                  {!canDecrease && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Not Allowed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={() => handleAdjustment('increase')}
              disabled={loading || adjustmentQuantity <= 0 || !reason.trim()}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Increase Pool (+{adjustmentQuantity.toLocaleString()})
            </Button>

            <Button
              onClick={() => handleAdjustment('decrease')}
              disabled={loading || adjustmentQuantity <= 0 || !reason.trim() || !canDecrease}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Minus className="h-4 w-4" />
              Decrease Pool (-{adjustmentQuantity.toLocaleString()})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Adjustment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Adjustment History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity Changed</TableHead>
                  <TableHead>Previous Total</TableHead>
                  <TableHead>New Total</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.adjustment_type === 'increase' ? 'default' : 'destructive'}>
                        {record.adjustment_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={record.adjustment_type === 'increase' ? 'text-green-600' : 'text-red-600'}>
                        {record.adjustment_type === 'increase' ? '+' : '-'}
                        {record.quantity_changed.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>{record.previous_total.toLocaleString()}</TableCell>
                    <TableCell>{record.new_total.toLocaleString()}</TableCell>
                    <TableCell>{record.reason}</TableCell>
                    <TableCell>{(record as any).profiles?.full_name || 'Unknown'}</TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No adjustment history found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ShareCreationManager;