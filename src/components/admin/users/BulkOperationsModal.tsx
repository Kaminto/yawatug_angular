import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, Ban, Clock, Users, Loader2, 
  AlertCircle, CheckCircle2, XCircle 
} from 'lucide-react';
import { AdminOperationsService, BulkOperationResult } from '@/services/AdminOperationsService';
import { toast } from 'sonner';

type BulkAction = 'activate' | 'block' | 'pending' | 'delete';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserIds: string[];
  selectedUserNames: string[];
  onComplete: () => void;
}

const BulkOperationsModal: React.FC<BulkOperationsModalProps> = ({
  isOpen,
  onClose,
  selectedUserIds,
  selectedUserNames,
  onComplete,
}) => {
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<BulkOperationResult | null>(null);

  const bulkActions = [
    {
      id: 'activate' as BulkAction,
      label: 'Activate Users',
      icon: CheckCircle,
      description: 'Set selected users to active status',
      variant: 'default' as const,
      status: 'active',
    },
    {
      id: 'block' as BulkAction,
      label: 'Block Users',
      icon: Ban,
      description: 'Block selected users from accessing the system',
      variant: 'destructive' as const,
      status: 'blocked',
    },
    {
      id: 'pending' as BulkAction,
      label: 'Set Pending',
      icon: Clock,
      description: 'Mark selected users as pending verification',
      variant: 'secondary' as const,
      status: 'pending_verification',
    },
  ];

  const handleExecute = async () => {
    if (!selectedAction || selectedUserIds.length === 0) return;

    const action = bulkActions.find(a => a.id === selectedAction);
    if (!action) return;

    setProcessing(true);
    setResult(null);

    try {
      const result = await AdminOperationsService.executeBulkStatusChange(
        selectedUserIds,
        action.status as 'active' | 'blocked' | 'unverified' | 'pending_verification',
        notes.trim() || undefined
      );

      setResult(result);

      if (result.failure_count === 0) {
        toast.success(`Successfully ${selectedAction}d ${result.success_count} users`);
        setTimeout(() => {
          onComplete();
          onClose();
        }, 2000);
      } else {
        toast.error(`Operation completed with ${result.failure_count} errors`);
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast.error('Bulk operation failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setSelectedAction(null);
      setNotes('');
      setResult(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Operations</DialogTitle>
          <DialogDescription>
            Perform bulk actions on {selectedUserIds.length} selected users
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Users Preview */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Selected Users ({selectedUserIds.length})</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {selectedUserNames.slice(0, 10).map((name, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {name || `User ${index + 1}`}
                </Badge>
              ))}
              {selectedUserNames.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{selectedUserNames.length - 10} more
                </Badge>
              )}
            </div>
          </div>

          {/* Action Selection */}
          {!result && (
            <div className="space-y-4">
              <Label>Select Action</Label>
              <div className="grid gap-3">
                {bulkActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant={selectedAction === action.id ? action.variant : 'outline'}
                      className="h-auto p-4 justify-start"
                      onClick={() => setSelectedAction(action.id)}
                      disabled={processing}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">{action.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {action.description}
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add a reason or note for this bulk operation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={processing}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Processing State */}
          {processing && !result && (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">Processing bulk operation...</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {result.failure_count === 0 ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  )}
                </div>
                <h3 className="font-medium">Operation Completed</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {result.success_count}
                  </div>
                  <div className="text-sm text-green-600">Successful</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">
                    {result.failure_count}
                  </div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Errors</span>
                  </div>
                  <div className="text-xs text-red-600 max-h-32 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {!result && (
              <>
                <Button variant="outline" onClick={handleClose} disabled={processing}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleExecute} 
                  disabled={!selectedAction || processing}
                  variant={selectedAction ? bulkActions.find(a => a.id === selectedAction)?.variant : 'default'}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Execute on ${selectedUserIds.length} users`
                  )}
                </Button>
              </>
            )}
            {result && (
              <Button onClick={handleClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkOperationsModal;