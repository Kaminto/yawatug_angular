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
import { Gift, Trophy } from 'lucide-react';

interface EnterDrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCredits: number;
  currentDrawName: string;
  onEnter: (stakeAmount: number) => Promise<void>;
}

const EnterDrawDialog: React.FC<EnterDrawDialogProps> = ({
  open,
  onOpenChange,
  availableCredits,
  currentDrawName,
  onEnter,
}) => {
  const [stakeAmount, setStakeAmount] = useState<number>(1);
  const [entering, setEntering] = useState(false);

  const handleEnter = async () => {
    if (stakeAmount < 1) {
      return;
    }

    setEntering(true);
    try {
      await onEnter(stakeAmount);
      onOpenChange(false);
      setStakeAmount(1);
    } catch (error) {
      console.error('Error entering draw:', error);
    } finally {
      setEntering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Enter Grand Draw
          </DialogTitle>
          <DialogDescription>
            Stake your credits for a chance to win big prizes!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 rounded-lg">
            <h3 className="font-semibold mb-2">{currentDrawName}</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <Trophy className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
                <p className="font-bold">50%</p>
                <p className="text-muted-foreground">1st</p>
              </div>
              <div className="text-center">
                <Trophy className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                <p className="font-bold">30%</p>
                <p className="text-muted-foreground">2nd</p>
              </div>
              <div className="text-center">
                <Trophy className="h-3 w-3 mx-auto text-orange-400 mb-1" />
                <p className="font-bold">20%</p>
                <p className="text-muted-foreground">3rd</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Credits to Stake</Label>
            <Input
              type="number"
              min={1}
              max={availableCredits}
              value={stakeAmount}
              onChange={(e) => setStakeAmount(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Available: {availableCredits.toFixed(0)} credits • More credits = higher winning chance
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-semibold">Your winning chances:</span> Higher stakes increase your probability of being selected as a winner.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleEnter} 
            disabled={entering || stakeAmount < 1 || stakeAmount > availableCredits}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {entering ? 'Entering...' : `Stake ${stakeAmount} Credits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnterDrawDialog;
