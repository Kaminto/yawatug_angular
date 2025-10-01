import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Package, 
  Users, 
  DollarSign, 
  ArrowRight, 
  Upload,
  Download,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  FileText,
  Filter,
  TrendingUp
} from 'lucide-react';

interface BulkOperation {
  id: string;
  type: 'share_issuance' | 'price_adjustment' | 'buyback_processing' | 'dividend_distribution';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  parameters: any;
  results?: any;
}

interface ShareIssuanceData {
  userId: string;
  userName: string;
  email: string;
  quantity: number;
  pricePerShare: number;
  totalValue: number;
  notes?: string;
}

interface PriceAdjustmentData {
  shareId: string;
  shareName: string;
  currentPrice: number;
  newPrice: number;
  adjustmentPercent: number;
  effectiveDate: string;
}

interface BuybackBatch {
  orderId: string;
  userId: string;
  userName: string;
  quantity: number;
  requestedPrice: number;
  priority: number;
  requestDate: string;
}

const BulkOperationsManager: React.FC = () => {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [activeOperation, setActiveOperation] = useState<BulkOperation | null>(null);
  const [shareIssuanceData, setShareIssuanceData] = useState<ShareIssuanceData[]>([]);
  const [priceAdjustments, setPriceAdjustments] = useState<PriceAdjustmentData[]>([]);
  const [buybackBatch, setBuybackBatch] = useState<BuybackBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadOperations();
    const interval = setInterval(loadOperations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadOperations = async () => {
    try {
      const { data } = await supabase
        .from('admin_payment_settings')
        .select('*')
        .like('setting_name', 'bulk_operation_%')
        .order('created_at', { ascending: false });

      const ops: BulkOperation[] = [];
      data?.forEach(setting => {
        try {
          const operation = JSON.parse(setting.setting_value);
          ops.push({
            ...operation,
            id: setting.id,
            createdBy: setting.created_by || 'system',
            createdAt: setting.created_at
          });
        } catch (error) {
          console.error('Error parsing operation:', error);
        }
      });

      setOperations(ops);
      
      const active = ops.find(op => op.status === 'in_progress');
      setActiveOperation(active || null);
    } catch (error) {
      console.error('Error loading operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShareIssuancePreview = async () => {
    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_verified')
        .eq('is_verified', true)
        .limit(50);

      const { data: shareData } = await supabase
        .from('shares')
        .select('price_per_share')
        .single();

      const currentPrice = shareData?.price_per_share || 0;

      const previewData: ShareIssuanceData[] = (users || []).map(user => ({
        userId: user.id,
        userName: user.full_name || 'Unknown',
        email: user.email || '',
        quantity: 10,
        pricePerShare: currentPrice,
        totalValue: 10 * currentPrice,
        notes: ''
      }));

      setShareIssuanceData(previewData);
    } catch (error) {
      console.error('Error loading share issuance preview:', error);
    }
  };

  const loadPriceAdjustmentPreview = async () => {
    try {
      const { data: shares } = await supabase
        .from('shares')
        .select('id, name, price_per_share');

      const adjustments: PriceAdjustmentData[] = (shares || []).map(share => {
        const adjustmentPercent = 5;
        const newPrice = share.price_per_share * (1 + adjustmentPercent / 100);
        
        return {
          shareId: share.id,
          shareName: share.name,
          currentPrice: share.price_per_share,
          newPrice: Math.round(newPrice),
          adjustmentPercent,
          effectiveDate: new Date().toISOString().split('T')[0]
        };
      });

      setPriceAdjustments(adjustments);
    } catch (error) {
      console.error('Error loading price adjustment preview:', error);
    }
  };

  const loadBuybackBatch = async () => {
    try {
      const { data: orders } = await supabase
        .from('share_buyback_orders')
        .select(`
          id,
          user_id,
          quantity,
          requested_price,
          created_at,
          fifo_position,
          profiles:user_id(full_name)
        `)
        .eq('status', 'pending')
        .order('fifo_position', { ascending: true })
        .limit(50);

      const batch: BuybackBatch[] = (orders || []).map((order, index) => ({
        orderId: order.id,
        userId: order.user_id,
        userName: order.profiles?.full_name || 'Unknown',
        quantity: order.quantity,
        requestedPrice: order.requested_price,
        priority: order.fifo_position || index + 1,
        requestDate: order.created_at
      }));

      setBuybackBatch(batch);
    } catch (error) {
      console.error('Error loading buyback batch:', error);
    }
  };

  const startBulkShareIssuance = async () => {
    if (shareIssuanceData.length === 0) {
      toast.error('No share issuance data available');
      return;
    }

    setProcessing(true);
    try {
      const operationId = `bulk_operation_${Date.now()}`;
      const operation: BulkOperation = {
        id: operationId,
        type: 'share_issuance',
        status: 'in_progress',
        progress: 0,
        totalItems: shareIssuanceData.length,
        processedItems: 0,
        failedItems: 0,
        createdBy: (await supabase.auth.getUser()).data.user?.id || 'admin',
        createdAt: new Date().toISOString(),
        parameters: { shareIssuanceData }
      };

      await supabase
        .from('admin_payment_settings')
        .insert({
          setting_name: operationId,
          setting_value: JSON.stringify(operation)
        });

      let processed = 0;
      let failed = 0;

      // Get current share data
      const { data: currentShare } = await supabase
        .from('shares')
        .select('id')
        .single();

      for (const issuance of shareIssuanceData) {
        try {
          // Check if user already has shares
          const { data: existingHolding } = await supabase
            .from('user_share_holdings')
            .select('quantity')
            .eq('user_id', issuance.userId)
            .eq('share_id', currentShare?.id)
            .single();

          if (existingHolding) {
            // Update existing holding
            await supabase
              .from('user_share_holdings')
              .update({ 
                quantity: existingHolding.quantity + issuance.quantity,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', issuance.userId)
              .eq('share_id', currentShare?.id);
          } else {
            // Create new holding - fix the insert structure
            await supabase
              .from('user_share_holdings')
              .insert({
                user_id: issuance.userId,
                share_id: currentShare?.id,
                quantity: issuance.quantity,
                purchase_price: issuance.pricePerShare,
                average_buy_price: issuance.pricePerShare,
                total_invested: issuance.totalValue
              });
          }

          processed++;
        } catch (error) {
          console.error('Error processing share issuance:', error);
          failed++;
        }

        const progress = ((processed + failed) / shareIssuanceData.length) * 100;
        const updatedOperation = {
          ...operation,
          progress: Math.round(progress),
          processedItems: processed,
          failedItems: failed,
          status: progress === 100 ? 'completed' : 'in_progress',
          completedAt: progress === 100 ? new Date().toISOString() : undefined
        };

        await supabase
          .from('admin_payment_settings')
          .update({ setting_value: JSON.stringify(updatedOperation) })
          .eq('setting_name', operationId);
      }

      toast.success(`Bulk share issuance completed. ${processed} successful, ${failed} failed.`);
      await loadOperations();
    } catch (error) {
      console.error('Error in bulk share issuance:', error);
      toast.error('Failed to complete bulk share issuance');
    } finally {
      setProcessing(false);
    }
  };

  const startBulkPriceAdjustment = async () => {
    if (priceAdjustments.length === 0) {
      toast.error('No price adjustments configured');
      return;
    }

    setProcessing(true);
    try {
      const operationId = `bulk_operation_${Date.now()}`;
      const operation: BulkOperation = {
        id: operationId,
        type: 'price_adjustment',
        status: 'in_progress',
        progress: 0,
        totalItems: priceAdjustments.length,
        processedItems: 0,
        failedItems: 0,
        createdBy: (await supabase.auth.getUser()).data.user?.id || 'admin',
        createdAt: new Date().toISOString(),
        parameters: { priceAdjustments }
      };

      // Save operation
      await supabase
        .from('admin_payment_settings')
        .insert({
          setting_name: operationId,
          setting_value: JSON.stringify(operation)
        });

      // Process price adjustments
      let processed = 0;
      let failed = 0;

      for (const adjustment of priceAdjustments) {
        try {
          await supabase
            .from('shares')
            .update({ 
              price_per_share: adjustment.newPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', adjustment.shareId);

          processed++;
        } catch (error) {
          console.error('Error processing price adjustment:', error);
          failed++;
        }

        // Update progress
        const progress = ((processed + failed) / priceAdjustments.length) * 100;
        const updatedOperation = {
          ...operation,
          progress: Math.round(progress),
          processedItems: processed,
          failedItems: failed,
          status: progress === 100 ? 'completed' : 'in_progress',
          completedAt: progress === 100 ? new Date().toISOString() : undefined
        };

        await supabase
          .from('admin_payment_settings')
          .update({ setting_value: JSON.stringify(updatedOperation) })
          .eq('setting_name', operationId);
      }

      toast.success(`Bulk price adjustment completed. ${processed} successful, ${failed} failed.`);
      await loadOperations();
    } catch (error) {
      console.error('Error in bulk price adjustment:', error);
      toast.error('Failed to complete bulk price adjustment');
    } finally {
      setProcessing(false);
    }
  };

  const processBuybackBatch = async () => {
    if (buybackBatch.length === 0) {
      toast.error('No buyback orders to process');
      return;
    }

    setProcessing(true);
    try {
      const operationId = `bulk_operation_${Date.now()}`;
      const operation: BulkOperation = {
        id: operationId,
        type: 'buyback_processing',
        status: 'in_progress',
        progress: 0,
        totalItems: buybackBatch.length,
        processedItems: 0,
        failedItems: 0,
        createdBy: (await supabase.auth.getUser()).data.user?.id || 'admin',
        createdAt: new Date().toISOString(),
        parameters: { buybackBatch }
      };

      // Save operation
      await supabase
        .from('admin_payment_settings')
        .insert({
          setting_name: operationId,
          setting_value: JSON.stringify(operation)
        });

      // Process buyback orders
      let processed = 0;
      let failed = 0;

      for (const order of buybackBatch) {
        try {
          await supabase
            .from('share_buyback_orders')
            .update({ 
              status: 'approved',
              updated_at: new Date().toISOString()
            })
            .eq('id', order.orderId);

          processed++;
        } catch (error) {
          console.error('Error processing buyback order:', error);
          failed++;
        }

        // Update progress
        const progress = ((processed + failed) / buybackBatch.length) * 100;
        const updatedOperation = {
          ...operation,
          progress: Math.round(progress),
          processedItems: processed,
          failedItems: failed,
          status: progress === 100 ? 'completed' : 'in_progress',
          completedAt: progress === 100 ? new Date().toISOString() : undefined
        };

        await supabase
          .from('admin_payment_settings')
          .update({ setting_value: JSON.stringify(updatedOperation) })
          .eq('setting_name', operationId);
      }

      toast.success(`Bulk buyback processing completed. ${processed} successful, ${failed} failed.`);
      await loadOperations();
    } catch (error) {
      console.error('Error in bulk buyback processing:', error);
      toast.error('Failed to complete bulk buyback processing');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-center">
          <Package className="h-8 w-8 mx-auto mb-2" />
          <p>Loading bulk operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Bulk Operations Manager
        </h2>
        {activeOperation && (
          <Badge className="bg-blue-100 text-blue-800 animate-pulse">
            Operation in Progress: {activeOperation.progress}%
          </Badge>
        )}
      </div>

      {activeOperation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-600" />
              Active Operation: {activeOperation.type.replace('_', ' ')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{activeOperation.processedItems} / {activeOperation.totalItems}</span>
              </div>
              <Progress value={activeOperation.progress} className="h-2" />
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Processed:</span>
                  <span className="ml-2 font-medium text-green-600">{activeOperation.processedItems}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="ml-2 font-medium text-red-600">{activeOperation.failedItems}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="ml-2 font-medium">
                    {activeOperation.totalItems - activeOperation.processedItems - activeOperation.failedItems}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="issuance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="issuance">Share Issuance</TabsTrigger>
          <TabsTrigger value="pricing">Price Adjustment</TabsTrigger>
          <TabsTrigger value="history">Operation History</TabsTrigger>
        </TabsList>

        <TabsContent value="issuance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Bulk Share Issuance</span>
                <Button onClick={loadShareIssuancePreview} size="sm" variant="outline">
                  <Users className="h-4 w-4 mr-1" />
                  Load Users
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Recipients: {shareIssuanceData.length}</span>
                  <span>Total Value: UGX {shareIssuanceData.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}</span>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {shareIssuanceData.slice(0, 10).map((item, index) => (
                      <div key={item.userId} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{item.userName}</span>
                          <span className="text-sm text-muted-foreground ml-2">{item.email}</span>
                        </div>
                        <div className="text-right">
                          <div>{item.quantity} shares</div>
                          <div className="text-sm text-muted-foreground">UGX {item.totalValue.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                    {shareIssuanceData.length > 10 && (
                      <div className="text-center text-muted-foreground">
                        ... and {shareIssuanceData.length - 10} more recipients
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={startBulkShareIssuance} 
                  disabled={processing || shareIssuanceData.length === 0}
                  className="w-full"
                >
                  {processing ? 'Processing...' : 'Start Bulk Share Issuance'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Bulk Price Adjustment</span>
                <Button onClick={loadPriceAdjustmentPreview} size="sm" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Load Shares
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {priceAdjustments.map((adjustment, index) => (
                      <div key={adjustment.shareId} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{adjustment.shareName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span>UGX {adjustment.currentPrice.toLocaleString()}</span>
                          <ArrowRight className="h-4 w-4" />
                          <span className="font-medium">UGX {adjustment.newPrice.toLocaleString()}</span>
                          <Badge variant="outline" className="text-green-600">
                            +{adjustment.adjustmentPercent}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operation History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {operations.map((operation) => (
                  <div key={operation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(operation.status)}
                      <div>
                        <div className="font-medium capitalize">
                          {operation.type.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(operation.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div>{operation.processedItems} / {operation.totalItems} items</div>
                        {operation.failedItems > 0 && (
                          <div className="text-red-600">{operation.failedItems} failed</div>
                        )}
                      </div>
                      <Badge className={getStatusColor(operation.status)}>
                        {operation.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
                {operations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bulk operations found</p>
                    <p className="text-sm">Start your first bulk operation above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BulkOperationsManager;
