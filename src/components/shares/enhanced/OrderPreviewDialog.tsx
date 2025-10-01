import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Info 
} from 'lucide-react';

interface OrderPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  orderType: 'buy' | 'sell' | 'transfer';
  orderDetails: {
    quantity: number;
    pricePerShare: number;
    totalAmount: number;
    fees: number;
    finalAmount: number;
    currency: string;
    estimatedProcessingTime: string;
    marketImpact?: string;
    slippage?: number;
  };
  paymentMethod?: any;
  loading?: boolean;
}

const OrderPreviewDialog: React.FC<OrderPreviewDialogProps> = ({
  open,
  onClose,
  onConfirm,
  orderType,
  orderDetails,
  paymentMethod,
  loading = false
}) => {
  const getOrderTypeConfig = () => {
    switch (orderType) {
      case 'buy':
        return {
          title: 'Confirm Share Purchase',
          icon: TrendingUp,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'sell':
        return {
          title: 'Confirm Share Sale',
          icon: TrendingUp,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50'
        };
      case 'transfer':
        return {
          title: 'Confirm Share Transfer',
          icon: DollarSign,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      default:
        return {
          title: 'Confirm Order',
          icon: CheckCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const config = getOrderTypeConfig();
  const IconComponent = config.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className={`h-5 w-5 ${config.color}`} />
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className={`p-4 rounded-lg ${config.bgColor}`}>
            <h3 className="font-medium mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span className="font-medium">{orderDetails.quantity.toLocaleString()} shares</span>
              </div>
              <div className="flex justify-between">
                <span>Price per share:</span>
                <span className="font-medium">{orderDetails.currency} {orderDetails.pricePerShare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{orderDetails.currency} {orderDetails.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction fees:</span>
                <span className="font-medium">{orderDetails.currency} {orderDetails.fees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total {orderType === 'sell' ? 'you receive' : 'amount'}:</span>
                <span>{orderDetails.currency} {orderDetails.finalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Market Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Estimated processing time:</span>
              <Badge variant="outline">{orderDetails.estimatedProcessingTime}</Badge>
            </div>

            {orderDetails.marketImpact && (
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Market impact:</span>
                <Badge variant="outline">{orderDetails.marketImpact}</Badge>
              </div>
            )}

            {orderDetails.slippage && orderDetails.slippage > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Estimated slippage: {orderDetails.slippage.toFixed(2)}% due to market conditions
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Payment Method (for purchases) */}
          {orderType === 'buy' && paymentMethod && (
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Payment Method</h4>
              <div className="text-sm">
                {paymentMethod.needsExchange ? (
                  <div className="space-y-1">
                    <div>Source: {paymentMethod.sourceWallet.currency} Wallet</div>
                    <div>Auto-exchange to UGX</div>
                    <div>Rate: {paymentMethod.exchangeRate} {paymentMethod.sourceWallet.currency}/UGX</div>
                  </div>
                ) : (
                  <div>UGX Wallet (Balance: {paymentMethod.wallet.balance.toLocaleString()})</div>
                )}
              </div>
            </div>
          )}

          {/* Important Notices */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {orderType === 'buy' && "This purchase will be processed immediately and cannot be cancelled once confirmed."}
              {orderType === 'sell' && "Your sell order will be queued (FIFO) and processed when admin funding is available."}
              {orderType === 'transfer' && "This transfer request will require admin approval before execution."}
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={onConfirm} 
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Processing...' : `Confirm ${orderType === 'buy' ? 'Purchase' : orderType === 'sell' ? 'Sale' : 'Transfer'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderPreviewDialog;