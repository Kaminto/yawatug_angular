import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, User, Calendar } from 'lucide-react';

interface AgentCommission {
  id: string;
  commission_amount: number;
  transaction_amount: number;
  created_at: string;
  status: string;
  transaction_id: string;
}

interface AgentCommissionPayoutDialogProps {
  agent: {
    id: string;
    agent_code: string;
    profiles?: {
      full_name: string;
      email: string;
    };
  } | null;
  commissions: AgentCommission[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayoutComplete: () => void;
}

export const AgentCommissionPayoutDialog: React.FC<AgentCommissionPayoutDialogProps> = ({
  agent,
  commissions,
  open,
  onOpenChange,
  onPayoutComplete
}) => {
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  const pendingCommissions = commissions.filter(c => c.status === 'pending');
  
  const selectedTotal = pendingCommissions
    .filter(c => selectedCommissions.includes(c.id))
    .reduce((sum, c) => sum + c.commission_amount, 0);

  const handleSelectAll = () => {
    if (selectedCommissions.length === pendingCommissions.length) {
      setSelectedCommissions([]);
    } else {
      setSelectedCommissions(pendingCommissions.map(c => c.id));
    }
  };

  const handleCommissionToggle = (commissionId: string) => {
    setSelectedCommissions(prev =>
      prev.includes(commissionId)
        ? prev.filter(id => id !== commissionId)
        : [...prev, commissionId]
    );
  };

  const handlePayout = async () => {
    if (!agent || selectedCommissions.length === 0) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('process_agent_commission_payout', {
        p_agent_id: agent.id,
        p_commission_ids: selectedCommissions
      });

      if (error) throw error;

      toast.success(`Payout of UGX ${selectedTotal.toLocaleString()} processed successfully`);
      setSelectedCommissions([]);
      onPayoutComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Payout error:', error);
      toast.error('Failed to process payout: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Commission Payout</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agent Info */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{agent.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground">Agent Code: {agent.agent_code}</p>
                <p className="text-sm text-muted-foreground">{agent.profiles?.email}</p>
              </div>
            </div>
          </div>

          {/* Commission Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <p className="text-2xl font-bold">{pendingCommissions.length}</p>
              <p className="text-sm text-muted-foreground">Pending Commissions</p>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <p className="text-2xl font-bold">UGX {selectedTotal.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Selected Amount</p>
            </div>
          </div>

          {/* Commission List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Pending Commissions</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedCommissions.length === pendingCommissions.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {pendingCommissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending commissions</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pendingCommissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedCommissions.includes(commission.id)}
                      onCheckedChange={() => handleCommissionToggle(commission.id)}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">UGX {commission.commission_amount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            Transaction: UGX {commission.transaction_amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(commission.created_at).toLocaleDateString()}</span>
                          </div>
                          <Badge variant="secondary">{commission.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePayout}
            disabled={processing || selectedCommissions.length === 0}
          >
            {processing ? 'Processing...' : `Pay UGX ${selectedTotal.toLocaleString()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};