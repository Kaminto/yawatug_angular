import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Repeat } from 'lucide-react';

interface ConvertCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCredits: number;
  onSuccess: () => void;
}

const ConvertCreditsDialog: React.FC<ConvertCreditsDialogProps> = ({
  open,
  onOpenChange,
  availableCredits,
  onSuccess,
}) => {
  const [creditsToConvert, setCreditsToConvert] = useState<number>(10);
  const [converting, setConverting] = useState(false);

  const handleConvert = async () => {
    if (creditsToConvert < 10) {
      toast.error('Minimum conversion is 10 credits');
      return;
    }

    if (creditsToConvert > availableCredits) {
      toast.error('Insufficient credits');
      return;
    }

    setConverting(true);
    try {
      const { data, error } = await supabase.functions.invoke('convert-credits-to-shares', {
        body: { credits_to_convert: creditsToConvert },
      });

      if (error) throw error;

      toast.success(`Successfully converted ${creditsToConvert} credits to shares!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error converting credits:', error);
      toast.error(error.message || 'Failed to convert credits');
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Convert Credits to Shares
          </DialogTitle>
          <DialogDescription>
            Convert your earned credits into Yawatu shares. 1 Credit = 1 Share
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Credits to Convert</Label>
            <Input
              type="number"
              min={10}
              max={availableCredits}
              value={creditsToConvert}
              onChange={(e) => setCreditsToConvert(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Available: {availableCredits.toFixed(0)} credits (Minimum: 10 credits)
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm">You will receive:</span>
              <span className="text-lg font-bold">{creditsToConvert} Shares</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={converting || creditsToConvert < 10}>
            {converting ? 'Converting...' : 'Convert Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertCreditsDialog;
